"use client";

import { Search, X, ImageIcon, User } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

type CardResult = {
  share_id: string;
  image_url: string | null;
  address: string | null;
  analysis: { shortcutMessage: string; tags: { label: string }[] };
};

type UserResult = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

export function SearchBar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cards, setCards] = useState<CardResult[]>([]);
  const [users, setUsers] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setCards([]);
      setUsers([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setCards(data.cards ?? []);
      setUsers(data.users ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setCards([]);
      setUsers([]);
    }
  }, [open]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const hasResults = cards.length > 0 || users.length > 0;
  const showDropdown = open && query.trim().length > 0;

  return (
    <div className="relative" ref={containerRef}>
      {/* 검색 아이콘 버튼 */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-muted"
          aria-label="검색"
        >
          <Search className="h-5 w-5 text-muted-foreground" />
        </button>
      )}

      {/* 검색 입력창 (열렸을 때) */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ width: 36, opacity: 0.5 }}
            animate={{ width: 220, opacity: 1 }}
            exit={{ width: 36, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="flex items-center gap-1.5 overflow-hidden rounded-full border border-border bg-muted/60 px-3"
            style={{ height: 36 }}
          >
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="태그, 장소, 사용자 검색"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button onClick={() => setQuery("")} className="shrink-0">
                <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 검색 결과 드롭다운 */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-72 overflow-hidden rounded-2xl border border-border bg-background shadow-xl"
          >
            {loading && (
              <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                검색 중...
              </div>
            )}

            {!loading && !hasResults && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                검색 결과가 없어요
              </div>
            )}

            {!loading && users.length > 0 && (
              <div>
                <p className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  사용자
                </p>
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setOpen(false);
                      router.push(`/users/${u.id}`);
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-muted"
                  >
                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                      {u.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-violet-500 text-white text-xs font-bold">
                          {(u.display_name || "U")[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{u.display_name ?? "사용자"}</p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        프로필 보기
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!loading && cards.length > 0 && (
              <div>
                <p className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  사진
                </p>
                <div className="grid grid-cols-3 gap-1 px-3 pb-3">
                  {cards.slice(0, 9).map((card) => (
                    <button
                      key={card.share_id}
                      onClick={() => {
                        setOpen(false);
                        router.push(`/cards/${card.share_id}`);
                      }}
                      className="group relative aspect-square overflow-hidden rounded-lg bg-muted"
                    >
                      {card.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={card.image_url}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      {/* 태그 표시 (호버) */}
                      {card.analysis?.tags?.length > 0 && (
                        <div className="absolute inset-0 flex flex-wrap items-end gap-0.5 bg-black/40 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                          {card.analysis.tags.slice(0, 2).map((t, i) => (
                            <span key={i} className="rounded bg-black/50 px-1 py-0.5 text-[9px] text-white">
                              #{t.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* 주소 결과는 카드 아래에 텍스트로 */}
                {cards.some((c) => c.address?.toLowerCase().includes(query.toLowerCase())) && (
                  <div className="border-t border-border pb-2">
                    {cards
                      .filter((c) => c.address?.toLowerCase().includes(query.toLowerCase()))
                      .slice(0, 3)
                      .map((card) => (
                        <button
                          key={`addr-${card.share_id}`}
                          onClick={() => {
                            setOpen(false);
                            router.push(`/cards/${card.share_id}`);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-muted"
                        >
                          <div className="h-7 w-7 shrink-0 overflow-hidden rounded-md bg-muted">
                            {card.image_url && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={card.image_url} alt="" className="h-full w-full object-cover" />
                            )}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">{card.address}</p>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
