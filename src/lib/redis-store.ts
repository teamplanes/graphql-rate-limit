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
  ): void {
    this.store.hset(
      this.generateNamedSpacedKey(identity.contextIdentity),
      identity.fieldIdentity,
      JSON.stringify([...timestamps])
    );
  }

  public async getForIdentity(
    identity: Identity
  ): Promise<ReadonlyArray<number>> {
    return new Promise<ReadonlyArray<number>>((res, rej) => {
      this.store.hgetall(
        this.generateNamedSpacedKey(identity.contextIdentity),
        (err: Error | null, obj: any) => {
          if (err) {
            return rej(err);
          }
          const existingValue = obj && obj[identity.fieldIdentity];
          res(existingValue ? JSON.parse(existingValue) : []);
        }
      );
    });
  }

  private readonly generateNamedSpacedKey = (key: string): string => {
    return `${this.nameSpacedKeyPrefix}${key}`;
  };
}

export { RedisStore };
