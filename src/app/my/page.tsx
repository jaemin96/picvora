"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Camera, ImageIcon, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { LikeButton } from "@/components/features/like-button";

type CardSummary = {
  share_id: string;
  image_url: string | null;
  address: string | null;
  analysis: { shortcutMessage: string; mood: string };
};

type Tab = "my" | "liked";

export default function MyPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("my");
  const [myCards, setMyCards] = useState<CardSummary[]>([]);
  const [likedCards, setLikedCards] = useState<CardSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [myRes, likedRes] = await Promise.all([
          fetch("/api/cards?mine=true"),
          fetch("/api/my/liked"),
        ]);
        const myData = await myRes.json();
        const likedData = await likedRes.json();
        setMyCards(myData.cards ?? []);
        setLikedCards(likedData.cards ?? []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const cards = tab === "my" ? myCards : likedCards;

  return (
    <main className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.back()}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-1">
              <Camera className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold">마이페이지</span>
          </div>
        </div>

        {/* 탭 */}
        <div className="mx-auto flex max-w-2xl gap-0 px-4 pb-0">
          <button
            onClick={() => setTab("my")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === "my"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <ImageIcon className="h-4 w-4" />
            내 사진
            {myCards.length > 0 && (
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                {myCards.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("liked")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === "liked"
                ? "border-rose-500 text-rose-500"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Heart className="h-4 w-4" />
            좋아요
            {likedCards.length > 0 && (
              <span className="rounded-full bg-rose-500/10 px-1.5 py-0.5 text-xs text-rose-500">
                {likedCards.length}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : cards.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4 py-24 text-center"
          >
            <div className="rounded-full bg-muted p-5">
              {tab === "my" ? (
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              ) : (
                <Heart className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="font-semibold">
                {tab === "my" ? "아직 올린 사진이 없어요" : "좋아요한 사진이 없어요"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {tab === "my"
                  ? "갤러리에서 사진을 업로드해보세요"
                  : "갤러리에서 마음에 드는 사진에 좋아요를 눌러보세요"}
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={tab}
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
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <div className="absolute bottom-0 left-0 right-0 p-2.5 translate-y-1 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                      <p className="text-xs font-medium text-white line-clamp-2">
                        {card.analysis?.shortcutMessage}
                      </p>
                    </div>
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
    </main>
  );
}
