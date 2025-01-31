"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ExpandableTab } from "@/components/ui/ExpandableTab";
import Image from "next/image";
import { useAccount } from "wagmi";
import LPLockerABI from "@/lib/abi/LPLocker.json";
import { ethers } from "ethers";
import sdk from "@farcaster/frame-sdk";
import { TokenData } from "@/types/token";
import { serverLog } from "@/utils/logging";
import { ConnectWalletModal } from "@/components/ui/ConnectWalletModal";

export default function TokenPage() {
  const { tokenAddress } = useParams();
  const [openTab, setOpenTab] = useState<string | null>(null);
  const { address, isConnected } = useAccount();
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);

  useEffect(() => {
    const initializeFrameSDK = async () => {
      if (!isSDKLoaded && sdk) {
        const context = await sdk.context;
        sdk.actions.ready({});
        setIsSDKLoaded(true);
      }
    };

    initializeFrameSDK();

    return () => {
      sdk.removeAllListeners();
    };
  }, [isSDKLoaded]);

  useEffect(() => {
    const fetchTokenData = async () => {
      await serverLog("Token Page", { tokenAddress });

      try {
        const response = await fetch(
          `https://api-staging.coinvise.co/token/8453/${tokenAddress}`,
          {
            headers: {
              "x-api-key": process.env.COINVISE_API_KEY || "",
              "X-Authenticated-User": address || "",
              "Content-Type": "application/json",
            },
          }
        );
        const data = await response.json();
        await serverLog("Token Data", { data });
        setTokenData(data);
      } catch (error) {
        console.error("Error fetching token data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTokenData();
  }, [tokenAddress, address]);

  useEffect(() => {
    setShowConnectModal(!address || !isConnected);
  }, [address, isConnected]);

  const handleClaimFees = useCallback(async () => {
    try {
      if (!tokenData) return;

      const provider = new ethers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_BASE_RPC_URL || ""
      );
      const signer = new ethers.JsonRpcSigner(provider, address as string);

      const LockerInstance = new ethers.Contract(
        tokenData.lpLockerAddress,
        LPLockerABI,
        signer
      );
      const tokenId = await LockerInstance.tokenId();
      await serverLog("Token ID", { tokenId: tokenId.toString() });

      if (!address || !tokenId) {
        return;
      }

      const hash = await LockerInstance.collectFees(address, tokenId);
      await serverLog("Transaction sent", { hash });
    } catch (error) {
      console.error("Error collecting fees:", error);
    }
  }, [address, tokenData]);

  const toggleTab = (tabName: string) => {
    setOpenTab(openTab === tabName ? null : tabName);
  };

  if (loading || !tokenData) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <ConnectWalletModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
      />

      {/* Token Info Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8 max-w-[600px] mx-auto">
        <div className="flex items-center gap-4 mb-4">
          <Image
            src={tokenData.imageUrl}
            alt={tokenData.name}
            width={64}
            height={64}
            className="rounded-full"
          />
          <div>
            <h1 className="text-2xl font-bold">{tokenData.name}</h1>
            <p className="text-gray-600">{tokenData.symbol}</p>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <p className="text-gray-600">{tokenData.description}</p>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <p className="text-gray-500">Total Supply</p>
              <p className="font-medium">
                {Number(tokenData.tokenSupply).toLocaleString()}{" "}
                {tokenData.symbol}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Decimals</p>
              <p className="font-medium">{tokenData.decimals}</p>
            </div>
          </div>
          <div className="mt-2 space-y-3">
            <div>
              <p className="text-gray-500">Contract Address</p>
              <p className="font-mono text-sm break-all">{tokenAddress}</p>
            </div>
            <div className="flex flex-col gap-2">
              <a
                href={`https://basescan.org/address/${tokenAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <span>View on Basescan</span>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
              {/* <a
                href={`https://staging.coinvise.co/token/${tokenAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <span>View on Coinvise</span>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a> */}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-8">
        <ExpandableTab
          title="Swap Tokens"
          isOpen={openTab === "swap"}
          onToggle={() => toggleTab("swap")}
        >
          <iframe
            src={`https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=${tokenAddress}&chain=base`}
            height="660px"
            width="100%"
            className="border-0 rounded-xl"
          />
        </ExpandableTab>

        <ExpandableTab
          title="Price chart"
          isOpen={openTab === "priceChart"}
          onToggle={() => toggleTab("priceChart")}
        >
          <iframe
            className="h-full min-h-[500px] w-full border-0"
            id="geckoterminal-embed"
            title="GeckoTerminal Embed"
            src={`https://www.geckoterminal.com/base/pools/${tokenAddress}?embed=1&info=0&swaps=0&grayscale=0&light_chart=0`}
            allow="clipboard-write"
          />
        </ExpandableTab>
        <ExpandableTab
          title="Claim Fees"
          isOpen={openTab === "claim"}
          onToggle={() => toggleTab("claim")}
        >
          <Button
            onClick={handleClaimFees}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            disabled={!address}
          >
            {!address ? "Connect Wallet to Claim" : "Claim Fees"}
          </Button>
        </ExpandableTab>
      </div>
    </div>
  );
}
