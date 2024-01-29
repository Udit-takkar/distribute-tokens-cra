import { WagmiConfig, configureChains, createConfig } from "wagmi";
import { getDefaultWallets, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { goerli, sepolia } from "wagmi/chains";
import { alchemyProvider } from "wagmi/providers/alchemy";
import { publicProvider } from "wagmi/providers/public";
import { SplitsProvider } from "@0xsplits/splits-sdk-react";
import apolloClient from "../lib/apolloClient";
import { ApolloProvider } from "@apollo/client";

const chain = process.env.REACT_APP_CHAIN_ID === "5" ? goerli : sepolia;

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [chain],
  [
    alchemyProvider({
      apiKey: process.env.REACT_APP_ALCHEMY_API_KEY ?? "",
    }),
    publicProvider(),
  ],
);
const { connectors } = getDefaultWallets({
  appName: "Distribute Tokens",
  projectId: process.env.REACT_APP_RAINBOWKIT_PROJECT_ID ?? "",
  chains,
});
const config = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient,
});
const splitsConfig = {
  chainId: 1,
  publicClient,
};

const Providers = ({ children }) => (
  <ApolloProvider client={apolloClient}>
    <WagmiConfig config={config}>
      <SplitsProvider config={splitsConfig}>
        <RainbowKitProvider chains={chains}>{children}</RainbowKitProvider>
      </SplitsProvider>
    </WagmiConfig>
  </ApolloProvider>
);

export { Providers };
