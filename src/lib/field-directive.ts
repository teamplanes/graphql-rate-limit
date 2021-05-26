import {
  defaultFieldResolver,
  DirectiveLocation,
  GraphQLDirective,
  GraphQLField,
  GraphQLInt,
  GraphQLList,
  GraphQLString,
} from 'graphql';
import { SchemaDirectiveVisitor } from '@graphql-tools/utils';
import { RateLimitError } from './rate-limit-error';
import { GraphQLRateLimitDirectiveArgs, GraphQLRateLimitConfig } from './types';
import { getGraphQLRateLimiter } from './get-graphql-rate-limiter';

/**
 * Returns the Directive to be passed to your GraphQL server.
 *
 * TODO: Fix `any` return type;
 * @param customConfig
 */
const createRateLimitDirective = (
  customConfig: GraphQLRateLimitConfig = {}
): any => {
  const rateLimiter = getGraphQLRateLimiter(customConfig);
  class GraphQLRateLimit extends SchemaDirectiveVisitor {
    public static getDirectiveDeclaration(
      directiveName: string
    ): GraphQLDirective {
      return new GraphQLDirective({
        args: {
          arrayLengthField: {
            type: GraphQLString,
          },
          identityArgs: {
            type: new GraphQLList(GraphQLString),
          },
          max: {
            type: GraphQLInt,
          },
          message: {
            type: GraphQLString,
          },
          window: {
            type: GraphQLString,
          },
        },
        locations: [DirectiveLocation.FIELD_DEFINITION],
        name: directiveName,
      });
    }

    public readonly args!: GraphQLRateLimitDirectiveArgs;

    public visitFieldDefinition(field: GraphQLField<any, any>): void {
      const { resolve = defaultFieldResolver } = field;
      // eslint-disable-next-line no-param-reassign
      field.resolve = async (parent, args, context, info) => {
        const errorMessage = await rateLimiter(
          {
            parent,
            args,
            context,
            info,
          },
          this.args
        );

        if (errorMessage) {
          throw customConfig.createError
            ? customConfig.createError(errorMessage)
            : new RateLimitError(errorMessage);
        }

        return resolve(parent, args, context, info);
      };
    }
  }
  return GraphQLRateLimit;
};

export { createRateLimitDirective };
