"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface AnswerPrayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  prayerId: string;
  onSuccess: () => void;
}

export function AnswerPrayerModal({
  isOpen,
  onClose,
  prayerId,
  onSuccess,
}: AnswerPrayerModalProps) {
  const [answeredNote, setAnsweredNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);

    try {
      const response = await fetch(`/api/prayers/${prayerId}/answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          answeredNote: answeredNote.trim() || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to mark prayer as answered");
      }

      setAnsweredNote("");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error marking prayer as answered:", error);
      alert(error instanceof Error ? error.message : "Failed to mark prayer as answered");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">🙏</span>
            Praise God!
          </DialogTitle>
          <DialogDescription>
            Mark this prayer request as answered. You can optionally share how God answered your prayer.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="answeredNote">How did God answer this prayer? (Optional)</Label>
            <Textarea
              id="answeredNote"
              value={answeredNote}
              onChange={(e) => setAnsweredNote(e.target.value)}
              placeholder="Share your testimony of how God answered..."
              rows={4}
              className="resize-none"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Marking..." : "Mark as Answered"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

