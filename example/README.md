### Run

```sh
yarn start
```


### Develop

Ensure you have `yalc` installed:

```sh
yarn global add yalc
```

Link `graphql-rate-limit` to this project:

```sh
cd .. && yalc link && cd ./example && yalc link "graphql-rate-limit"
```

Run in `example` from the root of the project:

```sh
cd .. && yarn example
```
