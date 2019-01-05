# GraphQL Rate Limit

`graphql-rate-limit` is a directive allows you to add basic but granular rate limiting to your GraphQL API.


### Example

```graphql
type Query {
  # Rate limit to 5 per second
  getItems: [Item] @rateLimit(window: 1000, max: 5)

  # Rate limit access per item ID
  getItem(id: ID!): Item @rateLimit(identityArgs: ["id"])
}

type Mutation {
  # Rate limit with a custom error message
  createItem(title: String!): Item @rateLimit(message: "You are doing that too often.")
}
```
