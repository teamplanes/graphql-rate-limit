// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
import { GraphQLResolveInfo } from 'graphql';
import {
  getFieldIdentity,
  getGraphQLRateLimiter
} from './get-graphql-rate-limiter';
import { InMemoryStore } from './in-memory-store';
import { GraphQLRateLimitDirectiveArgs } from './types';

test('getFieldIdentity with no identity args', t => {
  t.is(getFieldIdentity('myField', [], {}), 'myField');
  t.is(getFieldIdentity('random', [], {}), 'random');
});

test('getFieldIdentity with identity args', t => {
  t.is(
    getFieldIdentity('myField', ['id'], { id: 2, name: 'Foo' }),
    'myField:2'
  );
  t.is(
    getFieldIdentity('myField', ['name', 'id'], { id: 2, name: 'Foo' }),
    'myField:Foo:2'
  );
  t.is(
    getFieldIdentity('myField', ['name', 'bool'], { bool: true, name: 'Foo' }),
    'myField:Foo:true'
  );
  t.is(getFieldIdentity('myField', ['name', 'bool'], {}), 'myField::');
  t.is(
    getFieldIdentity('myField', ['name', 'bool'], { name: null }),
    'myField::'
  );
});

test('getFieldIdentity with nested identity args', t => {
  t.is(
    getFieldIdentity('myField', ['item.id'], { item: { id: 2 }, name: 'Foo' }),
    'myField:2'
  );
  t.is(
    getFieldIdentity('myField', ['item.foo'], { item: { id: 2 }, name: 'Foo' }),
    'myField:'
  );

  const obj = { item: { subItem: { id: 9 } }, name: 'Foo' };
  t.is(getFieldIdentity('myField', ['item.subItem.id'], obj), 'myField:9');

  const objTwo = { item: { subItem: { id: 1 } }, name: 'Foo' };
  t.is(
    getFieldIdentity('myField', ['name', 'item.subItem.id'], objTwo),
    'myField:Foo:1'
  );
});

test('getGraphQLRateLimiter with an empty store passes, but second time fails', async t => {
  const rateLimit = getGraphQLRateLimiter({
    store: new InMemoryStore(),
    identifyContext: context => context.id
  });
  const config = { max: 1, window: '1s' };
  const field = {
    parent: {},
    args: {},
    context: { id: '1' },
    info: ({ fieldName: 'myField' } as any) as GraphQLResolveInfo
  };
  t.falsy(await rateLimit(field, config));
  t.is(
    await rateLimit(field, config),
    `You are trying to access 'myField' too often`
  );
});

test('getGraphQLRateLimiter should block a batch of rate limited fields in a single query', async t => {
  const rateLimit = getGraphQLRateLimiter({
    store: new InMemoryStore(),
    identifyContext: context => context.id,
    enableBatchRequestCache: true
  });
  const config = { max: 3, window: '1s' };
  const field = {
    parent: {},
    args: {},
    context: { id: '1' },
    info: ({ fieldName: 'myField' } as any) as GraphQLResolveInfo
  };
  const requests = Array.from({ length: 5 })
    .map(() => rateLimit(field, config))
    .map(p => p.catch(e => e));

  (await Promise.all(requests)).forEach((result, idx) => {
    if (idx < 3) t.falsy(result);
    else t.is(result, `You are trying to access 'myField' too often`);
  });
});

const mockErrorStore = {
  setForIdentity: async () => {
    throw new Error('Failed to set store.');
  },
  getForIdentity: async () => {
    throw new Error('Failed to get store.');
  }
};

test('getGraphQLRateLimiter should throw as normal if store errors', async t => {
  const rateLimit = getGraphQLRateLimiter({
    store: mockErrorStore,
    identifyContext: context => context.id
  });
  const config = { max: 1, window: '1s' };
  const field = {
    parent: {},
    args: {},
    context: { id: '1' },
    info: ({ fieldName: 'myField' } as any) as GraphQLResolveInfo
  };
  await t.throwsAsync(rateLimit(field, config));
});

test('getGraphQLRateLimiter should call error handler if provided.', async t => {
  const rateLimit = getGraphQLRateLimiter({
    store: mockErrorStore,
    identifyContext: context => context.id,
    onStoreError: () => t.pass()
  });
  const config = { max: 1, window: '1s' };
  const field = {
    parent: {},
    args: {},
    context: { id: '1' },
    info: ({ fieldName: 'myField' } as any) as GraphQLResolveInfo
  };
  let result;
  await t.notThrowsAsync(async () => {
    result = await rateLimit(field, config);
  });
  t.falsy(result);
});

test('getGraphQLRateLimiter timestamps should expire', async t => {
  const rateLimit = getGraphQLRateLimiter({
    store: new InMemoryStore(),
    identifyContext: context => context.id
  });
  const config = { max: 1, window: '0.5s' };
  const field = {
    parent: {},
    args: {},
    context: { id: '1' },
    info: ({ fieldName: 'myField' } as any) as GraphQLResolveInfo
  };
  t.falsy(await rateLimit(field, config));
  t.is(
    await rateLimit(field, config),
    `You are trying to access 'myField' too often`
  );
  setTimeout(async () => {
    t.falsy(await rateLimit(field, config));
  }, 500);
});

test('getGraphQLRateLimiter should limit by callCount if arrayLengthField is passed', async t => {
  const rateLimit = getGraphQLRateLimiter({
    store: new InMemoryStore(),
    identifyContext: context => context.id
  });
  const config: GraphQLRateLimitDirectiveArgs = {
    max: 4,
    window: '1s',
    arrayLengthField: 'items'
  };
  const field = {
    parent: {},
    args: {
      items: [1, 2, 3, 4, 5]
    },
    context: { id: '1' },
    info: ({ fieldName: 'listOfItems' } as any) as GraphQLResolveInfo
  };
  t.is(
    await rateLimit(field, config),
    `You are trying to access 'listOfItems' too often`
  );
});

test('getGraphQLRateLimiter should allow multiple calls to a field if the identityArgs change', async t => {
  const rateLimit = getGraphQLRateLimiter({
    store: new InMemoryStore(),
    identifyContext: context => context.id
  });
  const config: GraphQLRateLimitDirectiveArgs = {
    max: 1,
    window: '1s',
    identityArgs: ['id']
  };
  const field = {
    parent: {},
    args: {
      id: '1'
    },
    context: { id: '1' },
    info: ({ fieldName: 'listOfItems' } as any) as GraphQLResolveInfo
  };
  t.falsy(await rateLimit(field, config));
  t.is(
    await rateLimit(field, config),
    `You are trying to access 'listOfItems' too often`
  );
  t.falsy(await rateLimit({ ...field, args: { id: '2' } }, config));
  t.is(
    await rateLimit(field, config),
    `You are trying to access 'listOfItems' too often`
  );
});
