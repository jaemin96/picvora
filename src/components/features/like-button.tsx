"use client";

import { useState, useEffect } from "react";
import { Heart } from "lucide-react";

export function LikeButton({
  cardId,
  size = "sm",
}: {
  cardId: string;
  size?: "sm" | "lg";
}) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/likes?cardId=${cardId}`)
      .then((r) => r.json())
      .then((d) => {
        setLiked(d.liked);
        setCount(d.count);
      })
      .catch(() => {});
  }, [cardId]);

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);

    // optimistic update
    setLiked((prev) => !prev);
    setCount((prev) => (liked ? prev - 1 : prev + 1));

    try {
      const res = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId }),
      });
      const data = await res.json();
      setLiked(data.liked);
    } catch {
      // rollback
      setLiked((prev) => !prev);
      setCount((prev) => (liked ? prev + 1 : prev - 1));
    } finally {
      setLoading(false);
    }
  };

  if (size === "lg") {
    return (
      <button
        onClick={toggle}
        className={`flex items-center gap-1.5 rounded-full border p-2 sm:px-4 sm:py-2 text-sm font-medium transition-colors ${
          liked
            ? "border-rose-300 bg-rose-50 text-rose-500 dark:border-rose-800 dark:bg-rose-950/30"
            : "border-border bg-background text-muted-foreground hover:border-rose-300 hover:text-rose-500"
        }`}
      >
        <Heart className={`h-4 w-4 ${liked ? "fill-rose-500 text-rose-500" : ""}`} />
        {count > 0
          ? <span className="text-xs font-medium">{count}</span>
          : <span className="hidden sm:inline">좋아요</span>
        }
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm transition-colors ${
        liked
          ? "bg-rose-500/40 text-white"
          : "bg-black/30 text-white hover:bg-black/50"
      }`}
    >
      <Heart className={`h-3 w-3 ${liked ? "fill-white" : ""}`} />
      {count > 0 && <span>{count}</span>}
    </button>
  );
}
