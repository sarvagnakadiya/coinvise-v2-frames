"use client";

import { Button } from "@/components/ui/Button";
import { signOut } from "next-auth/react";
import { useCallback } from "react";
import { useRouter } from "next/navigation";

export default function Campaign() {
  const router = useRouter();

  const handleCreateCampaign = () => {
    console.log("Creating campaign");
  };

  const handleSignOut = useCallback(async () => {
    try {
      await signOut({ redirect: false });
      router.push("/");
    } catch (error) {
      console.error("Error signing out", error);
    }
  }, [router]);

  return (
    <div>
      <h1>Campaign Page</h1>
      <p>Welcome to the campaign page!</p>
      <Button onClick={handleCreateCampaign}>Create Campaign</Button>
      <Button onClick={handleSignOut}>Sign Out</Button>
    </div>
  );
}
