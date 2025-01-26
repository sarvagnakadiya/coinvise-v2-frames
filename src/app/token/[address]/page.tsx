"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/solid";
import { Button } from "@/components/ui/Button";
import Image from "next/image";
import { useAccount } from "wagmi";
import LPLockerABI from "@/lib/abi/LPLocker.json";
import { ethers } from "ethers";

interface TokenData {
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  tokenSupply: string;
  decimals: number;
  lpLockerAddress: string;
}

interface TabProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

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

const ExpandableTab = ({ title, isOpen, onToggle, children }: TabProps) => (
  <div className="w-full max-w-[600px] mb-4 border rounded-lg overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full p-4 flex justify-between items-center bg-gray-50 hover:bg-gray-100"
    >
      <span className="font-medium">{title}</span>
      {isOpen ? (
        <ChevronUpIcon className="h-5 w-5" />
      ) : (
        <ChevronDownIcon className="h-5 w-5" />
      )}
    </button>
    {isOpen && <div className="p-4">{children}</div>}
  </div>
);

export default function TokenPage() {
  const params = useParams();
  const tokenAddress = params.address as string;
  const [openTab, setOpenTab] = useState<string | null>(null);
  const { address } = useAccount();
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTokenData = async () => {
      try {
        const response = await fetch(
          `https://api-staging.coinvise.co/token/8453/${tokenAddress}`,
          {
            headers: {
              "x-api-key": process.env.NEXT_PUBLIC_COINVISE_API_KEY!,
              "X-Authenticated-User":
                "0x97861976283e6901b407D1e217B72c4007D9F64D",
              "Content-Type": "application/json",
            },
          }
        );
        const data = await response.json();
        setTokenData(data);
      } catch (error) {
        console.error("Error fetching token data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTokenData();
  }, [tokenAddress]);

  if (loading || !tokenData) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
  const signer = new ethers.JsonRpcSigner(provider, address as string);

  const collectFees = async () => {
    const LockerInstance = new ethers.Contract(
      tokenData.lpLockerAddress,
      LPLockerABI,
      signer
    );
    const tokenId = await LockerInstance.tokenId();
    serverLog("Token ID", { tokenId: tokenId.toString() });

    try {
      if (!address || !tokenId) {
        // toast.error("Please connect your wallet first");
        return;
      }

      const hash = await LockerInstance.collectFees(address, tokenId);

      await serverLog("Transaction sent", { hash });

      //   toast.success("Transaction submitted", {
      //     description: "Your claim transaction has been submitted",
      //     action: {
      //       label: "View Transaction",
      //       onClick: () =>
      //         window.open(`https://basescan.org/tx/${hash}`, "_blank"),
      //     },
      //   });
    } catch (error) {
      console.error("Error collecting fees:", error);
      //   toast.error("Failed to collect fees", {
      //     description:
      //       error instanceof Error ? error.message : "Unknown error occurred",
      //   });
    }
  };

  const toggleTab = (tabName: string) => {
    setOpenTab(openTab === tabName ? null : tabName);
  };

  return (
    <div className="container mx-auto p-4">
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
              <a
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
              </a>
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
          title="Claim Fees"
          isOpen={openTab === "claim"}
          onToggle={() => toggleTab("claim")}
        >
          <Button
            onClick={collectFees}
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
