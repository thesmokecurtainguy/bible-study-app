"use client";

import { useState } from "react";
import { BiblePassageModal } from "./bible-passage-modal";
import { cn } from "@/lib/utils";

interface ScriptureLinkProps {
  reference: string;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Clickable scripture reference link that opens a modal with the passage
 */
export function ScriptureLink({
  reference,
  children,
  className,
}: ScriptureLinkProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsModalOpen(true);
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={cn(
          "text-blue-600 hover:text-blue-700 underline cursor-pointer",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded",
          className
        )}
        aria-label={`View ${reference} in Bible`}
      >
        {children || reference}
      </button>
      <BiblePassageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialReference={reference}
      />
    </>
  );
}

