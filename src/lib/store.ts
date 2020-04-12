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
    timestamps: readonly number[],
    windowMs?: number
  ): Promise<void>;

  /**
   * Gets an array of call timestamps for a given identity.
   *
   * @param identity
   */
  public abstract getForIdentity(
    identity: Identity
  ): Promise<readonly number[]>;
}

export { Store };
