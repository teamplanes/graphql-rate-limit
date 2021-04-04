/* eslint-disable import/no-extraneous-dependencies */
import test from 'ava';
import redis from 'redis-mock';
import { RedisStore } from './redis-store';

test('RedisStore sets and gets correct timestamps', async (t) => {
  const storeInstance = new RedisStore(redis.createClient());

  await storeInstance.setForIdentity(
    { contextIdentity: 'foo', fieldIdentity: 'bar' },
    [1, 2, 3]
  );
  t.deepEqual(
    await storeInstance.getForIdentity({
      contextIdentity: 'foo',
      fieldIdentity: 'bar',
    }),
    [1, 2, 3]
  );

  await storeInstance.setForIdentity(
    { contextIdentity: 'foo', fieldIdentity: 'bar2' },
    [4, 5]
  );
  t.deepEqual(
    await storeInstance.getForIdentity({
      contextIdentity: 'foo',
      fieldIdentity: 'bar2',
    }),
    [4, 5]
  );

  await storeInstance.setForIdentity(
    { contextIdentity: 'foo', fieldIdentity: 'bar' },
    [10, 20]
  );
  t.deepEqual(
    await storeInstance.getForIdentity({
      contextIdentity: 'foo',
      fieldIdentity: 'bar',
    }),
    [10, 20]
  );
});
