"use client";

import { Camera, Plus, ImageIcon, LogOut, User, Eye, MessageCircle } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
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
  view_count: number;
  comment_count: number;
  created_at: string;
};

export default function Home() {
  const router = useRouter();
  const [cards, setCards] = useState<CardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [filters, setFilters] = useState<LocationSelection[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const fetchCards = useCallback(async (selections?: LocationSelection[]) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selections && selections.length > 0) {
        params.set("filters", JSON.stringify(selections));
      }
      const qs = params.toString();
      const res = await fetch(`/api/cards${qs ? `?${qs}` : ""}`, { cache: "no-store" });
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

  // Fetch user profile for avatar
  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.avatar_url) setAvatarUrl(data.avatar_url);
        if (data.display_name) setDisplayName(data.display_name);
        else if (data.email) setDisplayName(data.email);
      })
      .catch(() => {});
  }, []);

  // Close menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowUpload(true)}
              className="flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              새 사진
            </button>
            <div className="relative flex items-center" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border-2 border-border transition-all hover:border-primary/60"
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt="프로필"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-violet-500 text-white text-sm font-bold">
                    {(displayName || "U")[0].toUpperCase()}
                  </div>
                )}
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-2 w-40 overflow-hidden rounded-xl border border-border bg-background shadow-lg">
                  <Link
                    href="/my"
                    onClick={() => setShowMenu(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                  >
                    <User className="h-4 w-4 text-muted-foreground" />
                    마이페이지
                  </Link>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      handleLogout();
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-muted transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    로그아웃
                  </button>
                </div>
              )}
            </div>
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
                    {/* 조회수 */}
                    <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/30 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                      <Eye className="h-3 w-3" />
                      {card.view_count ?? 0}
                    </div>
                    {/* 좋아요 */}
                    <div className="absolute right-2 top-2">
                      <LikeButton cardId={card.share_id} size="sm" />
                    </div>
                    {/* 댓글 수 (우하단) */}
                    {(card.comment_count ?? 0) > 0 && (
                      <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/30 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                        <MessageCircle className="h-3 w-3" />
                        {card.comment_count}
                      </div>
                    )}
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
