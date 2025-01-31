import React from "react";
import { Metadata } from "next";
import TokenPage from "@/components/TokenPage";

type Params = Promise<{ tokenAddress: string }>;

// Method 1: Using searchParams directly in a separate function

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { tokenAddress } = await params;
  const appUrl = process.env.NEXT_PUBLIC_URL
    ? `${process.env.NEXT_PUBLIC_URL}/token/${tokenAddress}`
    : "";

  // Fetch airdrop details
  const response = await fetch(
    `https://api-staging.coinvise.co/token/8453/${tokenAddress}`,
    {
      headers: {
        "x-api-key": process.env.COINVISE_API_KEY || "",
        "X-Authenticated-User": tokenAddress || "",
        "Content-Type": "application/json",
      },
    }
  );

  const tokenDetails = await response.json();
  const coverImage =
    tokenDetails?.imageUrl ||
    "https://cryptocurrencyjobs.co/startups/assets/logos/coinvise.jpg";

  const frame = {
    version: "next",
    imageUrl: coverImage,
    button: {
      title: "Launch Frame",
      action: {
        type: "launch_frame",
        name: "Coinvise Frames",
        url: appUrl,
        splashImageUrl: coverImage,
        splashBackgroundColor: "#f7f7f7",
      },
    },
  };

  return {
    title: "Coinvise Frames",
    openGraph: {
      title: "Coinvise Frame",
      description: "Coinvise Frame",
      images: [coverImage],
    },
    other: {
      "fc:frame": JSON.stringify(frame),
    },
  };
}

function page({ params }: any) {
  return (
    <div>
      <TokenPage />
    </div>
  );
}

export default page;
