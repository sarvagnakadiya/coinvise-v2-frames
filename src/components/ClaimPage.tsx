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
import {
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { formatDate } from "@/utils/date";
import { AirdropDetails } from "@/types/airdrop";
import { ConnectWalletModal } from "@/components/ui/ConnectWalletModal";
import { serverLog } from "@/utils/logging";

// Constants
// const CONTRACT_ADDRESS = "0x542FfB7d78D78F957895891B6798B3d60e979b64";
const CONTRACT_ADDRESS = "0xf482f26F43459186a8E17A08a2FbBDf07C7aBc66";

export default function ClaimPage() {
  const [context, setContext] = useState<Context.FrameContext>();
  const { id, slug } = useParams();
  const [airdropDetails, setAirdropDetails] = useState<AirdropDetails | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { address, isConnected } = useAccount();
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(
    null
  );
  const { sendTransaction } = useSendTransaction();
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [isEligible, setIsEligible] = useState<boolean | null>(null);
  const [signature, setSignature] = useState<{
    v: number;
    r: string;
    s: string;
  } | null>(null);

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
          `https://api-staging.coinvise.co/airdrop/${slug}`,
          {
            headers: {
              "x-api-key": process.env.NEYNAR_API_KEY || "",
              "X-Authenticated-User": address || "",
              "Content-Type": "application/json",
            },
          }
        );
        if (!response.ok) throw new Error("Failed to fetch airdrop details");
        const data = await response.json();
        await serverLog("fetchAirdropDetails", {
          data,
        });
        setAirdropDetails(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    };
    fetchAirdropDetails();
  }, [id, slug, address]);

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
        id,
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
      const verifyResponse = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fid: context?.user.fid,
          tokenName: airdropDetails.token.name,
          validFrom: airdropDetails.conditions[0]?.metadata.validFrom,
          validTo: airdropDetails.conditions[0]?.metadata.validTo,
          airdropId: id,
          authenticatedUserAddress: address,
          checkYap: airdropDetails.conditions[0]?.type !== "FARCASTER_FOLLOW",
        }),
      });

      const verifyData = await verifyResponse.json();
      setIsEligible(verifyData.eligible);

      if (!verifyData.eligible) {
        setVerificationError(
          "You are not eligible for this claim. Please make sure you have posted about this token on Farcaster within the specified time period."
        );
        return;
      }

      // Store signature for later use
      setSignature({
        v: verifyData.v,
        r: verifyData.r,
        s: verifyData.s,
      });
    } catch (err) {
      setVerificationError(
        err instanceof Error ? err.message : "Verification failed"
      );
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleClaim = useCallback(() => {
    if (!signature) return;
    handleClaimCampaign(signature.v, signature.r, signature.s);
  }, [signature, handleClaimCampaign]);

  const openWarpcastUrl = useCallback(() => {
    const text = encodeURIComponent(`${airdropDetails?.token.name}`);
    const embedUrl = encodeURIComponent(
      `${process.env.NEXT_PUBLIC_URL}/token/${airdropDetails?.token.address}`
    );
    sdk.actions.openUrl(
      `https://warpcast.com/~/compose?text=${text}&embeds[]=${embedUrl}`
    );
  }, [airdropDetails?.token.name, airdropDetails?.token.address]);

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
      {/* Add a container div to constrain width */}
      <div className="max-w-lg mx-auto relative">
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
                    {airdropDetails.conditions[0]?.type ===
                    "FARCASTER_FOLLOW" ? (
                      <div className="space-y-4">
                        <p className="text-gray-700 dark:text-gray-200">
                          Follow these accounts on Farcaster
                        </p>

                        <div className="flex flex-col gap-2">
                          <Button
                            className="bg-purple-100 hover:bg-purple-200 dark:bg-purple-900 dark:hover:bg-purple-800 text-purple-700 dark:text-purple-300 px-4 py-2 rounded-lg flex items-center gap-2"
                            onClick={() =>
                              sdk.actions.openUrl(
                                "https://warpcast.com/coinvise"
                              )
                            }
                          >
                            Follow @coinvise
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            className="bg-purple-100 hover:bg-purple-200 dark:bg-purple-900 dark:hover:bg-purple-800 text-purple-700 dark:text-purple-300 px-4 py-2 rounded-lg flex items-center gap-2"
                            onClick={() =>
                              sdk.actions.openUrl(
                                "https://warpcast.com/earnkit"
                              )
                            }
                          >
                            Follow @Earnkit
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          {/* <Button
                            className="bg-purple-100 hover:bg-purple-200 dark:bg-purple-900 dark:hover:bg-purple-800 text-purple-700 dark:text-purple-300 px-4 py-2 rounded-lg flex items-center gap-2"
                            onClick={() =>
                              sdk.actions.viewProfile({ fid: 372043 })
                            }
                          >
                            Follow @coinvise
                          </Button>
                          <Button
                            className="bg-purple-100 hover:bg-purple-200 dark:bg-purple-900 dark:hover:bg-purple-800 text-purple-700 dark:text-purple-300 px-4 py-2 rounded-lg flex items-center gap-2"
                            onClick={() =>
                              sdk.actions.viewProfile({ fid: 881415 })
                            }
                          >
                            Follow @earnkit
                          </Button> */}
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-gray-700 dark:text-gray-200">
                          Post / Market / Yap about{" "}
                          <span className="font-medium">
                            {airdropDetails.token.name}
                          </span>
                        </p>
                        <div className="mt-4">
                          <Button
                            onClick={openWarpcastUrl}
                            className="bg-purple-100 hover:bg-purple-200 dark:bg-purple-900 dark:hover:bg-purple-800 text-purple-700 dark:text-purple-300 px-4 py-2 rounded-lg flex items-center gap-2"
                          >
                            Yap
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
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
                      </>
                    )}
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

        {/* Update the fixed bottom button to respect max width */}
        <div className="fixed bottom-0 inset-x-0 p-4 bg-white dark:bg-black border-t border-gray-100 dark:border-gray-800 z-40">
          <div className="max-w-lg mx-auto">
            {isEligible && (
              <div className="mb-3 flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                <span>You are eligible to claim!</span>
              </div>
            )}
            <Button
              onClick={isEligible ? handleClaim : handleVerifyClaim}
              disabled={verifyLoading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white py-6 rounded-xl font-medium text-lg flex items-center justify-center gap-2"
            >
              {verifyLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : isEligible ? (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  <span>Claim Tokens</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  <span>Verify to Claim</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
