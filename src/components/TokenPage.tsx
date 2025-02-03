"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ExpandableTab } from "@/components/ui/ExpandableTab";
import Image from "next/image";
import { useAccount, useSendTransaction, usePublicClient } from "wagmi";
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
  const { sendTransaction } = useSendTransaction();
  const [isClaimingFees, setIsClaimingFees] = useState(false);
  const publicClient = usePublicClient();

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
    if (!tokenData || isClaimingFees) return;

    setIsClaimingFees(true);
    try {
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
      const data = LockerInstance.interface.encodeFunctionData("collectFees", [
        address,
        tokenId,
      ]) as `0x${string}`;

      await sendTransaction({
        to: LockerInstance.target as `0x${string}`,
        data: data,
      });
    } catch (error) {
      console.error("Error collecting fees:", error);
    } finally {
      setIsClaimingFees(false);
    }
  }, [address, tokenData, isClaimingFees, sendTransaction]);

  const toggleTab = (tabName: string) => {
    setOpenTab(openTab === tabName ? null : tabName);
  };

  const addTokenToWallet = useCallback(async () => {
    try {
      // @ts-ignore - ethereum is available in window when metamask is installed
      const ethereum = window.ethereum;
      if (!ethereum || !tokenData) return;

      await ethereum.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: tokenAddress as string,
            symbol: tokenData.symbol,
            decimals: tokenData.decimals,
            image: tokenData.imageUrl,
          },
        },
      });
    } catch (error) {
      console.error("Error adding token to wallet:", error);
    }
  }, [tokenAddress, tokenData]);

  if (loading || !tokenData) {
    return (
      <div className="w-full min-h-screen max-w-[480px] mx-auto p-4 bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <p className="text-gray-600">Loading token information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen max-w-[480px] mx-auto p-3 bg-gray-50">
      <ConnectWalletModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
      />

      {/* Token Info Card */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <Image
              src={tokenData.imageUrl}
              alt={tokenData.name}
              width={48}
              height={48}
              className="rounded-full ring-1 ring-purple-100"
            />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              {tokenData.name}
            </h1>
            <p className="text-gray-600 text-sm">{tokenData.symbol}</p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-gray-600 text-sm leading-relaxed">
            {tokenData.description}
          </p>
          <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <p className="text-gray-500 text-xs uppercase tracking-wide">
                Total Supply
              </p>
              <p className="font-medium text-sm">
                {Number(tokenData.tokenSupply).toLocaleString()}{" "}
                {tokenData.symbol}
              </p>
            </div>
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <p className="text-gray-500 text-xs uppercase tracking-wide">
                Decimals
              </p>
              <p className="font-medium text-sm">{tokenData.decimals}</p>
            </div>
          </div>
          <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">
                Contract Address
              </p>
              <p className="font-mono text-xs break-all bg-white p-2 rounded border border-gray-200">
                {tokenAddress}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <a
                  href={`https://basescan.org/address/${tokenAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm"
                >
                  <span className="text-blue-600">Basescan</span>
                  <svg
                    className="w-3.5 h-3.5 text-blue-600"
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
                <a
                  href={`https://www.geckoterminal.com/base/tokens/${tokenAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm"
                >
                  <span className="text-blue-600">GeckoTerminal</span>
                  <svg
                    className="w-3.5 h-3.5 text-blue-600"
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
              </div>
              <button
                onClick={addTokenToWallet}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-purple-600 text-sm font-medium"
              >
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
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Add to Wallet
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="space-y-3">
        <ExpandableTab
          title="Swap Tokens"
          isOpen={openTab === "swap"}
          onToggle={() => toggleTab("swap")}
        >
          <div className="h-[600px] w-full overflow-hidden rounded-lg shadow-sm">
            <iframe
              src={`https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=${tokenAddress}&chain=base`}
              height="100%"
              width="100%"
              className="border-0 rounded-lg"
            />
          </div>
        </ExpandableTab>

        <ExpandableTab
          title="Price Chart"
          isOpen={openTab === "priceChart"}
          onToggle={() => toggleTab("priceChart")}
        >
          <div className="h-[400px] w-full overflow-hidden rounded-lg shadow-sm">
            <iframe
              className="w-full h-full border-0"
              id="geckoterminal-embed"
              title="GeckoTerminal Embed"
              src={`https://www.geckoterminal.com/base/pools/${tokenAddress}?embed=1&info=0&swaps=0&grayscale=0&light_chart=0`}
              allow="clipboard-write"
            />
          </div>
        </ExpandableTab>

        <ExpandableTab
          title="Claim Fees"
          isOpen={openTab === "claim"}
          onToggle={() => toggleTab("claim")}
        >
          <Button
            onClick={handleClaimFees}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-sm py-2 relative overflow-hidden transition-all duration-200 disabled:opacity-70"
            disabled={!address || isClaimingFees}
          >
            {!address ? (
              "Connect Wallet to Claim"
            ) : isClaimingFees ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                <span>Claiming...</span>
              </div>
            ) : (
              "Claim Fees"
            )}
          </Button>
        </ExpandableTab>
      </div>
    </div>
  );
}
