export interface Identity {
  readonly contextIdentity: string;
  readonly fieldIdentity: string;
}

export interface Options {
  readonly windowMs: number;
  readonly max: number;
}
