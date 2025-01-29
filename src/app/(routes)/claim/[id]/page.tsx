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

interface Condition {
  type: string;
  metadata: {
    farcasterUsername: string;
    tokenName: string;
    validFrom: string;
    validTo: string;
  };
}

interface Token {
  imageUrl: any;
  address: string;
  name: string | null;
  symbol: string | null;
}

interface AirdropDetails {
  id: string;
  title: string;
  token: Token;
  active: boolean;
  conditions: Condition[];
  txHash: string;
  coverImageUrl: string;
  imageUrl: string;
}

export default function ClaimPage() {
  const [context, setContext] = useState<Context.FrameContext>();
  const { id } = useParams();
  const [airdropDetails, setAirdropDetails] = useState<AirdropDetails | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();
  const { address, isConnected } = useAccount();
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(
    null
  );
  const {
    sendTransaction,
    data,
    error: sendTxError,
    isError: isSendTxError,
    isPending: isSendTxPending,
  } = useSendTransaction();
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const contractAddress = "0x542FfB7d78D78F957895891B6798B3d60e979b64";

  useEffect(() => {
    const load = async () => {
      const context = await sdk.context;
      setContext(context);
      console.log("Calling ready");
      sdk.actions.ready({});
    };
    if (sdk && !isSDKLoaded) {
      console.log("Calling load");
      setIsSDKLoaded(true);
      load();
      return () => {
        sdk.removeAllListeners();
      };
    }
  }, [context]);

  useEffect(() => {
    const fetchAirdropDetails = async () => {
      console.log("calling fetchAirdropDetails");
      try {
        const response = await fetch(
          `https://api-staging.coinvise.co/airdrop/${id}`,
          {
            headers: {
              "x-api-key": process.env.NEYNAR_API_KEY || "",
              "X-Authenticated-User":
                "0xE3ebcf8ef7AD377ece3AeABD25Ba09b2b8F2641B" || "",
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch airdrop details");
        }

        const data = await response.json();
        setAirdropDetails(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchAirdropDetails();
  }, [id]);

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

  const handleClaimCampaign = useCallback(
    async (v: number, r: string, s: string) => {
      console.log("calling handleClaimCampaign...", v, r, s);
      if (!airdropDetails?.txHash) {
        console.error("Transaction hash is missing");
        return;
      }

      const provider = new ethers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_BASE_RPC_URL || ""
      );

      console.log("hash:", airdropDetails.txHash);

      const receipt = await provider.getTransactionReceipt(
        airdropDetails.txHash
      );
      console.log(receipt);

      if (!receipt) {
        console.error("Transaction receipt not found");
        return;
      }

      const filteredLog = receipt.logs.find(
        (log) =>
          log.topics[0] ===
          "0xfc5b9d1c2c1134048e1792e3ae27d4eee04f460d341711c7088000d2ca218621"
      );

      console.log("filteredLog", filteredLog);

      if (!filteredLog) {
        console.error("Relevant log not found");
        return;
      }

      // Extract campaignManager and campaignId from topics
      const campaignManager = `0x${filteredLog.topics[1].slice(26)}`; // Extract address from topic
      const campaignId = parseInt(filteredLog.topics[2], 16); // Convert hex to number

      await serverLog("campaignManager:", campaignManager);
      await serverLog("campaignId:", campaignId);

      const referrer = "0x0000000000000000000000000000000000000000";
      const campaigns_cobj = new ethers.Contract(
        contractAddress,
        campaign_abi,
        provider
      );

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
    },
    [sendTransaction, address, airdropDetails]
  );

  const handleVerifyClaim = async () => {
    if (!airdropDetails?.id || !airdropDetails.conditions[0]) return;

    setVerifyLoading(true);
    setVerificationError(null);

    try {
      // First verify the Farcaster condition
      const condition = airdropDetails.conditions[0];
      await serverLog("checking for", context?.user.fid);
      const verifyResponse = await fetch("/api/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fid: context?.user.fid,
          // fid: "884823", // Temporary hardcoded FID
          tokenName: condition.metadata.tokenName,
          validFrom: condition.metadata.validFrom,
          validTo: condition.metadata.validTo,
          airdropId: airdropDetails.id,
          authenticatedUserAddress: address,
        }),
      });

      const verifyData = await verifyResponse.json();

      console.log("verifyData", verifyData);

      if (!verifyData.eligible) {
        setVerificationError(
          "You are not eligible for this claim. Please make sure you have posted about this token on Farcaster within the specified time period."
        );
        return;
      }

      console.log("Verify data:", verifyData);
      // Call handleClaimCampaign with V, R, S from verifyData
      handleClaimCampaign(verifyData.v, verifyData.r, verifyData.s);
    } catch (err) {
      console.error("Verification error:", err);
      setVerificationError(
        err instanceof Error ? err.message : "Verification failed"
      );
    } finally {
      setVerifyLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!airdropDetails) {
    return <div>No airdrop details found</div>;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header Section */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-100 px-4 py-3 z-10">
        <h1 className="text-lg font-semibold text-gray-900 text-center">
          Claim Airdrop
        </h1>
      </div>

      {/* Main Content - with padding for fixed header */}
      <div className="pt-16 pb-24 px-4 max-w-md mx-auto">
        {loading ? (
          <div className="flex items-center justify-center h-[60vh]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : error ? (
          <div className="text-red-500 text-center mt-8">{error}</div>
        ) : (
          airdropDetails && (
            <>
              {/* Campaign Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
                <div className="flex items-center gap-4 mb-4">
                  {airdropDetails.token.imageUrl ? (
                    <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
                      <Image
                        src={airdropDetails.token.imageUrl}
                        alt={airdropDetails.token.name || "Token"}
                        width={64}
                        height={64}
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl font-bold text-purple-600">
                        {(airdropDetails.token.symbol || "T")[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {airdropDetails.title}
                    </h2>
                    <p className="text-sm text-gray-600">
                      {airdropDetails.token.symbol} Token Airdrop
                    </p>
                  </div>
                </div>
              </div>

              {/* Eligibility Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  How to Claim
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-sm text-purple-600 font-medium">
                        1
                      </span>
                    </div>
                    <div>
                      <p className="text-gray-700">
                        Post about{" "}
                        <span className="font-semibold">
                          {airdropDetails.conditions[0]?.metadata.tokenName}
                        </span>{" "}
                        on your Farcaster timeline between{" "}
                        <span className="text-gray-600">
                          {new Date(
                            airdropDetails.conditions[0]?.metadata.validFrom
                          ).toLocaleDateString()}{" "}
                          -{" "}
                          {new Date(
                            airdropDetails.conditions[0]?.metadata.validTo
                          ).toLocaleDateString()}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-sm text-purple-600 font-medium">
                        2
                      </span>
                    </div>
                    <p className="text-gray-700">
                      Verify your post and claim your tokens
                    </p>
                  </div>
                </div>
              </div>

              {/* Verification Status */}
              {verificationError && (
                <div className="mb-6 p-4 bg-red-50 rounded-xl border border-red-100">
                  <p className="text-red-600 text-sm">{verificationError}</p>
                </div>
              )}
            </>
          )
        )}
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100">
        <Button
          onClick={handleVerifyClaim}
          disabled={verifyLoading}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-medium"
        >
          {verifyLoading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Verifying...
            </div>
          ) : (
            "Verify & Claim"
          )}
        </Button>
      </div>
    </div>
  );
}
