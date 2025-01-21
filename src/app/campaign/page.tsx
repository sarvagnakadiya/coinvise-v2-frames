"use client";

import { Button } from "@/components/ui/Button";

export default function Campaign() {
  const handleCreateCampaign = () => {
    console.log("Creating campaign");
  };
  return (
    <div>
      <h1>Campaign Page</h1>
      <p>Welcome to the campaign page!</p>
      <Button onClick={() => handleCreateCampaign()}>Create Campaign</Button>
    </div>
  );
}
