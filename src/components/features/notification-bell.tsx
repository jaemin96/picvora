"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Bell, Heart, MessageCircle, UserPlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import Link from "next/link";

type Notification = {
  id: string;
  type: "like" | "comment" | "follow" | "comment_like";
  card_id: string | null;
  comment_id: string | null;
  is_read: boolean;
  created_at: string;
  actor_id: string;
  actor: { display_name: string | null; avatar_url: string | null } | null;
  card_thumbnail: string | null;
};

const TYPE_META = {
  like: { icon: Heart, label: "님이 사진을 좋아합니다", iconClass: "text-red-500" },
  comment: { icon: MessageCircle, label: "님이 댓글을 남겼습니다", iconClass: "text-blue-500" },
  follow: { icon: UserPlus, label: "님이 팔로우했습니다", iconClass: "text-violet-500" },
  comment_like: { icon: Heart, label: "님이 댓글을 좋아합니다", iconClass: "text-pink-500" },
};

export function NotificationBell({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=30");
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unread_count ?? 0);
    } finally {
      setLoading(false);
    }
  }, []);

  // 최초 미읽음 수만 빠르게 가져오기
  useEffect(() => {
    fetch("/api/notifications?limit=1")
      .then((r) => r.json())
      .then((d) => setUnreadCount(d.unread_count ?? 0))
      .catch(() => {});
  }, []);

  // Supabase Realtime 구독
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          setUnreadCount((c) => c + 1);
          // 패널이 열려있으면 목록 새로고침
          setOpen((isOpen) => {
            if (isOpen) fetchNotifications();
            return isOpen;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchNotifications]);

  // 패널 열릴 때 목록 로드
  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  // 패널 열릴 때 전체 읽음 처리 (약간 딜레이)
  useEffect(() => {
    if (!open || unreadCount === 0) return;
    const timer = setTimeout(async () => {
      await fetch("/api/notifications", { method: "PATCH", body: JSON.stringify({}) });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }, 1500);
    return () => clearTimeout(timer);
  }, [open, unreadCount]);

  // 외부 클릭 닫기
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={panelRef}>
      {/* 벨 버튼 */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`relative flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
          open
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
        aria-label="알림"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* 알림 패널 */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-border bg-background shadow-xl">
          {/* 헤더 */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold">알림</span>
            <button
              onClick={() => setOpen(false)}
              className="rounded-full p-1 text-muted-foreground hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* 목록 */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col gap-2 p-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl p-2">
                    <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                      <div className="h-2.5 w-1/2 animate-pulse rounded bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">아직 알림이 없어요</p>
              </div>
            ) : (
              <div className="p-2">
                {notifications.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onClose={() => setOpen(false)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationItem({
  notification: n,
  onClose,
}: {
  notification: Notification;
  onClose: () => void;
}) {
  const meta = TYPE_META[n.type];
  const Icon = meta.icon;
  const actorName = n.actor?.display_name ?? "누군가";
  const isCommentType = n.type === "comment" || n.type === "comment_like";
  const href = n.card_id
    ? `/cards/${n.card_id}${isCommentType ? "?comments=1" : ""}`
    : n.actor_id
    ? `/users/${n.actor_id}`
    : "#";

  return (
    <Link
      href={href}
      onClick={onClose}
      className={`flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-muted ${
        !n.is_read ? "bg-primary/5" : ""
      }`}
    >
      {/* 아바타 + 타입 아이콘 */}
      <div className="relative shrink-0">
        {n.actor?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={n.actor.avatar_url}
            alt={actorName}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500 text-white text-xs font-bold">
            {actorName[0]?.toUpperCase() ?? "?"}
          </div>
        )}
        <span
          className={`absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-background ${meta.iconClass}`}
        >
          <Icon className="h-2.5 w-2.5" />
        </span>
      </div>

      {/* 텍스트 */}
      <div className="flex-1 min-w-0">
        <p className="text-xs leading-snug">
          <span className="font-semibold">{actorName}</span>
          <span className="text-muted-foreground">{meta.label}</span>
        </p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ko })}
        </p>
      </div>

      {/* 카드 썸네일 */}
      {n.card_thumbnail && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={n.card_thumbnail}
          alt=""
          className="h-10 w-10 shrink-0 rounded-lg object-cover"
        />
      )}

      {/* 미읽음 점 */}
      {!n.is_read && (
        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
      )}
    </Link>
  );
}
