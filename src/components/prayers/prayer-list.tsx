"use client";

import { useState, useEffect } from "react";
import { PrayerCard } from "./prayer-card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

interface Prayer {
  id: string;
  title: string;
  content: string;
  isAnswered: boolean;
  answeredAt: string | null;
  answeredNote: string | null;
  createdAt: string;
  groupId: string | null;
  group: { id: string; name: string } | null;
  study: { id: string; title: string } | null;
  user: { id: string; name: string | null };
}

interface PrayerListProps {
  initialPrayers: Prayer[];
  currentUserId: string;
}

export function PrayerList({ initialPrayers, currentUserId }: PrayerListProps) {
  const [prayers, setPrayers] = useState<Prayer[]>(initialPrayers);
  const [filter, setFilter] = useState<"all" | "active" | "answered">("all");
  const [isLoading, setIsLoading] = useState(false);

  const fetchPrayers = async (filterType: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/prayers?filter=${filterType}`);
      if (response.ok) {
        const data = await response.json();
        setPrayers(data.prayers || []);
      }
    } catch (error) {
      console.error("Error fetching prayers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrayers(filter);
  }, [filter]);

  const handleUpdate = () => {
    fetchPrayers(filter);
  };

  const activePrayers = prayers.filter((p) => !p.isAnswered);
  const answeredPrayers = prayers.filter((p) => p.isAnswered);

  return (
    <div className="space-y-6">
      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList>
          <TabsTrigger value="all">All ({prayers.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({activePrayers.length})</TabsTrigger>
          <TabsTrigger value="answered">Answered ({answeredPrayers.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : prayers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="text-4xl mb-4">🙏</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No prayers yet
                </h3>
                <p className="text-gray-500">
                  Start capturing your prayers as you study. God is listening!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {prayers.map((prayer) => (
                <PrayerCard
                  key={prayer.id}
                  prayer={prayer}
                  isOwner={prayer.user.id === currentUserId}
                  onUpdate={handleUpdate}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active" className="mt-6">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : activePrayers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="text-4xl mb-4">🎉</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  All prayers answered!
                </h3>
                <p className="text-gray-500">
                  What a testimony! God has been faithful.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {activePrayers.map((prayer) => (
                <PrayerCard
                  key={prayer.id}
                  prayer={prayer}
                  isOwner={prayer.user.id === currentUserId}
                  onUpdate={handleUpdate}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="answered" className="mt-6">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : answeredPrayers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="text-4xl mb-4">💪</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Keep praying!
                </h3>
                <p className="text-gray-500">
                  God hears every prayer. Keep trusting and praying.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {answeredPrayers.map((prayer) => (
                <PrayerCard
                  key={prayer.id}
                  prayer={prayer}
                  isOwner={prayer.user.id === currentUserId}
                  onUpdate={handleUpdate}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

