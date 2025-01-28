"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/Button";

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
  address: string;
  name: string | null;
  symbol: string | null;
}

interface AirdropDetails {
  id: string;
  title: string;
  token: Token;
  conditions: Condition[];
}

export default function ClaimPage() {
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

  useEffect(() => {
    const fetchAirdropDetails = async () => {
      try {
        const response = await fetch(`http://localhost:8080/airdrop/${id}`, {
          headers: {
            "x-api-key": process.env.NEYNAR_API_KEY || "",
            "X-Authenticated-User": address || "",
            "Content-Type": "application/json",
          },
        });

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

    if (address) {
      fetchAirdropDetails();
    }
  }, [id, address]);

  const handleVerifyClaim = async () => {
    if (!airdropDetails?.id || !airdropDetails.conditions[0]) return;

    setVerifyLoading(true);
    setVerificationError(null);

    try {
      // First verify the Farcaster condition
      const condition = airdropDetails.conditions[0];
      const verifyResponse = await fetch("/api/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fid: "884823", // Temporary hardcoded FID
          tokenName: "silvag",
          validFrom: condition.metadata.validFrom,
          validTo: condition.metadata.validTo,
        }),
      });

      const verifyData = await verifyResponse.json();

      if (!verifyData.eligible) {
        setVerificationError(
          "You are not eligible for this claim. Please make sure you have posted about this token on Farcaster within the specified time period."
        );
        return;
      }

      console.log("Verify data:", verifyData);

      console.log(airdropDetails.id);

      // If eligible, proceed with the airdrop verification
      const response = await fetch(
        `http://localhost:8080/airdrop/verify?id=${airdropDetails.id}`,
        {
          method: "GET",
          headers: {
            "x-api-key": process.env.FRONTEND_API_KEY || "",
            "X-Authenticated-User": address || "",
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Airdrop verification failed");
      }

      const data = await response.json();
      console.log("Verification Response:", data);
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
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{airdropDetails.title}</h1>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Token Details</h2>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p>Address: {airdropDetails.token.address}</p>
          <p>Name: {airdropDetails.token.name || "N/A"}</p>
          <p>Symbol: {airdropDetails.token.symbol || "N/A"}</p>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Conditions</h2>
        {airdropDetails.conditions.map((condition, index) => (
          <div key={index} className="bg-gray-50 p-4 rounded-lg mb-4">
            <p>Type: {condition.type}</p>
            <p>Farcaster Username: {condition.metadata.farcasterUsername}</p>
            <p>Token Name: {condition.metadata.tokenName}</p>
            <p>
              Valid From:{" "}
              {new Date(condition.metadata.validFrom).toLocaleDateString()}
            </p>
            <p>
              Valid To:{" "}
              {new Date(condition.metadata.validTo).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        {verificationError && (
          <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg">
            {verificationError}
          </div>
        )}
        <Button
          onClick={handleVerifyClaim}
          disabled={verifyLoading || !address}
          className="w-full"
        >
          {verifyLoading ? "Verifying..." : "Verify & Claim"}
        </Button>
      </div>
    </div>
  );
}
