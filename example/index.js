const { ApolloServer, gql } = require('apollo-server');
const { createRateLimitDirective, RedisStore } = require('graphql-rate-limit');
const redis = require('redis');

const books = [
	{
		title: 'Harry Potter and the Chamber of Secrets',
		author: 'J.K. Rowling'
	},
	{
		title: 'Jurassic Park',
		author: 'Michael Crichton'
	}
];

const typeDefs = gql`
	directive @rateLimit(message: String, identityArgs: [String], max: Int, window: String) on FIELD_DEFINITION

	type Book {
		title: String
		author: String
	}

	type Query {
		books: [Book] @rateLimit(message: "You are requesting books too often", max: 2, window: "5s")
	}

	type Mutation {
		createBook(title: String!, author: String!): Book @rateLimit(identityArgs: ["title"], max: 2, window: "10s")
	}
`;

const resolvers = {
	Query: {
		books: () => books
	},
	Mutation: {
		createBook: (_, args) => {
			books.push(args);
			return args;
		}
	}
};

const server = new ApolloServer({
	typeDefs,
	resolvers,
	context: (ctx) => ctx,
	schemaDirectives: {
		rateLimit: createRateLimitDirective({
			identifyContext: (context) => {
				return context.req.ip;
			},
			store: new RedisStore(redis.createClient())
		})
	}
});

server.listen().then(({ url }) => {
	console.log(`🚀  Server ready at ${url}`);
});
