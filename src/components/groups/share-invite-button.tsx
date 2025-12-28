"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";

interface ShareInviteButtonProps {
  inviteCode: string;
}

export function ShareInviteButton({ inviteCode }: ShareInviteButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const inviteLink = `${window.location.origin}/groups/join/${inviteCode}`;
    
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <Button onClick={handleShare} variant="outline">
      {copied ? "Copied!" : "Share Invite"}
    </Button>
  );
}

