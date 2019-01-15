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
    timestamps: ReadonlyArray<number>,
    windowMs?: number
  ): Promise<void> {
    return new Promise<void>((res, rej) => {
      const expiry = windowMs
        ? ['EX', (Date.now() + windowMs - Math.max(...timestamps)) / 1000]
        : [];
      this.store.set(
        // @ts-ignore
        [
          this.generateNamedSpacedKey(identity),
          JSON.stringify([...timestamps]),
          ...expiry
        ],
        // @ts-ignore
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
      this.store.get(
        this.generateNamedSpacedKey(identity),
        (err: Error | null, obj: any) => {
          if (err) {
            return rej(err);
          }
          res(obj ? JSON.parse(obj) : []);
        }
      );
    });
  }

  private readonly generateNamedSpacedKey = (identity: Identity): string => {
    return `${this.nameSpacedKeyPrefix}${identity.contextIdentity}:${
      identity.fieldIdentity
    }`;
  };
}

export { RedisStore };
