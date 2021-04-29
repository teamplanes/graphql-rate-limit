import { ApolloServer, gql, makeExecutableSchema } from 'apollo-server';
import { shield } from 'graphql-shield';
import { applyMiddleware } from 'graphql-middleware';
import {
  createRateLimitDirective,
  RedisStore,
  getGraphQLRateLimiter,
  createRateLimitRule,
} from 'graphql-rate-limit';
import redis from 'redis';

// Option 1: Use a directive (applied in the schema below)
const rateLimitDirective = createRateLimitDirective({
  identifyContext: (context) => {
    return context.req.ip;
  },
  store: new RedisStore(redis.createClient()),
});

// Option 2: User graphql-shield (applied in the `shield` below)
const rateLimit = createRateLimitRule({
  formatError: () => {
    return 'Stop doing that so often.';
  },
  identifyContext: (context) => {
    return context.req.ip;
  },
});

const permissions = shield({
  Query: {
    myId: rateLimit({
      max: 2,
      window: '10s',
    }),
  },
});

// Option 3: Manually use the rate limiter in resolvers
const rateLimiter = getGraphQLRateLimiter({
  formatError: () => {
    return 'Stop doing that.';
  },
  identifyContext: (context) => {
    return context.req.ip;
  },
});

const books = [
  {
    title: 'Harry Potter and the Chamber of Secrets',
    author: 'J.K. Rowling',
  },
  {
    title: 'Jurassic Park',
    author: 'Michael Crichton',
  },
];

const typeDefs = gql`
  directive @rateLimit(
    message: String
    identityArgs: [String]
    arrayLengthField: String
    max: Int
    window: String
  ) on FIELD_DEFINITION

  type Book {
    title: String
    author: String
  }

  type Query {
    myId: ID!
    books: [Book]
      @rateLimit(
        message: "You are requesting books too often"
        max: 2
        window: "5s"
      )
  }

  type Mutation {
    updateBook(id: Int!, title: String, author: String): Book # NOTE: This is rate limited using option 2
    createBook(title: String!, author: String!): Book
      @rateLimit(identityArgs: ["title"], max: 2, window: "10s")
    deleteBooks(titles: [String]!): Book
      @rateLimit(
        identityArgs: ["title"]
        arrayLengthField: "titles"
        max: 4
        window: "10s"
      )
  }
`;

const resolvers = {
  Query: {
    books: () => books,
    myId: () => '1',
  },
  Mutation: {
    // This uses the manual rate limiter (Option 3.)
    updateBook: async (parent, args, context, info) => {
      const errorMessage = await rateLimiter(
        {
          parent,
          args,
          context,
          info,
        },
        {
          max: 2,
          window: '10s',
        }
      );
      if (errorMessage) throw new Error(errorMessage);
      books[args.id] = {
        ...books[args.id],
        title: args.title || books[args.id].title,
        author: args.title || books[args.id].author,
      };
      return books[args.id];
    },
    createBook: (_, args) => {
      books.push(args);
      return args;
    },
    deleteBooks: () => {
      return books[0];
    },
  },
};

const server = new ApolloServer({
  context: (ctx) => ctx,

  schemaDirectives: {
    rateLimit: rateLimitDirective,
  },
  schema: applyMiddleware(
    makeExecutableSchema({
      typeDefs,
      resolvers,
    }),
    permissions
  ),
});

server.listen().then(({ url }) => {
  // eslint-disable-next-line no-console
  console.log(`🚀  Server ready at ${url}`);
});
