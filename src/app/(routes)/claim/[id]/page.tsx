import React from "react";
import { Metadata } from "next";
import ClaimPage from "@/components/ClaimPage";

type Params = Promise<{ id: string }>;

// Method 1: Using searchParams directly in a separate function

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const appUrl = process.env.NEXT_PUBLIC_URL
    ? `${process.env.NEXT_PUBLIC_URL}/claim/${id}`
    : "";

  // Fetch airdrop details
  const response = await fetch(
    `https://api-staging.coinvise.co/airdrop/${id}`,
    {
      headers: {
        "x-api-key": process.env.NEYNAR_API_KEY || "",
        "Content-Type": "application/json",
      },
    }
  );

  const airdropDetails = await response.json();
  const coverImage =
    airdropDetails?.metadata?.coverImage ||
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

function Page() {
  return <ClaimPage />;
}

export default Page;
