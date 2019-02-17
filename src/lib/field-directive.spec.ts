import test from 'ava';
import { SchemaDirectiveVisitor } from 'graphql-tools';
import {
  createRateLimitDirective,
  getFieldIdentity,
  validateResolve
} from './field-directive';
import { InMemoryStore } from './in-memory-store';

test('createRateLimitDirective', t => {
  const RateLimiter = createRateLimitDirective();
  t.true(new RateLimiter({}) instanceof SchemaDirectiveVisitor);
});

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

test('validateResolve with an empty store', async t => {
  t.false(
    await validateResolve(
      new InMemoryStore(),
      { contextIdentity: '1', fieldIdentity: 'myField' },
      { max: 1, windowMs: 1000 }
    )
  );
  t.true(
    await validateResolve(
      new InMemoryStore(),
      { contextIdentity: '1', fieldIdentity: 'myField' },
      { max: 0, windowMs: 1000 }
    )
  );
});

test('validateResolve should return true for full stores', async t => {
  const store = new InMemoryStore();
  store.setForIdentity({ contextIdentity: '1', fieldIdentity: 'myField' }, [
    Date.now(),
    Date.now()
  ]);
  t.true(
    await validateResolve(
      store,
      { contextIdentity: '1', fieldIdentity: 'myField' },
      { max: 1, windowMs: 1000 }
    )
  );
  t.false(
    await validateResolve(
      store,
      { contextIdentity: '1', fieldIdentity: 'myField' },
      { max: 4, windowMs: 1000 }
    )
  );
});

test('validateResolve should add callCount timestamps', async t => {
  const store = new InMemoryStore();
  t.false(
    await validateResolve(
      store,
      { contextIdentity: '1', fieldIdentity: 'myField' },
      {
        callCount: 2,
        max: 2,
        windowMs: 1000
      }
    )
  );
});

test('validateResolve should return true when callCount is bigger than max', async t => {
  const store = new InMemoryStore();
  t.true(
    await validateResolve(
      store,
      { contextIdentity: '1', fieldIdentity: 'myField' },
      {
        callCount: 2,
        max: 1,
        windowMs: 1000
      }
    )
  );
});
