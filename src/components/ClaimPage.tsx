"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useAccount, useSendTransaction } from "wagmi";
import { Button } from "@/components/ui/Button";
import Image from "next/image";
import { ethers } from "ethers";
import campaign_abi from "@/lib/abi/CampaignsNativeGaslessClaim.json";
import sdk, { type Context } from "@farcaster/frame-sdk";
import { CalendarDays, CheckCircle2, AlertCircle } from "lucide-react";
import { formatDate } from "@/utils/date";
import { AirdropDetails } from "@/types/airdrop";
import { ConnectWalletModal } from "@/components/ui/ConnectWalletModal";
import { serverLog } from "@/utils/logging";

// Constants
const CONTRACT_ADDRESS = "0x542FfB7d78D78F957895891B6798B3d60e979b64";

export default function ClaimPage() {
  const [context, setContext] = useState<Context.FrameContext>();
  const { id } = useParams();
  const [airdropDetails, setAirdropDetails] = useState<AirdropDetails | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // const { data: session } = useSession();
  const { address, isConnected } = useAccount();
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(
    null
  );
  const { sendTransaction } = useSendTransaction();
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);

  useEffect(() => {
    const load = async () => {
      const context = await sdk.context;
      setContext(context);
      sdk.actions.ready({});
    };

    if (sdk && !isSDKLoaded) {
      setIsSDKLoaded(true);
      load();
    }

    // Return a cleanup function
    return () => {
      sdk.removeAllListeners();
    };
  }, [isSDKLoaded]);

  useEffect(() => {
    const fetchAirdropDetails = async () => {
      try {
        const response = await fetch(
          `https://api-staging.coinvise.co/airdrop/${id}`,
          {
            headers: {
              "x-api-key": process.env.NEYNAR_API_KEY || "",
              "X-Authenticated-User": address || "",
              "Content-Type": "application/json",
            },
          }
        );
        await serverLog("fetchAirdropDetails", {
          response,
        });
        if (!response.ok) throw new Error("Failed to fetch airdrop details");
        const data = await response.json();
        setAirdropDetails(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    };
    fetchAirdropDetails();
  }, [id, address]);

  useEffect(() => {
    setShowConnectModal(!address || !isConnected);
  }, [address, isConnected]);

  const handleClaimCampaign = useCallback(
    async (v: number, r: string, s: string) => {
      if (!airdropDetails?.txHash) return;

      const provider = new ethers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_BASE_RPC_URL || ""
      );
      const receipt = await provider.getTransactionReceipt(
        airdropDetails.txHash
      );
      if (!receipt) return;

      const filteredLog = receipt.logs.find(
        (log) =>
          log.topics[0] ===
          "0xfc5b9d1c2c1134048e1792e3ae27d4eee04f460d341711c7088000d2ca218621"
      );
      if (!filteredLog) return;

      const campaignManager = `0x${filteredLog.topics[1].slice(26)}`;
      const campaignId = parseInt(filteredLog.topics[2], 16);
      const referrer = "0x0000000000000000000000000000000000000000";

      const campaigns_cobj = new ethers.Contract(
        CONTRACT_ADDRESS,
        campaign_abi,
        provider
      );
      const data = campaigns_cobj.interface.encodeFunctionData("claim", [
        campaignManager,
        campaignId,
        r,
        s,
        v,
        referrer,
      ]) as `0x${string}`;

      sendTransaction({
        to: campaigns_cobj.target as `0x${string}`,
        data: data,
        value: BigInt(150000000000000),
      });
    },
    [sendTransaction, airdropDetails]
  );

  const handleVerifyClaim = async () => {
    if (!airdropDetails?.id || !airdropDetails.conditions[0]) return;
    setVerifyLoading(true);
    setVerificationError(null);

    try {
      const condition = airdropDetails.conditions[0];
      const verifyResponse = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fid: context?.user.fid,
          tokenName: condition.metadata.tokenName,
          validFrom: condition.metadata.validFrom,
          validTo: condition.metadata.validTo,
          airdropId: airdropDetails.id,
          authenticatedUserAddress: address,
        }),
      });

      const verifyData = await verifyResponse.json();
      if (!verifyData.eligible) {
        setVerificationError(
          "You are not eligible for this claim. Please make sure you have posted about this token on Farcaster within the specified time period."
        );
        return;
      }

      handleClaimCampaign(verifyData.v, verifyData.r, verifyData.s);
    } catch (err) {
      setVerificationError(
        err instanceof Error ? err.message : "Verification failed"
      );
    } finally {
      setVerifyLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-black">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error || !airdropDetails) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-black p-4">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <p className="text-gray-900 dark:text-white font-medium text-lg text-center">
          {error || "No airdrop details found"}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black pb-24">
      {/* Replace the existing modal with the new component */}
      <ConnectWalletModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
      />

      <div className="relative">
        {/* Cover Image */}
        <div className="relative w-full h-80">
          <Image
            src={airdropDetails.metadata.coverImage}
            alt="Cover"
            layout="fill"
            objectFit="cover"
            className="brightness-75"
          />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white dark:from-black to-transparent" />
        </div>

        {/* Token Info Card */}
        <div className="relative px-4 -mt-16">
          <div className="bg-white dark:bg-black rounded-2xl shadow-sm p-4 border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-4">
              {airdropDetails.token.imageUrl ? (
                <div className="w-16 h-16 rounded-full overflow-hidden ring-4 ring-white dark:ring-gray-800">
                  <Image
                    src={airdropDetails.token.imageUrl}
                    alt={airdropDetails.token.name || "Token"}
                    width={64}
                    height={64}
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center ring-4 ring-white dark:ring-gray-800">
                  <span className="text-2xl font-bold text-purple-600 dark:text-purple-300">
                    {(airdropDetails.token.symbol || "T")[0]}
                  </span>
                </div>
              )}
              <div className="flex-1">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                  {airdropDetails.title}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {airdropDetails.description}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Eligibility Steps */}
        <div className="px-4 mt-4 space-y-4">
          <div className="bg-white dark:bg-black rounded-2xl shadow-sm p-6 border border-gray-100 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              How to Claim
            </h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 dark:text-purple-300 font-semibold">
                    1
                  </span>
                </div>
                <div>
                  <p className="text-gray-700 dark:text-gray-200">
                    Post / Market / Yap about{" "}
                    <span className="font-medium">
                      {airdropDetails.conditions[0]?.metadata.tokenName}
                    </span>
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-500 dark:text-gray-400">
                    <CalendarDays className="h-4 w-4" />
                    <span>
                      {formatDate(
                        airdropDetails.conditions[0]?.metadata.validFrom
                      )}{" "}
                      -{" "}
                      {formatDate(
                        airdropDetails.conditions[0]?.metadata.validTo
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 dark:text-purple-300 font-semibold">
                    2
                  </span>
                </div>
                <div className="flex items-center">
                  <p className="text-gray-700 dark:text-gray-200">
                    Verify your post and claim tokens
                  </p>
                </div>
              </div>
            </div>
          </div>

          {verificationError && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-100 dark:border-red-800">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400">
                  {verificationError}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fixed Bottom Button - with higher z-index */}
      <div className="fixed bottom-0 inset-x-0 p-4 bg-white dark:bg-black border-t border-gray-100 dark:border-gray-800 z-40">
        <Button
          onClick={handleVerifyClaim}
          disabled={verifyLoading}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white py-6 rounded-xl font-medium text-lg flex items-center justify-center gap-2"
        >
          {verifyLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Verifying...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5" />
              <span>Verify & Claim</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
