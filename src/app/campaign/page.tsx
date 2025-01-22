"use client";

import { Button } from "@/components/ui/Button";
import { signOut } from "next-auth/react";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { ethers } from "ethers";
import CampaignsNativeGaslessClaim from "@/lib/abi/CampaignsNativeGaslessClaim.json";
import { useAccount } from "wagmi";

interface MetaTxTypeData {
  nonce: bigint;
  userAddress: string;
  contractAddress: string;
  chainId: number;
  domainName: string;
  domainVersion: string;
  functionSignature: string;
}

interface LogData {
  message: string;
  data?: unknown;
}

// Add this utility function at the top level
const serverLog = async ({ message, data }: LogData) => {
  try {
    await fetch("/api/log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, data }),
    });
  } catch (error) {
    // Fallback to client console in case of fetch error
    console.error("Failed to send log to server:", error);
  }
};

export default function Campaign() {
  const { address, isConnected } = useAccount();

  const router = useRouter();
  const [chainId, setChainId] = useState<number>();

  const getNativeMetaTxTypeData = ({
    nonce,
    userAddress,
    contractAddress,
    chainId,
    domainName,
    domainVersion,
    functionSignature,
  }: MetaTxTypeData) => {
    return {
      domain: {
        name: domainName,
        version: domainVersion,
        chainId: chainId,
        verifyingContract: contractAddress,
      },
      types: {
        MetaTransaction: [
          { name: "nonce", type: "uint256" },
          { name: "from", type: "address" },
          { name: "functionSignature", type: "bytes" },
        ],
      },
      value: {
        nonce: nonce,
        from: userAddress,
        functionSignature: functionSignature,
      },
    };
  };

  const handleCreateCampaign = async () => {
    try {
      // -------- getting relayer signer --------
      const RELAYER_PRIVATE_KEY = process.env.NEXT_PUBLIC_RELAYER_PRIVATE_KEY;
      if (!RELAYER_PRIVATE_KEY) {
        throw new Error("Relayer not found");
      }

      const provider = new ethers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_RPC_URL
      );

      const relayerSigner = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);
      await serverLog({
        message: "Relayer address",
        data: { address: relayerSigner.address },
      });

      await serverLog({ message: "Provider & signer done----" });

      // Campaign parameters
      const args = {
        _tokenAddress: "0x...", // Your token address
        _maxClaims: 100,
        _amountPerClaim: ethers.parseEther("1"),
        _isGasless: true,
        _maxSponsoredClaims: 50,
      };

      // Get contract instance (you'll need to add your contract ABI and address)
      const campaignsNativeGaslessClaim = new ethers.Contract(
        "0x2A942c4216857ec55216F28e82B8de7dc33FFba1",
        CampaignsNativeGaslessClaim,
        relayerSigner
      );

      await serverLog({
        message: "CampaignsNativeGaslessClaim contract instance done----",
      });

      const nonce = await campaignsNativeGaslessClaim.getNonce(address);
      await serverLog({ message: "Nonce", data: nonce });

      const network = await provider.getNetwork();
      await serverLog({ message: "Network", data: network });
      const chainId = Number(network.chainId);
      await serverLog({ message: "ChainId", data: chainId });

      await serverLog({ message: "Nonce & chainId done----" });

      const functionSignature =
        campaignsNativeGaslessClaim.interface.encodeFunctionData(
          "createCampaign",
          [
            args._tokenAddress,
            args._maxClaims,
            args._amountPerClaim,
            args._isGasless,
            args._maxSponsoredClaims,
          ]
        );

      const { domain, types, value } = getNativeMetaTxTypeData({
        nonce: nonce,
        userAddress: relayerSigner.address,
        contractAddress: campaignsNativeGaslessClaim.target as string,
        chainId,
        domainName: "CampaignsNativeGaslessClaim",
        domainVersion: "1.0",
        functionSignature,
      });

      await serverLog({ message: "MetaTxTypeData done----" });

      // Sign the typed data
      const signature = await relayerSigner.signTypedData(domain, types, value);
      const splitSignature = ethers.Signature.from(signature);

      console.log("splitSignature", splitSignature);

      await serverLog({
        message: "Campaign Creation Details",
        data: { functionSignature, splitSignature, args },
      });
    } catch (error) {
      await serverLog({
        message: "Error creating campaign",
        data: { error: error },
      });
      console.error("Error creating campaign:", error);
    }
  };

  const handleSignOut = useCallback(async () => {
    try {
      await signOut({ redirect: false });
      router.push("/");
    } catch (error) {
      await serverLog({ message: "Error signing out", data: { error: error } });
      console.error("Error signing out", error);
    }
  }, [router]);

  return (
    <div>
      <h1>Campaign Page</h1>
      <p>Welcome to the campaign page!</p>
      <Button onClick={handleCreateCampaign}>Create Campaign</Button>
      <Button onClick={handleSignOut}>Sign Out</Button>
    </div>
  );
}
