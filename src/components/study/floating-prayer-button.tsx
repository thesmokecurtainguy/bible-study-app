"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PrayerPanel } from "./prayer-panel";

interface Prayer {
  id: string;
  title: string;
  content: string;
  isAnswered: boolean;
  answeredAt: string | null;
  createdAt: string;
  groupId: string | null;
  group: { id: string; name: string } | null;
  study: { id: string; title: string } | null;
  user: { id: string; name: string | null };
}

interface FloatingPrayerButtonProps {
  studyId: string;
  groupId?: string;
  userId: string;
}

export function FloatingPrayerButton({
  studyId,
  groupId,
  userId,
}: FloatingPrayerButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "answered">("all");
  const [isLoading, setIsLoading] = useState(false);

  const fetchPrayers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/prayers?filter=${activeFilter}`);
      if (response.ok) {
        const data = await response.json();
        // Prioritize study-specific prayers, but include all user's prayers
        const allPrayers = data.prayers || [];
        const studyPrayers = allPrayers.filter((p: Prayer) => p.study?.id === studyId);
        const otherPrayers = allPrayers.filter((p: Prayer) => p.study?.id !== studyId);
        setPrayers([...studyPrayers, ...otherPrayers]);
      }
    } catch (error) {
      console.error("Error fetching prayers:", error);
    } finally {
      setIsLoading(false);
    }
  }, [activeFilter, studyId]);

  useEffect(() => {
    if (isOpen) {
      fetchPrayers();
    }
  }, [isOpen, fetchPrayers]);

  const activeCount = prayers.filter((p) => !p.isAnswered).length;

  return (
    <>
      {/* Floating Bubble Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`
          fixed bottom-6 right-6 z-50
          w-14 h-14 md:w-16 md:h-16
          rounded-full
          bg-blue-600 hover:bg-blue-700
          text-white
          shadow-lg hover:shadow-xl
          transition-all duration-200
          hover:scale-105
          flex items-center justify-center
          ${activeCount > 0 ? "animate-pulse" : ""}
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        `}
        aria-label="Prayer Requests"
      >
        <svg
          className="w-6 h-6 md:w-7 md:h-7"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
        {activeCount > 0 && (
          <Badge
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 border-2 border-white p-0 flex items-center justify-center text-xs font-bold"
          >
            {activeCount > 9 ? "9+" : activeCount}
          </Badge>
        )}
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-out Panel */}
      <div
        className={`
          fixed top-0 right-0 h-full z-50
          w-full sm:w-[400px]
          bg-white shadow-2xl
          transform transition-transform duration-300 ease-out
          ${isOpen ? "translate-x-0" : "translate-x-full"}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Panel Content */}
        <PrayerPanel
          prayers={prayers}
          isLoading={isLoading}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          onRefresh={fetchPrayers}
          studyId={studyId}
          groupId={groupId}
          currentUserId={userId}
        />
      </div>
    </>
  );
}

