// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
import { InMemoryStore } from './in-memory-store';

test('InMemoryStore sets correct timestamps', async t => {
  const store = new InMemoryStore();
  await store.setForIdentity({ contextIdentity: 'foo', fieldIdentity: 'bar' }, [
    1,
    2,
    3
  ]);
  t.deepEqual(store.state, { foo: { bar: [1, 2, 3] } });

  await store.setForIdentity(
    { contextIdentity: 'foo', fieldIdentity: 'bar2' },
    [4, 5]
  );
  t.deepEqual(store.state, { foo: { bar: [1, 2, 3], bar2: [4, 5] } });

  await store.setForIdentity({ contextIdentity: 'foo', fieldIdentity: 'bar' }, [
    10,
    20
  ]);
  t.deepEqual(store.state, { foo: { bar: [10, 20], bar2: [4, 5] } });
});

test('InMemoryStore get correct timestamps', async t => {
  const store = new InMemoryStore();
  await store.setForIdentity({ contextIdentity: 'foo', fieldIdentity: 'bar' }, [
    1,
    2,
    3
  ]);
  t.deepEqual(
    await store.getForIdentity({
      contextIdentity: 'foo',
      fieldIdentity: 'bar'
    }),
    [1, 2, 3]
  );

  await store.setForIdentity(
    { contextIdentity: 'foo', fieldIdentity: 'bar2' },
    [4, 5]
  );
  t.deepEqual(
    await store.getForIdentity({
      contextIdentity: 'foo',
      fieldIdentity: 'bar2'
    }),
    [4, 5]
  );

  await store.setForIdentity({ contextIdentity: 'foo', fieldIdentity: 'bar' }, [
    10,
    20
  ]);
  t.deepEqual(
    await store.getForIdentity({
      contextIdentity: 'foo',
      fieldIdentity: 'bar'
    }),
    [10, 20]
  );
});
