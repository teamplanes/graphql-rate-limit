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
