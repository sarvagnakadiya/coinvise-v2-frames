"use client";

import { Button } from "@/components/ui/Button";
import { signOut } from "next-auth/react";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { ethers } from "ethers";
import CampaignsNativeGaslessClaim from "@/lib/abi/CampaignsNativeGaslessClaim.json";
import {
  useAccount,
  useChainId,
  useSendTransaction,
  useSwitchChain,
} from "wagmi";
import {
  base,
  baseSepolia,
  mainnet,
  optimism,
  optimismSepolia,
  polygon,
  sepolia,
} from "viem/chains";

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
  const {
    sendTransaction,
    data,
    error: sendTxError,
    isError: isSendTxError,
    isPending: isSendTxPending,
  } = useSendTransaction();
  const [txHash, setTxHash] = useState<string | null>(null);

  const router = useRouter();
  const chainId = useChainId();

  const {
    switchChain,
    error: switchChainError,
    isError: isSwitchChainError,
    isPending: isSwitchChainPending,
  } = useSwitchChain();

  const handleSwitchChainIfNeeded = useCallback(async () => {
    await serverLog("current chainId", { chainId });
    if (chainId !== baseSepolia.id) {
      await serverLog("Switching chain inside if", { chainId });
      try {
        await serverLog("Switching chain inside try", { chainId });
        switchChain({ chainId: baseSepolia.id });
      } catch (error) {
        console.error("Error switching chain:", error);
        return false;
      }
    }
    return true;
  }, [chainId, switchChain]);

  const handleSwitchChainId = useCallback(async () => {
    await serverLog("currentchainId", chainId);
    try {
      switchChain({ chainId: baseSepolia.id });
      await serverLog("chain switched");
    } catch (error) {
      await serverLog("Error switching to baseTestnet:", error);
    }
  }, [switchChain]);

  const handleClaimCampaign = useCallback(async () => {
    await serverLog("Claim Campaign");
  }, []);

  // typeHash: 0x23d10def3caacba2e4042e0c75d44a42d2558aabcf5ce951d0642a8032e1e653

  // const getNativeMetaTxTypeData = ({
  //   nonce,
  //   userAddress,
  //   contractAddress,
  //   chainId,
  //   domainName,
  //   domainVersion,
  //   functionSignature,
  // }: MetaTxTypeData) => {
  //   return {
  //     domain: {
  //       name: domainName,
  //       version: domainVersion,
  //       chainId: chainId,
  //       verifyingContract: contractAddress,
  //     },
  //     types: {
  //       MetaTransaction: [
  //         { name: "nonce", type: "uint256" },
  //         { name: "from", type: "address" },
  //         { name: "functionSignature", type: "bytes" },
  //       ],
  //     },
  //     value: {
  //       nonce: parseInt(String(nonce)),
  //       from: userAddress,
  //       functionSignature: functionSignature,
  //     },
  //   };
  // };

  // const handleCreateCampaign = async () => {
  //   try {
  //     // -------- getting relayer signer --------
  //     const RELAYER_PRIVATE_KEY = process.env.NEXT_PUBLIC_RELAYER_PRIVATE_KEY;
  //     const CREATOR_PRIVATE_KEY = process.env.NEXT_PUBLIC_CREATOR_PRIVATE_KEY;

  //     const provider = new ethers.JsonRpcProvider(
  //       process.env.NEXT_PUBLIC_RPC_URL
  //     );

  //     if (!RELAYER_PRIVATE_KEY) {
  //       throw new Error("Relayer private key is not defined");
  //     }
  //     if (!CREATOR_PRIVATE_KEY) {
  //       throw new Error("creator private key is not defined");
  //     }
  //     const relayerSigner = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);
  //     // 0x6479ff62F767d67c255a61d5c2DcBF4f0Cc45d02
  //     const creatorSigner = new ethers.Wallet(CREATOR_PRIVATE_KEY, provider);
  //     await serverLog("Relayer address", { address: relayerSigner.address });

  //     await serverLog("Provider & signer done----");

  //     // Campaign parameters
  //     const args = {
  //       _tokenAddress: "0x2246A41B6efB730A3845012EF8eBE6bc1D367A79",
  //       _maxClaims: BigInt(100),
  //       _amountPerClaim: BigInt(10000000),
  //       _isGasless: BigInt(1),
  //       _maxSponsoredClaims: BigInt(50),
  //     };

  //     await serverLog("Args", args);

  //     // Get contract instance (you'll need to add your contract ABI and address)
  //     const campaignsNativeGaslessClaim = new ethers.Contract(
  //       "0x2A942c4216857ec55216F28e82B8de7dc33FFba1",
  //       CampaignsNativeGaslessClaim,
  //       provider
  //     );
  //     const campaignsNativeGaslessClaim2 = new ethers.Contract(
  //       "0x2A942c4216857ec55216F28e82B8de7dc33FFba1",
  //       CampaignsNativeGaslessClaim,
  //       relayerSigner
  //     );

  //     await serverLog("CampaignsNativeGaslessClaim contract instance done----");

  //     const nonce = await campaignsNativeGaslessClaim.getNonce(
  //       creatorSigner.address
  //     );
  //     await serverLog("Nonce", nonce);
  //     const network = await provider.getNetwork();
  //     await serverLog("Network", network);

  //     await serverLog("ChainId", chainId);

  //     await serverLog("Nonce & chainId done----");

  //     const functionSignature =
  //       campaignsNativeGaslessClaim.interface.encodeFunctionData(
  //         "createCampaign",
  //         [
  //           args._tokenAddress,
  //           args._maxClaims,
  //           args._amountPerClaim,
  //           args._isGasless,
  //           args._maxSponsoredClaims,
  //         ]
  //       );

  //     await serverLog("FunctionSignature", functionSignature);

  //     const { domain, types, value } = getNativeMetaTxTypeData({
  //       nonce,
  //       userAddress: creatorSigner.address,
  //       contractAddress: campaignsNativeGaslessClaim.target as string,
  //       chainId: 84532,
  //       domainName: "CampaignsNativeGaslessClaim",
  //       domainVersion: "1.0",
  //       functionSignature,
  //     });
  //     await serverLog("Address", relayerSigner.address);
  //     await serverLog("creatorAddress", creatorSigner.address);

  //     await serverLog("MetaTxTypeData done----");

  //     // Sign the typed data
  //     const signature = await creatorSigner.signTypedData(domain, types, value);
  //     await serverLog("Signature", signature);
  //     const splitSignature = ethers.Signature.from(signature);
  //     await serverLog("splitSignature", splitSignature);

  //     // Recover and verify the signer's address
  //     const recoveredAddress = ethers.verifyTypedData(
  //       domain,
  //       types,
  //       value,
  //       signature
  //     );
  //     await serverLog("Recovered address", recoveredAddress);

  //     // Verify the recovered address matches the creator's address
  //     if (
  //       recoveredAddress.toLowerCase() !== creatorSigner.address.toLowerCase()
  //     ) {
  //       throw new Error("Signature verification failed");
  //     }
  //     await serverLog("Signature verification passed");

  //     // Call executeMetaTransaction
  //     const tx = await campaignsNativeGaslessClaim2.executeMetaTransaction(
  //       relayerSigner.address, // creatorAddress (user's address)
  //       functionSignature,
  //       splitSignature.r,
  //       splitSignature.s,
  //       splitSignature.v
  //     );

  //     await serverLog("Transaction sent", { hash: tx.hash });

  //     // Wait for transaction confirmation
  //     const receipt = await tx.wait();
  //     await serverLog("Transaction confirmed", { receipt });
  //   } catch (error) {
  //     await serverLog("Error creating campaign", { error: error });
  //     console.error("Error creating campaign:", error);
  //   }
  // };

  const handleApproveToken = useCallback(async () => {
    const switched = await handleSwitchChainIfNeeded();
    if (!switched) return;

    const tokenContractAddress = "0xBA8E964439E782D940979aC0100139415D0504ce"; // Replace with your token contract address
    const campaignContractAddress =
      "0x2A942c4216857ec55216F28e82B8de7dc33FFba1";
    const abi = [
      "function approve(address spender, uint256 amount) external returns (bool)",
    ];
    const iface = new ethers.Interface(abi);

    const data = iface.encodeFunctionData("approve", [
      campaignContractAddress, // spender
      ethers.MaxUint256, // amount (approve maximum)
    ]);

    await serverLog("Approve Token Data", {
      tokenContractAddress,
      campaignContractAddress,
      data,
    });

    sendTransaction(
      {
        to: tokenContractAddress,
        data: data as `0x${string}`,
      },
      {
        onSuccess: (hash) => {
          console.log("Approval transaction hash:", hash);
          serverLog("Approval transaction hash", { hash });
        },
      }
    );
  }, [sendTransaction, handleSwitchChainIfNeeded]);

  const handleCreateCampaign = useCallback(async () => {
    const switched = await handleSwitchChainIfNeeded();
    if (!switched) return;

    const contractAddress = "0x2A942c4216857ec55216F28e82B8de7dc33FFba1";
    const abi = [
      "function createCampaign(address _tokenAddress, uint256 _maxClaims, uint256 _amountPerClaim, uint8 _isGasless, uint256 _maxSponsoredClaims) external payable returns (uint256 _campaignId)",
    ];
    const iface = new ethers.Interface(abi);

    const data = iface.encodeFunctionData("createCampaign", [
      "0xBA8E964439E782D940979aC0100139415D0504ce", // _tokenAddress
      BigInt(100), // _maxClaims
      BigInt(1000000000000000000), // _amountPerClaim
      0, // _isGasless
      BigInt(0), // _maxSponsoredClaims
    ]);

    await serverLog("Create Campaign Data", { contractAddress, data });

    sendTransaction(
      {
        to: contractAddress,
        data: data as `0x${string}`,
      },
      {
        onSuccess: (hash) => {
          setTxHash(hash);
          serverLog("Create Campaign transaction hash", { hash });
        },
      }
    );
  }, [sendTransaction, handleSwitchChainIfNeeded]);

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
      {chainId && (
        <div className="my-2 text-xs">
          Chain ID: <pre className="inline">{chainId}</pre>
        </div>
      )}
      <Button onClick={handleSwitchChainId}>Switch to Base Testnet</Button>
      <Button onClick={handleApproveToken}>Approve Token</Button>
      <Button onClick={handleCreateCampaign}>Create Campaign</Button>
      <Button onClick={handleClaimCampaign}>Claim Campaign</Button>
      <Button onClick={handleSignOut}>Sign Out</Button>
    </div>
  );
}
