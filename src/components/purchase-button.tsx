"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface PurchaseButtonProps {
  studyId: string;
  price: number;
}

export default function PurchaseButton({ studyId, price }: PurchaseButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePurchase = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ studyId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create checkout session");
        setIsLoading(false);
        return;
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("No checkout URL received");
        setIsLoading(false);
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  if (price === 0) {
    return (
      <Button className="w-full" size="lg" disabled>
        Free Study - Coming Soon
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}
      <Button
        className="w-full bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-500"
        size="lg"
        onClick={handlePurchase}
        isLoading={isLoading}
        disabled={isLoading}
      >
        {isLoading ? "Processing..." : "Purchase Now"}
      </Button>
    </div>
  );
}

