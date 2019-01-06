import { Identity } from './types';

abstract class Store {
  /**
   * Sets an array of call timestamps in the store for a given identity
   *
   * @param identity
   * @param timestamps
   */
  public abstract setForIdentity(
    identity: Identity,
    timestamps: ReadonlyArray<number>
  ): void | Promise<void>;

  /**
   * Gets an array of call timestamps for a given identity.
   *
   * @param identity
   */
  public abstract getForIdentity(
    identity: Identity
  ): ReadonlyArray<number> | Promise<ReadonlyArray<number>>;
}

export { Store };
