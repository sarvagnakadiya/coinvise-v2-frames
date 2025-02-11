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
import { X, Copy, Check } from "lucide-react";

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
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const initializeFrameSDK = async () => {
      try {
        if (!isSDKLoaded && sdk) {
          const context = await sdk.context;
          await sdk.actions.ready({});
          setIsSDKLoaded(true);
        }
      } catch (error) {
        console.error("Error initializing Frame SDK:", error);
        setError(
          "Failed to initialize Frame SDK. Please try refreshing the page."
        );
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

        if (!response.ok) {
          throw new Error(`API returned status: ${response.status}`);
        }

        const data = await response.json();
        console.log("responseeee", data);
        await serverLog("Token Data", { data });

        if (!data) {
          throw new Error("No token data received");
        }

        setTokenData(data);
        setError(null);
      } catch (error) {
        console.error("Error fetching token data:", error);
        setError("Failed to load token information. Please try again later.");
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
    if (!address) {
      setError("Please connect your wallet to claim fees");
      return;
    }

    setIsClaimingFees(true);
    setError(null);

    try {
      if (!process.env.NEXT_PUBLIC_BASE_RPC_URL) {
        throw new Error("RPC URL not configured");
      }

      const provider = new ethers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_BASE_RPC_URL
      );
      const signer = new ethers.JsonRpcSigner(provider, address);

      if (!tokenData.lpLockerAddress) {
        throw new Error("LP Locker address not found");
      }

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

      setError(null);
    } catch (error) {
      console.error("Error collecting fees:", error);
      setError("Failed to claim fees. Please try again later.");
    } finally {
      setIsClaimingFees(false);
    }
  }, [address, tokenData, isClaimingFees, sendTransaction]);

  const toggleTab = (tabName: string) => {
    setOpenTab(openTab === tabName ? null : tabName);
  };

  const formatAddress = (addr: string) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const addTokenToWallet = useCallback(async () => {
    try {
      // @ts-ignore - ethereum is available in window when metamask is installed
      const ethereum = window.ethereum;
      if (!ethereum) {
        throw new Error("MetaMask is not installed");
      }
      if (!tokenData) {
        throw new Error("Token data not available");
      }

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

      setError(null);
    } catch (error) {
      console.error("Error adding token to wallet:", error);
      setError(
        "Failed to add token to wallet. Please make sure MetaMask is installed and try again."
      );
    }
  }, [tokenAddress, tokenData]);

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(tokenAddress as string);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      setError("Failed to copy to clipboard");
    }
  }, [tokenAddress]);

  if (loading) {
    return (
      <div className="w-full min-h-screen max-w-[480px] mx-auto p-4 bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <p className="text-gray-600">Loading token information...</p>
        </div>
      </div>
    );
  }

  if (!tokenData) {
    return (
      <div className="w-full min-h-screen max-w-[480px] mx-auto p-4 bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No token information available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen max-w-[480px] mx-auto p-3 bg-gray-50 dark:bg-black">
      <ConnectWalletModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
      />

      {/* Error Popup */}
      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-[90%] max-w-[400px]">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-red-100 dark:border-red-900">
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-red-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Error
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {error}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="ml-4 inline-flex flex-shrink-0 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 focus:outline-none"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Token Info Card */}
      <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm p-4 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <Image
              src={tokenData.imageUrl}
              alt={tokenData.name}
              width={56}
              height={56}
              className="rounded-full border-2 border-gray-100 dark:border-gray-800 shadow-sm transition-transform hover:scale-105"
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">
                {tokenData.name}
              </h1>
              <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full text-xs font-medium uppercase">
                ${tokenData.symbol}
              </span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              {tokenData.description || "Token details"}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {/* <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
            {tokenData.description}
          </p> */}

          {/* <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 dark:bg-black rounded-lg">
            <div className="p-2 bg-white dark:bg-gray-950 rounded-lg shadow-sm">
              <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">
                Total Supply
              </p>
              <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                {Number(tokenData.tokenSupply).toLocaleString()}{" "}
                {tokenData.symbol}
              </p>
            </div>
            <div className="p-2 bg-white dark:bg-gray-950 rounded-lg shadow-sm">
              <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">
                Decimals
              </p>
              <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                {tokenData.decimals}
              </p>
            </div>
          </div> */}
          <div className="space-y-2 p-3 bg-gray-50 dark:bg-black rounded-lg">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide mb-1">
                Contract Address
              </p>
              <div className="flex items-center w-full max-w-md mx-auto bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden shadow-sm">
                <div className="flex-1 px-3 py-2 min-w-0 pr-0">
                  <span className="font-mono text-sm text-gray-800 dark:text-gray-200 break-all pr-2">
                    {tokenAddress}
                  </span>
                </div>
                <button
                  onClick={copyToClipboard}
                  className="px-3 py-2  hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border-l border-gray-200 dark:border-gray-800"
                  aria-label="Copy token address"
                >
                  {copied ? (
                    <Check className="h-5 w-5 text-green-500" />
                  ) : (
                    <Copy className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  )}
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <a
                  href={`https://basescan.org/address/${tokenAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors text-sm"
                >
                  <span className="text-blue-600 dark:text-blue-400">
                    Basescan
                  </span>
                  <svg
                    className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400"
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
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors text-sm"
                >
                  <span className="text-blue-600 dark:text-blue-400">
                    GeckoTerminal
                  </span>
                  <svg
                    className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400"
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
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors text-blue-600 dark:text-blue-400 text-sm font-medium"
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
              <div className="flex gap-2">
                <a
                  href={`https://uniframe.org/swap?chain=base&inputCurrency=NATIVE&outputCurrency=${tokenAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors text-sm"
                >
                  <span className="text-blue-600 dark:text-blue-400">
                    Buy on Uniframe 🦄
                  </span>
                  <svg
                    className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400"
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
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="space-y-3">
        {/* <ExpandableTab
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
        </ExpandableTab> */}
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

        {/* <ExpandableTab
          title="Claim Fees"
          isOpen={openTab === "claim"}
          onToggle={() => toggleTab("claim")}
        >
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-800 flex items-center">
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mr-2">
                    Owner Address
                  </span>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono text-gray-700 dark:text-gray-200 truncate">
                      {formatAddress(tokenData.user_addr)}
                    </p>
                    <button
                      onClick={copyToClipboard}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                      aria-label="Copy address"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={handleClaimFees}
              className="w-full group relative py-3 text-sm font-semibold text-white 
            bg-gradient-to-r from-indigo-600 to-blue-600 
            hover:from-indigo-700 hover:to-blue-700 
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
            rounded-lg transition-all duration-300 ease-in-out
            disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!address || isClaimingFees}
            >
              {!address ? (
                "Connect Wallet to Claim"
              ) : isClaimingFees ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white/80"></div>
                  <span className="opacity-80">Claiming Fees...</span>
                </div>
              ) : (
                <span className="group-hover:scale-105 transition-transform">
                  Claim Fees
                </span>
              )}

              <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-300 pointer-events-none" />
            </Button>
          </div>
        </ExpandableTab> */}
      </div>
    </div>
  );
}
