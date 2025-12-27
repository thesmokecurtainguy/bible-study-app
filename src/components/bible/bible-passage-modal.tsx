"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PassageDisplay } from "./passage-display";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getBibleGatewayUrl } from "@/lib/bible/bible-gateway";

/**
 * Capitalizes a scripture reference properly
 * Examples: "2 timothy 1:7" -> "2 Timothy 1:7", "john 3:16" -> "John 3:16"
 */
function capitalizeReference(ref: string): string {
  if (!ref) return ref;
  
  // Split by spaces and process each word
  return ref
    .split(/\s+/)
    .map((word) => {
      // If it's just a number, keep it as-is (e.g., "2" in "2 Timothy")
      if (/^\d+$/.test(word)) {
        return word;
      }
      
      // If it contains a colon (chapter:verse), keep numbers as-is
      if (word.includes(':')) {
        const [chapter, ...verseParts] = word.split(':');
        const verse = verseParts.join(':');
        // Chapter and verse are numbers, keep them as-is
        return `${chapter}:${verse}`;
      }
      
      // Regular word - capitalize first letter, lowercase the rest
      // Handles abbreviations like "Cor." or "Tim."
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

interface BiblePassageModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialReference: string;
}

interface PassageData {
  reference: string;
  passage: string | null;
  translation: string;
  source: "api" | "cache" | "fallback";
  bibleGatewayUrl: string;
  error?: string;
}

export function BiblePassageModal({
  isOpen,
  onClose,
  initialReference,
}: BiblePassageModalProps) {
  const [reference, setReference] = useState(initialReference);
  const [passageData, setPassageData] = useState<PassageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPassage = useCallback(async (ref: string) => {
    const trans = "ESV";
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/bible/passage?reference=${encodeURIComponent(ref)}&translation=${trans}`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch passage");
      }

      const data: PassageData = await response.json();
      console.log('Passage API response:', data);
      setPassageData(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load passage";
      setError(errorMessage);
      // Still set passage data with fallback URL
      setPassageData({
        reference: ref,
        passage: null,
        translation: "ESV",
        source: "fallback",
        bibleGatewayUrl: getBibleGatewayUrl(ref, "ESV"),
        error: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch passage when modal opens
  useEffect(() => {
    if (isOpen) {
      setReference(initialReference);
      fetchPassage(initialReference);
    }
  }, [isOpen, initialReference, fetchPassage]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-full max-h-[80vh] flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200">
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="text-xl font-semibold text-gray-900">
              {capitalizeReference(reference)}
            </DialogTitle>
            <span className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full">
              ESV
            </span>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <svg
                  className="w-8 h-8 animate-spin text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <p className="text-sm text-gray-500">Loading passage...</p>
              </div>
            </div>
          ) : error || !passageData?.passage ? (
            <div className="py-12 text-center">
              <div className="mb-4">
                <svg
                  className="w-12 h-12 mx-auto text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Couldn't load passage
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {error ||
                  "This translation is not available via API. Please use BibleGateway to view the passage."}
              </p>
              {passageData?.bibleGatewayUrl && (
                <a
                  href={passageData.bibleGatewayUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  Open in BibleGateway
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <PassageDisplay passage={passageData.passage!} />
              {passageData.translation === "ESV" && passageData.passage && (
                <div className="pt-4 mt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), 
                    copyright © 2001 by Crossway, a publishing ministry of Good News Publishers. 
                    Used by permission. All rights reserved.
                  </p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t border-gray-200">
          {passageData?.bibleGatewayUrl && (
            <div className="flex flex-col items-start gap-1 w-full">
              <a
                href={passageData.bibleGatewayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
              >
                Open in BibleGateway
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
              <span className="text-xs text-gray-500">View in other translations</span>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

