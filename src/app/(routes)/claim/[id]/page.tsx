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

  const frame = {
    version: "next",
    imageUrl: `${appUrl}/opengraph-image`,
    button: {
      title: "Launch Frame",
      action: {
        type: "launch_frame",
        name: "Coinvise Frames",
        url: appUrl,
        splashImageUrl: `https://cryptocurrencyjobs.co/startups/assets/logos/coinvise.jpg`,
        splashBackgroundColor: "#f7f7f7",
      },
    },
  };
  return {
    title: "Coinvise Frames",
    openGraph: {
      title: "Coinvise Frame",
      description: "Coinvise Frame",
    },
    other: {
      "fc:frame": JSON.stringify(frame),
    },
  };
}

function page({ params }: any) {
  return (
    <div>
      <ClaimPage />
    </div>
  );
}

export default page;
