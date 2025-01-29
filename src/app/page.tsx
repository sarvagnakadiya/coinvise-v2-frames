import { Metadata } from "next";
import Login from "../components/Login";

const appUrl = process.env.NEXT_PUBLIC_URL;

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

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
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

export default function Home() {
  return <Login />;
}
