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
import { base, baseSepolia } from "viem/chains";

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
      try {
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
      switchChain({ chainId: base.id });
      await serverLog("chain switched");
    } catch (error) {
      await serverLog("Error switching to baseTestnet:", error);
    }
  }, [switchChain]);

  const handleSend = useCallback(() => {
    sendTransaction({
      to: "0x542FfB7d78D78F957895891B6798B3d60e979b64",
      value: BigInt(1),
    });
  }, [sendTransaction]);

  const handleClaimCampaign = useCallback(async () => {
    const campaignManager = "0xEA380ddC224497dfFe5871737E12136d3968af15";
    const campaignId = 0;
    const referrer = "0x0000000000000000000000000000000000000000";
    await serverLog("Claim Campaign Data", {
      campaignManager,
      campaignId,
      referrer,
    });

    const provider = new ethers.JsonRpcProvider(
      "https://base-mainnet.g.alchemy.com/v2/9-2O3J1H0d0Z-xDdDwZHHCBM2mwzVMwT"
    );
    const campaigns_cobj = new ethers.Contract(
      "0x542FfB7d78D78F957895891B6798B3d60e979b64",
      CampaignsNativeGaslessClaim,
      provider
    );

    if (campaigns_cobj && provider) {
      await serverLog("provider & campaigns done");
    }

    const v = 27;
    const r =
      "0x29e3ca3a9d56c30a40d7b0ed455da27123b61e194605560a41b30dbc45973c8e";
    const s =
      "0x41c7ef79a97eb68a6dde6e3b2834ed6eb4c5321547b23781714c8992007c5a3e";

    await serverLog("Claim Campaign Data", {
      campaignManager,
      campaignId,
      r,
      s,
      v,
      referrer,
    });

    const data = campaigns_cobj.interface.encodeFunctionData("claim", [
      campaignManager,
      campaignId,
      r,
      s,
      v,
      referrer,
    ]) as `0x${string}`;

    await serverLog("Claim Campaign Data", {
      campaignManager,
      campaignId,
      r,
      s,
      v,
      referrer,
    });

    sendTransaction(
      {
        to: campaigns_cobj.target as `0x${string}`,
        data: data,
        value: BigInt(150000000000000),
      },
      {
        onSuccess: (hash) => {
          console.log("Claim transaction hash:", hash);
          serverLog("Claim transaction hash", { hash });
        },
      }
    );
  }, [sendTransaction, address]);

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
    ]) as unknown as `0x${string}`;

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
    ]) as unknown as `0x${string}`;

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
      <Button onClick={handleSend}>Send ETH</Button>
    </div>
  );
}
