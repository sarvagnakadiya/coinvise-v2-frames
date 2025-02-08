import { NextResponse } from "next/server";
import axios from "axios";
import { ethers } from "ethers";

// Constants for signature generation
const DOMAIN_NAME = "Campaigns";
const DOMAIN_VERSION = "1.0";
const CLAIM_TYPE = {
  Claim: [
    { name: "campaignManager", type: "address" },
    { name: "campaignId", type: "uint256" },
    { name: "claimer", type: "address" },
  ],
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      fid,
      tokenName,
      validFrom,
      validTo,
      airdropId,
      authenticatedUserAddress,
      checkYap,
    } = body;
    console.log("Received request:", body);

    // Check and log each missing parameter
    const missingParams = [];
    if (checkYap) {
      if (!fid) missingParams.push("fid");
      if (!tokenName) missingParams.push("tokenName");
      // if (!validFrom) missingParams.push("validFrom");
      // if (!validTo) missingParams.push("validTo");
    }
    if (!airdropId) missingParams.push("airdropId");
    if (!authenticatedUserAddress)
      missingParams.push("authenticatedUserAddress");

    if (missingParams.length > 0) {
      console.log("Missing parameters:", missingParams);
      return NextResponse.json(
        { error: `Missing required parameters: ${missingParams.join(", ")}` },
        { status: 400 }
      );
    }

    // If checkYap is false, directly generate and return signature
    if (!checkYap) {
      const wallet = new ethers.Wallet(process.env.TRUSTED_SIGNER_PRIVATE_KEY!);
      const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 8453);

      const domain = {
        name: DOMAIN_NAME,
        version: DOMAIN_VERSION,
        chainId: chainId,
        verifyingContract: process.env.NEXT_PUBLIC_CAMPAIGN_CONTRACT_ADDRESS,
      };

      const message = {
        campaignManager: process.env.NEXT_PUBLIC_CAMPAIGN_MANAGER_ADDRESS,
        campaignId: airdropId,
        claimer: authenticatedUserAddress,
      };

      // Sign the typed data
      const signature = await wallet.signTypedData(domain, CLAIM_TYPE, message);
      const sig = ethers.Signature.from(signature);

      return NextResponse.json({
        eligible: true,
        v: sig.v,
        r: sig.r,
        s: sig.s,
      });
    }

    // If checkYap is true, proceed with the existing yap verification logic
    console.log("fid", fid);
    // Fetch user's casts from Neynar API
    const response = await axios.get(
      `https://api.neynar.com/v2/farcaster/feed/user/casts?fid=${fid}&limit=100&include_replies=true`,
      {
        headers: {
          accept: "application/json",
          "x-api-key": process.env.NEYNAR_API_KEY,
        },
      }
    );

    // Parse the dates
    const validFromDate = new Date(validFrom);
    const validToDate = new Date(validTo);
    const lowerTokenName = tokenName.toLowerCase();

    // Check if any cast meets the conditions
    for (const cast of response.data.casts) {
      const castTime = new Date(cast.timestamp);
      const isWithinTimeRange =
        castTime >= validFromDate && castTime <= validToDate;

      // Check if the cast text contains token creation with the specified name
      const text = cast.text.toLowerCase();

      if (isWithinTimeRange && text.includes(lowerTokenName)) {
        console.log("Valid cast found", text);

        // Generate signature for the claim
        const wallet = new ethers.Wallet(
          process.env.TRUSTED_SIGNER_PRIVATE_KEY!
        );
        const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 8453);

        const domain = {
          name: DOMAIN_NAME,
          version: DOMAIN_VERSION,
          chainId: chainId,
          verifyingContract: process.env.NEXT_PUBLIC_CAMPAIGN_CONTRACT_ADDRESS,
        };

        const message = {
          campaignManager: process.env.NEXT_PUBLIC_CAMPAIGN_MANAGER_ADDRESS,
          campaignId: airdropId,
          claimer: authenticatedUserAddress,
        };

        // Sign the typed data
        const signature = await wallet.signTypedData(
          domain,
          CLAIM_TYPE,
          message
        );
        const sig = ethers.Signature.from(signature);
        console.log("the sig", sig);
        return NextResponse.json({
          eligible: true,

          v: sig.v,
          r: sig.r,
          s: sig.s,
        });
      }
    }

    // If no valid cast found
    console.log("No valid cast found");
    return NextResponse.json({ eligible: false });
  } catch (error) {
    console.error("Error checking Farcaster token yap:", error);
    return NextResponse.json(
      { error: "Failed to verify Farcaster activity" },
      { status: 500 }
    );
  }
}
