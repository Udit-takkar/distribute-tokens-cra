import "./App.css";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { gql } from "@apollo/client";
import { useLazyQuery } from "@apollo/client";
import { DisplaySplit, CreateSplit } from "@0xsplits/splits-kit";
import { useState } from "react";
import Input from "./components/Input";
import Button from "./components/Button";
import { useEffect } from "react";
import { useWalletClient, usePublicClient } from "wagmi";
import { useSplitsClient } from "@0xsplits/splits-sdk-react";
import { HatsClient } from "@hatsprotocol/sdk-v1-core";
import { splitMainEthereumAbi } from "@0xsplits/splits-sdk/constants/abi";
import { decodeEventLog } from "viem";
import { toHTTP } from "./lib/utils";

const SPLIT_ADDRESS = "0xA44c7B7A3F90E91aeb38Ea5a1Be22dd684a74d53";

const Wrapper = ({ children }) => (
  <div className="max-w-xl mx-auto px-6">{children}</div>
);

const Header = () => {
  return (
    <header className="py-8 border-b mb-10">
      <Wrapper>
        <div className="flex items-center justify-between">
          <h1 className="text-lg md:text-2xl font-bold">Distribute Tokens</h1>
          <ConnectButton
            showBalance={false}
            accountStatus="address"
            label="Connect"
          />
        </div>
      </Wrapper>
    </header>
  );
};

const GET_HAT_WEARERS = gql`
  query GetHatWearers($hatId: String) {
    hat(id: $hatId) {
      id
      wearers {
        id
      }
    }
  }
`;

const TOKEN_ADDRESS = "0xdD69DB25F6D620A7baD3023c5d32761D353D3De9";
const chainId = parseInt(process.env.REACT_APP_CHAIN_ID ?? "5");

// Goerli Hat Id:- 0x0000017900010001000100000000000000000000000000000000000000000000
// Split Address:- "0x393F25EE10Ba041340615c427d78DfFA46F120af"
// "0xA44c7B7A3F90E91aeb38Ea5a1Be22dd684a74d53"

function App() {
  const [getHatWearers, { data, loading, error }] =
    useLazyQuery(GET_HAT_WEARERS);

  const [hatId, setHatId] = useState("");
  const [wearers, setWearers] = useState([]);
  const [hat, setHat] = useState();
  const [hatsDetails, setHatsDetails] = useState();

  const [splitAddress, setSplitAddress] = useState();
  const [isLoading, setIsLoading] = useState(false);
  const walletClientRes = useWalletClient();
  const client = usePublicClient();
  const [recipients, setRecipients] = useState([]);

  const splitsClient = useSplitsClient({
    chainId,
    publicClient: client,
    walletClient: walletClientRes.data ?? undefined,
  });

  const hatsClient = new HatsClient({
    chainId,
    publicClient: client,
    walletClient: walletClientRes.data ?? undefined,
  });

  useEffect(() => {
    const getMetadata = async () => {
      if (!splitAddress) return;
      try {
        const response = await splitsClient.getSplitMetadata({
          splitAddress,
        });
        setRecipients(response.recipients);
      } catch (err) {
        console.log("something went wrong", err);
      }
    };
    getMetadata();
  }, [splitAddress, splitsClient]);

  const handleGetWearers = async () => {
    try {
      if (!walletClientRes?.data?.account?.address)
        throw new Error("No wallet connected");

      setIsLoading(true);

      const hat = await hatsClient.viewHat(hatId);
      setHat(hat);

      const res = await getHatWearers({
        variables: {
          hatId: hatId,
        },
      });

      const wearersAddresses = res.data.hat.wearers.map((wearer) => wearer.id);

      const actualWearersAddresses = await Promise.all(
        wearersAddresses.map(async (wearer) => {
          const isWearer = await hatsClient.isWearerOfHat({
            hatId: hatId,
            wearer,
          });
          return isWearer ? wearer : null;
        })
      );

      const filteredActualWearersAddresses = actualWearersAddresses.filter(
        (wearer) => wearer !== null
      );

      console.log("wearersAddresses", filteredActualWearersAddresses);

      const totalWearers = filteredActualWearersAddresses.length;
      const equalPercentageAllocation = 100 / totalWearers;

      setWearers(
        filteredActualWearersAddresses.map((wearer) => {
          return {
            address: wearer,
            percentAllocation: equalPercentageAllocation,
          };
        })
      );
    } catch (err) {
      console.log("something went wrong", err);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (hat?.details) {
      fetch(toHTTP(hat.details))
        .then((res) => res.json())
        .then((data) => {
          console.log("dat",data)
          setHatsDetails(data.data);
        })
        .catch((err) => console.log(err));
    }
  }, [hat]);

  console.log("heat", hat);

  return (
    <div>
      <Header />
      <main>
        <Wrapper>
          <p>Enter Hat ID</p>
          <Input
            className="mt-2"
            value={hatId}
            onChange={(e) => setHatId(e.target.value)}
          />
          <div className="space-x-2">
            <Button className="mt-2" onClick={handleGetWearers}>
              Get Wearers
            </Button>
            {/* <Button onClick={handleDistributeFunds}>Distribute Funds</Button> */}
          </div>
          <div></div>
          {isLoading && <div>Loading...</div>}
          <div className="space-y-3 mt-4">
            {hatsDetails && (
              <>
                <div>
                  <p className="font-bold">Hats Name: </p>{" "}
                  <p>{hatsDetails.name}</p>{" "}
                </div>
                <div>
                  <p className="font-bold">Hats Description: </p>{" "}
                  <p>{hatsDetails.description}</p>{" "}
                </div>
              </>
            )}
            {hat?.imageUri && (
              <img
                src={toHTTP(hat.imageUri)}
                alt="Hat"
                height={250}
                width={250}
              />
            )}
          </div>
          {!splitAddress && wearers.length > 0 && (
            <div className="mt-8">
              <CreateSplit
                chainId={chainId}
                defaultDistributorFee={0.1}
                defaultController="0x0000000000000000000000000000000000000000"
                defaultRecipients={wearers}
                displayChain={true}
                width="sm"
                theme="light"
                onSuccess={(events) => {
                  console.log("events", events);

                  const event = events.length > 0 ? events[0] : undefined;
                  if (event) {
                    const log = decodeEventLog({
                      abi: splitMainEthereumAbi,
                      data: event.data,
                      topics: event.topics,
                    });

                    console.log("log", log);

                    setSplitAddress(log.args.split);
                  }
                }}
              />
            </div>
          )}
          {splitAddress && (
            <div className="mt-8">
              <p className="font-bold">Split Address: {splitAddress}</p>
              <DisplaySplit
                theme="light"
                chainId={chainId}
                address={splitAddress}
              />
            </div>
          )}
        </Wrapper>
      </main>
    </div>
  );
}

export default App;
