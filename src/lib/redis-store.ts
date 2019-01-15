import { RedisClient } from 'redis';
import { Store } from './store';
import { Identity } from './types';

class RedisStore implements Store {
  // tslint:disable-next-line readonly-keyword
  public store: any;
  private readonly nameSpacedKeyPrefix: string = 'redis-store-id::';

  constructor(redisStoreInstance: any) {
    this.store = redisStoreInstance;
  }

  public setForIdentity(
    identity: Identity,
    timestamps: ReadonlyArray<number>
  ): Promise<void> {
    return new Promise<void>((res, rej) => {
      (this.store as RedisClient).hset(
        this.generateNamedSpacedKey(identity.contextIdentity),
        identity.fieldIdentity,
        JSON.stringify([...timestamps]),
        err => {
          if (err) {
            return rej(err);
          }
          res();
        }
      );
    });
  }

  public async getForIdentity(
    identity: Identity
  ): Promise<ReadonlyArray<number>> {
    return new Promise<ReadonlyArray<number>>((res, rej) => {
      (this.store as RedisClient).hget(
        this.generateNamedSpacedKey(identity.contextIdentity),
        identity.fieldIdentity,
        (err: Error | null, obj: any) => {
          if (err) {
            return rej(err);
          }
          res(obj ? JSON.parse(obj) : []);
        }
      );
    });
  }

  private readonly generateNamedSpacedKey = (key: string): string => {
    return `${this.nameSpacedKeyPrefix}${key}`;
  };
}

export { RedisStore };
