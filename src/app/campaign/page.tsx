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

// Add this utility function at the top level
const serverLog = async (message: string, data?: any) => {
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
      await serverLog("Relayer address", { address: relayerSigner.address });

      await serverLog("Provider & signer done----");

      // Campaign parameters
      const args = {
        _tokenAddress: "0x2246A41B6efB730A3845012EF8eBE6bc1D367A79",
        _maxClaims: BigInt(100),
        _amountPerClaim: BigInt(10000000),
        _isGasless: BigInt(1),
        _maxSponsoredClaims: BigInt(50),
      };

      // Get contract instance (you'll need to add your contract ABI and address)
      const campaignsNativeGaslessClaim = new ethers.Contract(
        "0x2A942c4216857ec55216F28e82B8de7dc33FFba1",
        CampaignsNativeGaslessClaim,
        relayerSigner
      );

      await serverLog("CampaignsNativeGaslessClaim contract instance done----");

      const nonce = await campaignsNativeGaslessClaim.getNonce(address);
      await serverLog("Nonce", nonce);
      const network = await provider.getNetwork();
      await serverLog("Network", network);
      const chainId = Number(network.chainId);

      await serverLog("Nonce & chainId done----");

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

      await serverLog("FunctionSignature", functionSignature);

      const { domain, types, value } = getNativeMetaTxTypeData({
        nonce,
        userAddress: relayerSigner.address,
        contractAddress: campaignsNativeGaslessClaim.target as string,
        chainId,
        domainName: "CampaignsNativeGaslessClaim",
        domainVersion: "1.0",
        functionSignature,
      });

      await serverLog("MetaTxTypeData done----");

      // Sign the typed data
      const signature = await relayerSigner.signTypedData(domain, types, value);
      await serverLog("Signature", signature);
      const splitSignature = ethers.Signature.from(signature);
      await serverLog("splitSignature", splitSignature);

      await serverLog("Campaign Creation Details", {
        functionSignature,
        splitSignature,
        args,
      });
    } catch (error) {
      await serverLog("Error creating campaign", { error: error });
      console.error("Error creating campaign:", error);
    }
  };

  const handleSignOut = useCallback(async () => {
    try {
      await signOut({ redirect: false });
      router.push("/");
    } catch (error) {
      await serverLog("Error signing out", { error: error });
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
