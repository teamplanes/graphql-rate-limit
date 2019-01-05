### Run

```sh
yarn start
```


### Develop

Ensure you have `realpath` installed:

```sh
brew install coreutils
```

Link `graphql-rate-limit` to this project:

```sh
cd .. && yarn link && cd ./example && yarn link "graphql-rate-limit"
```

Run in watch mode:

```sh
yarn dev

