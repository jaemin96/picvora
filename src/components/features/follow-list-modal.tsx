"use client";

import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

type FollowUser = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  is_following: boolean;
  is_me: boolean;
};

type FollowListModalProps = {
  userId: string;
  type: "followers" | "following";
  onClose: () => void;
  onFollowChange?: (action: "followed" | "unfollowed") => void;
};

export function FollowListModal({ userId, type, onClose, onFollowChange }: FollowListModalProps) {
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/follows/list?userId=${userId}&type=${type}`)
      .then((res) => res.json())
      .then((data) => setUsers(data.users ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId, type]);

  const handleToggleFollow = async (targetId: string) => {
    setTogglingId(targetId);
    try {
      const res = await fetch("/api/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: targetId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.action === "unfollowed" && type === "following") {
          setUsers((prev) => prev.filter((u) => u.id !== targetId));
        } else {
          setUsers((prev) =>
            prev.map((u) =>
              u.id === targetId ? { ...u, is_following: data.action === "followed" } : u
            )
          );
        }
        onFollowChange?.(data.action);
      }
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="mx-4 w-full max-w-md rounded-2xl border border-border bg-background shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 헤더 */}
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h3 className="text-base font-semibold">
              {type === "followers" ? "팔로워" : "팔로잉"}
            </h3>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* 리스트 */}
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : users.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                {type === "followers" ? "아직 팔로워가 없어요" : "아직 팔로잉하는 사람이 없어요"}
              </div>
            ) : (
              <div className="space-y-1">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted/50 transition-colors"
                  >
                    <Link href={u.is_me ? "/my" : `/users/${u.id}`} onClick={onClose} className="shrink-0">
                      {u.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={u.avatar_url}
                          alt={u.display_name ?? "user"}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500 text-white text-sm font-bold">
                          {(u.display_name ?? "?")[0]?.toUpperCase()}
                        </div>
                      )}
                    </Link>
                    <Link
                      href={u.is_me ? "/my" : `/users/${u.id}`}
                      onClick={onClose}
                      className="flex-1 min-w-0"
                    >
                      <p className="text-sm font-medium truncate">
                        {u.display_name ?? "알 수 없는 사용자"}
                      </p>
                    </Link>
                    {!u.is_me && (
                      <button
                        onClick={() => handleToggleFollow(u.id)}
                        disabled={togglingId === u.id}
                        className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                          type === "following"
                            ? "border border-border text-red-500 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-500/10"
                            : u.is_following
                              ? "border border-border text-muted-foreground hover:border-red-300 hover:text-red-500"
                              : "bg-primary text-primary-foreground hover:bg-primary/90"
                        }`}
                      >
                        {togglingId === u.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : type === "following" ? (
                          "언팔로우"
                        ) : u.is_following ? (
                          "팔로잉"
                        ) : (
                          "팔로우"
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
