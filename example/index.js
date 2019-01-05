const { ApolloServer, gql } = require('apollo-server');
const { createRateLimitDirective } = require('graphql-rate-limit');

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
	directive @rateLimit(message: String, identityArgs: [String], max: Int, window: Int) on FIELD_DEFINITION

	type Book {
		title: String
		author: String
	}

	type Query {
		books: [Book] @rateLimit(message: "You are requesting books too often")
	}

	type Mutation {
		createBook(title: String!, author: String!): Book @rateLimit(identityArgs: ["title"], max: 2, window: 10000)
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
			}
		})
	}
});

server.listen().then(({ url }) => {
	console.log(`🚀  Server ready at ${url}`);
});
