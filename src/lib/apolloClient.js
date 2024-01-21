import { ApolloClient, InMemoryCache } from "@apollo/client";

import { GOERLI_GRAPH_URL } from "./constants";

const client = new ApolloClient({
  uri: GOERLI_GRAPH_URL,
  cache: new InMemoryCache(),
});

export default client;
