import { GraphQLResolveInfo } from 'graphql';
import { Rule } from 'graphql-shield/dist/rules';

declare abstract class Store {
    /**
     * Sets an array of call timestamps in the store for a given identity
     *
     * @param identity
     * @param timestamps
     */
    abstract setForIdentity(identity: Identity, timestamps: readonly number[], windowMs?: number): void | Promise<void>;
    /**
     * Gets an array of call timestamps for a given identity.
     *
     * @param identity
     */
    abstract getForIdentity(identity: Identity): readonly number[] | Promise<readonly number[]>;
}

/**
 * Two keys that define the identity for the call to a given
 * field resolver with a given context.
 */
interface Identity {
    /**
     * The return value from `identifyContext`
     */
    readonly contextIdentity: string;
    /**
     * Returns value from `getFieldIdentity`
     */
    readonly fieldIdentity: string;
}
/**
 * GraphQLRateLimitDirectiveArgs: The directive parameters.
 *
 * myField(id: String): Field @rateLimit(message: "Stop!", window: 100000, max: 10, identityArgs: ["id"])
 */
interface GraphQLRateLimitDirectiveArgs {
    /**
     * Error message used when/if the RateLimit error is thrown
     */
    readonly message?: string;
    /**
     * Window duration in millis.
     */
    readonly window?: string;
    /**
     * Max number of calls within the `window` duration.
     */
    readonly max?: number;
    /**
     * Values to build into the key used to identify the resolve call.
     */
    readonly identityArgs?: readonly string[];
    /**
     * Limit by the length of an input array
     */
    readonly arrayLengthField?: string;
}
/**
 * Args passed to the format error callback.
 */
interface FormatErrorInput {
    readonly fieldName: string;
    readonly contextIdentity: string;
    readonly max: number;
    readonly window: number;
    readonly fieldIdentity?: string;
}
/**
 * Config object type passed to the directive factory.
 */
interface GraphQLRateLimitConfig {
    /**
     * Provide a store to hold info on client requests.
     *
     * Defaults to an inmemory store if not provided.
     */
    readonly store?: Store;
    /**
     * Return a string to identify the user or client.
     *
     * Example:
     * 	identifyContext: (context) => context.user.id;
     * 	identifyContext: (context) => context.req.ip;
     */
    readonly identifyContext?: (context: any) => string;
    /**
     * Custom error messages.
     */
    readonly formatError?: (input: FormatErrorInput) => string;
    readonly enableBatchRequestCache?: boolean;
}

/**
 * Returns the Directive to be passed to your GraphQL server.
 *
 * TODO: Fix `any` return type;
 * @param customConfig
 */
declare const createRateLimitDirective: (customConfig?: GraphQLRateLimitConfig) => any;

interface StoreData {
    readonly [identity: string]: {
        readonly [fieldIdentity: string]: readonly number[];
    };
}
declare class InMemoryStore implements Store {
    state: StoreData;
    setForIdentity(identity: Identity, timestamps: readonly number[]): void;
    getForIdentity(identity: Identity): readonly number[];
}

declare class RedisStore implements Store {
    store: any;
    private readonly nameSpacedKeyPrefix;
    constructor(redisStoreInstance: unknown);
    setForIdentity(identity: Identity, timestamps: readonly number[], windowMs?: number): Promise<void>;
    getForIdentity(identity: Identity): Promise<readonly number[]>;
    private readonly generateNamedSpacedKey;
}

declare class RateLimitError extends Error {
    readonly isRateLimitError = true;
    constructor(message: string);
}

/**
 * Returns a string key for the given field + args. With no identityArgs are provided, just the fieldName
 * will be used for the key. If an array of resolveArgs are provided, the values of those will be built
 * into the key.
 *
 * Example:
 * 	(fieldName = 'books', identityArgs: ['id', 'title'], resolveArgs: { id: 1, title: 'Foo', subTitle: 'Bar' })
 *  	=> books:1:Foo
 *
 * @param fieldName
 * @param identityArgs
 * @param resolveArgs
 */
declare const getFieldIdentity: (fieldName: string, identityArgs: readonly string[], resolveArgs: unknown) => string;
/**
 * This is the core rate limiting logic function, APIs (directive, sheild etc.)
 * can wrap this or it can be used directly in resolvers.
 * @param userConfig - global (usually app-wide) rate limiting config
 */
declare const getGraphQLRateLimiter: (userConfig: GraphQLRateLimitConfig) => ({ args, context, info, }: {
    parent: any;
    args: Record<string, any>;
    context: any;
    info: GraphQLResolveInfo;
}, { arrayLengthField, identityArgs, max, window, message, }: GraphQLRateLimitDirectiveArgs) => Promise<string | undefined>;

/**
 * Creates a graphql-shield rate limit rule. e.g.
 *
 * ```js
 * const rateLimit = createRateLimitRule({ identifyContext: (ctx) => ctx.id });
 * const permissions = shield({ Mutation: { signup: rateLimit({ window: '10s', max: 1 }) } })
 * ```
 */
declare const createRateLimitRule: (config: GraphQLRateLimitConfig) => (fieldConfig: GraphQLRateLimitDirectiveArgs) => Rule;

export default createRateLimitDirective;
export { InMemoryStore, RateLimitError, RedisStore, Store, createRateLimitDirective, createRateLimitRule, getFieldIdentity, getGraphQLRateLimiter };
