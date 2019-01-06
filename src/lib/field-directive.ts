import {
  defaultFieldResolver,
  DirectiveLocation,
  GraphQLDirective,
  GraphQLField,
  GraphQLInt,
  GraphQLList,
  GraphQLString
} from 'graphql';
import { SchemaDirectiveVisitor } from 'graphql-tools';
import { InMemoryStore } from './in-memory-store';
import { RateLimitError } from './rate-limit-error';
import { Store } from './store';
import { Identity, Options } from './types';

/**
 * GraphQLRateLimitDirectiveArgs: The directive parameters.
 *
 * myField(id: String): Field @rateLimit(message: "Stop!", window: 100000, max: 10, identityArgs: ["id"])
 */
export interface GraphQLRateLimitDirectiveArgs {
  /**
   * Error message used when/if the RateLimit error is thrown
   */
  readonly message?: string;
  /**
   * Window duration in millis.
   */
  readonly window?: number;
  /**
   * Max number of calls within the `window` duration.
   */
  readonly max?: number;
  /**
   * Values to build into the key used to identify the resolve call.
   */
  readonly identityArgs?: ReadonlyArray<string>;
}

/**
 * Config object type passed to the directive factory.
 */
export interface GraphQLRateLimitConfig {
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
}

// Default directive config
const defaultConfig = {
  identifyContext: (_: any): string => {
    throw new Error(
      'You must implement a createRateLimitDirective.config.identifyContext'
    );
  },
  store: new InMemoryStore()
};

// Default field options
const DEFAULT_WINDOW = 60 * 1000;
const DEFAULT_MAX = 5;
const DEFAULT_FIELD_IDENTITY_ARGS: ReadonlyArray<string> = [];

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
const getFieldIdentity = (
  fieldName: string,
  identityArgs: ReadonlyArray<string>,
  resolveArgs: any
) => {
  const argsKey = identityArgs.map(arg => resolveArgs[arg]);
  return [fieldName, ...argsKey].join(':');
};

/**
 * Validate, based on the store's state, the identity of the request and the resolve options
 * whether the the resolve can be accessed. validateResolve will return true if it is exceeding the limit
 * within the window, or false if it it not.
 *
 * @param store
 * @param identity
 * @param options
 */
const validateResolve = async (
  store: Store,
  identity: Identity,
  options: Options
) => {
  const accessTimestamps = await store.getForIdentity(identity);
  const filteredAccessTimestamps: ReadonlyArray<any> = [
    Date.now(),
    ...accessTimestamps.filter(timestamp => {
      return timestamp + options.window > Date.now();
    })
  ];
  await store.setForIdentity(identity, filteredAccessTimestamps);
  return filteredAccessTimestamps.length > options.max;
};

/**
 * Returns the Directive to be passed to your GraphQL server.
 *
 * TODO: Fix `any` return type;
 * @param customConfig
 */
const createRateLimitDirective = (
  customConfig: GraphQLRateLimitConfig = {}
): any => {
  const config = { ...defaultConfig, ...customConfig };
  class GraphQLRateLimit extends SchemaDirectiveVisitor {
    public static getDirectiveDeclaration(
      directiveName: string
    ): GraphQLDirective {
      return new GraphQLDirective({
        args: {
          identityArgs: {
            type: new GraphQLList(GraphQLString)
          },
          max: {
            type: GraphQLInt
          },
          message: {
            type: GraphQLString
          },
          window: {
            type: GraphQLInt
          }
        },
        locations: [DirectiveLocation.FIELD_DEFINITION],
        name: directiveName
      });
    }
    // @ts-ignore - TODO: Ideally we'd add a '!` to args:, but its breaking prettier.
    public readonly args: GraphQLRateLimitArgs;

    public visitFieldDefinition(field: GraphQLField<any, any>): void {
      const { resolve = defaultFieldResolver, name } = field;
      // tslint:disable-next-line:no-expression-statement no-object-mutation
      field.resolve = async (...args) => {
        const [, resolveArgs, context] = args;
        const contextIdentity = config.identifyContext(context);
        const window = this.args.window || DEFAULT_WINDOW;
        const max = this.args.max || DEFAULT_MAX;
        const message =
          this.args.message || `You are trying to access '${name}' too often'`;
        const identityArgs =
          this.args.identityArgs || DEFAULT_FIELD_IDENTITY_ARGS;
        const fieldIdentity = getFieldIdentity(name, identityArgs, resolveArgs);

        const isExceedingMax = await validateResolve(
          config.store,
          { contextIdentity, fieldIdentity },
          { window, max }
        );

        if (isExceedingMax) {
          throw new RateLimitError(message);
        }

        return resolve(...args);
      };
    }
  }
  return GraphQLRateLimit;
};

export { createRateLimitDirective, getFieldIdentity, validateResolve };
