
<h1 align="center">💂‍♀️ GraphQL Rate Limit 💂‍♂️</h1>

<p align="center">
A GraphQL Rate Limiter to add basic but granular rate limiting to your Queries or Mutations.
</p>

---

## Features

- 💂‍♀️ Add rate limits to queries or mutations
- 🤝 Works with any Node.js GraphQL setup (@directive, graphql-sheild rule and a base rate limiter function for every other use case)
- 🔑 Add filters to rate limits based on the query or mutation args
- ❌ Custom error messaging
- ⏰ Configure using a simple `max` per `window` arguments
- 💼 Custom stores, use Redis, Postgres, Mongo... it defaults to in-memory
- 💪 Written in TypeScript


## Install

```sh
yarn add graphql-rate-limit
```

## Examples

#### Option 1: Using the @directive

```ts
import { createRateLimitDirective } from 'graphql-rate-limit';

// Step 1: get rate limit directive instance
const rateLimitDirective = createRateLimitDirective({ identifyContext: (ctx) => ctx.id });

const schema = makeExecutableSchema({
  schemaDirectives: {
    rateLimit: rateLimitDirective
  },
  resolvers: {
    Query: {
      getItems: () => [{ id: '1' }]
    }
  },
  typeDefs: gql`
    directive @rateLimit(
      max: Int,
      window: String,
      message: String,
      identityArgs: [String],
      arrayLengthField: String
    ) on FIELD_DEFINITION

    type Query {
      # Step 2: Apply the rate limit instance to the field with config
      getItems: [Item] @rateLimit(window: "1s", max: 5, message: "You are doing that too often.")
    }
  `
});
```

#### Option 2: Using the graphql-shield

```ts
import { createRateLimitRule } from 'graphql-rate-limit';

// Step 1: get rate limit shield instance rule
const rateLimitRule = createRateLimitRule({ identifyContext: (ctx) => ctx.id });

const permissions = shield({
  Query: {
    // Step 2: Apply the rate limit rule instance to the field with config
    getItems: rateLimitRule({ window: "1s", max: 5 })
  }
});

const schema = applyMiddleware(
  makeExecutableSchema({
    typeDefs: gql`
      type Query {
        getItems: [Item]
      }
    `,
    resolvers: {
      Query: {
        getItems: () => [{ id: '1' }]
      }
    }
  }),
  permissions
)
```

#### Option 3: Using the base rate limiter function

```ts
import { getGraphQLRateLimiter } from 'graphql-rate-limit';

// Step 1: get rate limit directive instance
const rateLimiter = getGraphQLRateLimiter({ identifyContext: (ctx) => ctx.id });

const schema = makeExecutableSchema({
  typeDefs: `
    type Query {
      getItems: [Item]
    }
  `,
  resolvers: {
    Query: {
      getItems: async (parent, args, context, info) => {
        // Step 2: Apply the rate limit logic instance to the field with config
        const errorMessage = await rateLimiter(
          { parent, args, context, info },
          { max: 5, window: '10s' }
        );
        if (errorMessage) throw new Error(errorMessage);
        return [{ id: '1' }]
      }
    }
  }
})
```

## Configuration

You'll notice that each usage example has two steps, step 1 we get an instace of a rate limiter and step 2 we apply the rate limit to one or more fields. When creating the initial instance we pass 'Instance Config' (e.g. `identifyContext` or a `store` instance), this instance will likely be the only instance you'd create for your entire GraphQL backend and can be applied to multiple fields.

Once you have your rate limiting instance you'll apply it to all the fields that require rate limiting, at this point you'll pass field level rate limiting config (e.g. `window` and `max`).

And so... we have the same 'Instance Config' and 'Field Config' options which ever way you use this library.

### Instance Config

#### `identifyContext`

A required key and used to identify the user/client. The most likely cases are either using the context's request.ip, or the user ID on the context. A function that accepts the context and returns a string that is used to identify the user.

```js
identifyContext: (ctx) => ctx.user.id
```

#### `store`

An optional key as it defaults to an InMemoryStore. See the implementation of InMemoryStore if you'd like to implement your own with your own database.


```js
store: new MyCustomStore()
```

#### `formatError`

Generate a custom error message. Note that the `message` passed in to the field config will be used if its set.

```js
formatError: ({ fieldName }) => `Woah there, you are doing way too much ${fieldName}`
```

#### `onStoreError`

If your backing store (e.g. redis) throws an error, `graphql-rate-limit` will call this hook with the error. By default the error will be thrown, stopping/blocking the request.  If you supply a hook and don't rethrow the error in your handler, `graphql-rate-limit` will allow the request through, effectively disabling rate-limiting while your store is down.

```js
onStoreError: (exception) => {
  // Do some logging or trigger an alert maybe?
  logger.error(exception);

  /* Not rethrowing the exception will allow the request through */
}
```

#### `enableBatchRequestCache`

This enables a per-request synchronous cache to properly rate limit batch queries. Defaults to `false` to preserve backwards compatibility. 

```js
enableBatchRequestCache: false | true
```

### Field Config

#### `window`

Specify a time interval window that the `max` number of requests can access the field. We use Zeit's `ms` to parse the `window` arg, [docs here](https://github.com/zeit/ms).

#### `max`

Define the max number of calls to the given field per `window`.

#### `identityArgs`

If you wanted to limit the requests to a field per id, per user, use `identityArgs` to define how the request should be identified. For example you'd provide just `["id"]` if you wanted to rate limit the access to a field by `id`. We use Lodash's `get` to access nested identity args, [docs here](https://lodash.com/docs/4.17.11#get).

#### `message`

A custom message per field. Note you can also use `formatError` to customise the default error message if you don't want to define a single message per rate limited field.

#### `arrayLengthField`

Limit calls to the field, using the length of the array as the number of calls to the field.


## Redis Store Usage

It is recommended to use a persistent store rather than the default InMemoryStore. GraphQLRateLimit currently supports Redis as an alternative. You'll need to install Redis in your project first.

```js
import { createRateLimitDirective, RedisStore } from 'graphql-rate-limit';

const GraphQLRateLimit = createRateLimitDirective({
  identifyContext: ctx => ctx.user.id,
  /**
   * Import the class from graphql-rate-limit and pass in an instance of redis client to the constructor
   */
  store: new RedisStore(redis.createClient())
});
```
