import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fid, tokenName, validFrom, validTo } = body;
    console.log("Received request:", body);
    // Validate required parameters
    if (!fid || !tokenName || !validFrom || !validTo) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

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
        return NextResponse.json({ eligible: true });
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
