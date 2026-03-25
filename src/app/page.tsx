"use client";

import { Camera, Plus, ImageIcon, LogOut, User } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { UploadFlow } from "@/components/features/upload-flow";
import { LikeButton } from "@/components/features/like-button";
import { LocationFilter, type LocationSelection } from "@/components/features/location-filter";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type CardSummary = {
  share_id: string;
  image_url: string | null;
  address: string | null;
  analysis: { shortcutMessage: string; mood: string; tags: { label: string; type: string }[] };
  created_at: string;
};

export default function Home() {
  const router = useRouter();
  const [cards, setCards] = useState<CardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [filters, setFilters] = useState<LocationSelection[]>([]);

  const fetchCards = useCallback(async (selections?: LocationSelection[]) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selections && selections.length > 0) {
        params.set("filters", JSON.stringify(selections));
      }
      const qs = params.toString();
      const res = await fetch(`/api/cards${qs ? `?${qs}` : ""}`);
      const data = await res.json();
      setCards(data.cards ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const handleFilterChange = (selections: LocationSelection[]) => {
    setFilters(selections);
    fetchCards(selections);
  };

  const handlePublished = () => {
    setShowUpload(false);
    fetchCards(filters);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <main className="flex min-h-screen flex-col">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-primary/10 p-1.5">
              <Camera className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xl font-bold tracking-tight">Picvora</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              onClick={() => setShowUpload(true)}
              size="sm"
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              새 사진
            </Button>
            <Link href="/my">
              <Button size="sm" variant="ghost" className="text-muted-foreground">
                <User className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              onClick={handleLogout}
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* 필터 + 목록 */}
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <div className="mb-4">
          <LocationFilter onFilterChange={handleFilterChange} />
        </div>
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square animate-pulse rounded-2xl bg-muted"
              />
            ))}
          </div>
        ) : cards.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4 py-24 text-center"
          >
            <div className="rounded-full bg-muted p-5">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold">아직 사진이 없어요</p>
              <p className="mt-1 text-sm text-muted-foreground">
                첫 사진을 업로드해서 AI 분석을 받아보세요
              </p>
            </div>
            <Button onClick={() => setShowUpload(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              사진 업로드하기
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 gap-3 sm:grid-cols-3"
          >
            {cards.map((card, i) => (
              <motion.div
                key={card.share_id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link href={`/cards/${card.share_id}`} className="group block">
                  <div className="relative overflow-hidden rounded-2xl border border-border bg-muted aspect-square">
                    {card.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={card.image_url}
                        alt={card.analysis?.shortcutMessage ?? "사진"}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    {/* 오버레이 */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <div className="absolute bottom-0 left-0 right-0 p-2.5 translate-y-1 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                      <p className="text-xs font-medium text-white line-clamp-2">
                        {card.analysis?.shortcutMessage}
                      </p>
                    </div>
                    {/* 좋아요 버튼 */}
                    <div className="absolute right-2 top-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <LikeButton cardId={card.share_id} size="sm" />
                    </div>
                  </div>
                  {card.address && (
                    <p className="mt-1.5 truncate px-0.5 text-xs text-muted-foreground">
                      {card.address}
                    </p>
                  )}
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* 업로드 플로우 오버레이 */}
      <AnimatePresence>
        {showUpload && (
          <UploadFlow
            onClose={() => setShowUpload(false)}
            onPublished={handlePublished}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
