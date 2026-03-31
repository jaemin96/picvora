"use client";

import { Plus, ImageIcon, LogOut, User, Loader2, Shield } from "lucide-react";
import Image from "next/image";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { UploadFlow } from "@/components/features/upload-flow";
import { FeedCard } from "@/components/features/feed-card";
import { LocationFilter, type LocationSelection } from "@/components/features/location-filter";
import { NotificationBell } from "@/components/features/notification-bell";
import { SearchBar } from "@/components/features/search-bar";
import { createClient } from "@/lib/supabase/client";
import { useInfiniteCards } from "@/hooks/use-infinite-cards";
import Link from "next/link";

type CardSummary = {
  share_id: string;
  image_url: string | null;
  address: string | null;
  analysis: { shortcutMessage: string; mood: string; tags: { label: string; type: string }[] } | null;
  view_count: number;
  comment_count: number;
  created_at: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
};

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showUpload, setShowUpload] = useState(false);

  const initialFilters = (() => {
    try { return JSON.parse(searchParams.get("filters") ?? "[]"); } catch { return []; }
  })();
  const initialFeed = (searchParams.get("feed") ?? "all") as "all" | "following";

  const [filters, setFilters] = useState<LocationSelection[]>(initialFilters);
  const [feed, setFeed] = useState<"all" | "following">(initialFeed);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [userId, setUserId] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const fetcher = useCallback(
    async (cursor: string | null, limit: number) => {
      const params = new URLSearchParams();
      if (filters.length > 0) params.set("filters", JSON.stringify(filters));
      if (feed !== "all") params.set("feed", feed);
      if (cursor) params.set("cursor", cursor);
      params.set("limit", String(limit));
      const res = await fetch(`/api/cards?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      return { cards: (data.cards ?? []) as CardSummary[], nextCursor: data.nextCursor ?? null };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters, feed]
  );

  const { cards: allCards, loading, loadingMore, sentinelRef, reset } = useInfiniteCards<CardSummary>(
    fetcher,
    [filters, feed]
  );

  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored: string[] = JSON.parse(localStorage.getItem("hidden_cards") ?? "[]");
      if (stored.length > 0) setHiddenIds(new Set(stored));
    } catch {
      /* ignore */
    }
  }, []);

  const cards = allCards.filter((c) => !hiddenIds.has(c.share_id));

  const handleHide = (shareId: string) => {
    setHiddenIds((prev) => new Set([...Array.from(prev), shareId]));
  };

  // Fetch user profile for avatar
  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.avatar_url) setAvatarUrl(data.avatar_url);
        if (data.display_name) setDisplayName(data.display_name);
        else if (data.email) setDisplayName(data.email);
        if (data.id) setUserId(data.id);
        if (data.role === "admin") setIsAdmin(true);
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

  const updateUrl = (newFilters: LocationSelection[], newFeed: "all" | "following") => {
    const params = new URLSearchParams();
    if (newFilters.length > 0) params.set("filters", JSON.stringify(newFilters));
    if (newFeed !== "all") params.set("feed", newFeed);
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : "/", { scroll: false });
  };

  const handleFilterChange = (selections: LocationSelection[]) => {
    setFilters(selections);
    updateUrl(selections, feed);
  };

  const handleFeedChange = (newFeed: "all" | "following") => {
    setFeed(newFeed);
    updateUrl(filters, newFeed);
  };

  const handlePublished = () => {
    setShowUpload(false);
    reset();
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <main className="flex min-h-screen flex-col">
      {/* 헤더 */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div className="flex items-center">
            <Image
              src="/picvora-logo-dark.svg"
              alt="Picvora"
              width={120}
              height={36}
              className="hidden dark:block"
              priority
            />
            <Image
              src="/picvora-logo-light.svg"
              alt="Picvora"
              width={120}
              height={36}
              className="block dark:hidden"
              priority
            />
          </div>
          <div className="flex items-center gap-2.5">
            <SearchBar />
            <button
              onClick={() => setShowUpload(true)}
              className="flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              새 사진
            </button>
            {userId && <NotificationBell userId={userId} />}
            <ThemeToggle />
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
                  {isAdmin && (
                    <>
                      <Link
                        href="/admin"
                        onClick={() => setShowMenu(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                      >
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        관리자 페이지
                      </Link>
                      <div className="border-b border-border" />
                    </>
                  )}
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

      {/* 탭 바 */}
      <div className="sticky top-[57px] z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl px-4">
          {(["all", "following"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => handleFeedChange(tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                feed === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "all" ? "전체" : "팔로잉"}
            </button>
          ))}
        </div>
      </div>

      {/* 필터 + 목록 */}
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <div className="mb-4">
          <LocationFilter onFilterChange={handleFilterChange} initialSelections={filters} />
        </div>
        {loading ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-border bg-card">
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="h-9 w-9 shrink-0 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-24 rounded bg-muted" />
                    <div className="h-2.5 w-36 rounded bg-muted" />
                  </div>
                </div>
                <div className="aspect-[4/3] bg-muted" />
                <div className="px-4 py-3">
                  <div className="h-3 w-3/4 rounded bg-muted" />
                </div>
                <div className="h-12 border-t border-border/50 bg-muted/20" />
              </div>
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
            {feed === "following" ? (
              <div>
                <p className="font-semibold">팔로잉하는 사람이 없어요</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  다른 사용자를 팔로우해보세요
                </p>
              </div>
            ) : (
              <>
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
              </>
            )}
          </motion.div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col gap-4"
            >
              {cards.map((card, i) => (
                <motion.div
                  key={card.share_id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.06, 0.4) }}
                >
                  <FeedCard card={card} currentUserId={userId} onHide={handleHide} />
                </motion.div>
              ))}
            </motion.div>
            {/* 무한 스크롤 sentinel */}
            <div ref={sentinelRef} className="h-1" />
            {loadingMore && (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </>
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

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}
