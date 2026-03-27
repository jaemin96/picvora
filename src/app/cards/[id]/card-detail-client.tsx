"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  Pencil,
  Trash2,
  RotateCcw,
  Eye,
  MessageCircle,
  Loader2,
  AlertTriangle,
  Globe,
  Users,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { ShareView } from "@/components/features/share-view";
import { LikeButton } from "@/components/features/like-button";
import { CommentSection } from "@/components/features/comment-section";
import { formatCount } from "@/lib/format";
import type { ExifData, PhotoAnalysis, Visibility } from "@/types";

const VISIBILITY_META: Record<Visibility, { label: string; icon: typeof Globe }> = {
  public: { label: "전체 공개", icon: Globe },
  followers: { label: "팔로워 공개", icon: Users },
  private: { label: "나만 보기", icon: Lock },
};

type CardData = {
  share_id: string;
  user_id: string;
  image_url: string | null;
  address: string | null;
  exif: ExifData | null;
  analysis: PhotoAnalysis;
  visibility?: Visibility;
  created_at: string;
  view_count?: number;
};

type AuthorProfile = {
  display_name: string | null;
  avatar_url: string | null;
};

function AuthorBadge({ userId, profile, isMe }: { userId: string; profile: AuthorProfile | null; isMe: boolean }) {
  const name = profile?.display_name ?? "알 수 없음";
  return (
    <Link
      href={isMe ? "/my" : `/users/${userId}`}
      className="flex items-center gap-2 group w-fit"
    >
      {profile?.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.avatar_url}
          alt={name}
          width={28}
          height={28}
          className="h-7 w-7 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="h-7 w-7 shrink-0 rounded-full bg-violet-500 flex items-center justify-center text-white text-xs font-bold">
          {name[0]?.toUpperCase() ?? "?"}
        </div>
      )}
      <span className="text-sm font-medium group-hover:underline">{name}</span>
    </Link>
  );
}

export function CardDetailClient({
  card,
  viewCount,
  commentCount,
  isOwner,
  isDeleted: initialIsDeleted,
  currentUserId,
  authorProfile,
}: {
  card: CardData;
  viewCount: number;
  commentCount: number;
  isOwner: boolean;
  isDeleted: boolean;
  currentUserId: string | null;
  authorProfile: AuthorProfile | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const didAutoOpen = useRef(false);
  const [showComments, setShowComments] = useState(false);
  const [liveCommentCount, setLiveCommentCount] = useState(commentCount);
  const [isDeleted, setIsDeleted] = useState(initialIsDeleted);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"soft-delete" | "permanent" | null>(null);
  const [currentVisibility, setCurrentVisibility] = useState<Visibility>(card.visibility ?? "public");
  const [showVisibilityMenu, setShowVisibilityMenu] = useState(false);

  const handleVisibilityChange = async (v: Visibility) => {
    setShowVisibilityMenu(false);
    if (v === currentVisibility) return;
    const prev = currentVisibility;
    setCurrentVisibility(v);
    try {
      const res = await fetch(`/api/cards/${card.share_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: v }),
      });
      if (!res.ok) setCurrentVisibility(prev);
    } catch {
      setCurrentVisibility(prev);
    }
  };

  // 최초 마운트 시 조회수 증가 (삭제된 카드는 제외)
  useEffect(() => {
    if (isDeleted) return;
    fetch("/api/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId: card.share_id }),
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ?comments=1 파라미터가 있으면 댓글 창 자동 오픈
  useEffect(() => {
    if (didAutoOpen.current) return;
    if (searchParams.get("comments") === "1") {
      didAutoOpen.current = true;
      setShowComments(true);
    }
  }, [searchParams]);

  const handleSoftDelete = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/cards/${card.share_id}`, { method: "DELETE" });
      if (res.ok) {
        setIsDeleted(true);
        setConfirmAction(null);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestore = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/cards/${card.share_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore" }),
      });
      if (res.ok) {
        setIsDeleted(false);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handlePermanentDelete = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/cards/${card.share_id}?permanent=true`, { method: "DELETE" });
      if (res.ok) {
        router.push("/my");
      }
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
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
              <span className="font-semibold">Picvora</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* 조회수 */}
            <div className="flex items-center gap-1.5 rounded-full border border-border p-2 text-muted-foreground">
              <Eye className="h-4 w-4" />
              <span className="text-xs font-medium">{formatCount(viewCount)}</span>
            </div>
            {/* 댓글 토글 버튼 */}
            <button
              onClick={() => setShowComments((v) => !v)}
              className={`flex items-center gap-1.5 rounded-full border p-2 transition-colors ${
                showComments
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <MessageCircle className="h-4 w-4" />
              {liveCommentCount > 0 && (
                <span className="text-xs font-medium">{liveCommentCount}</span>
              )}
            </button>
            {/* 좋아요 */}
            {!isDeleted && <LikeButton cardId={card.share_id} size="lg" />}
            {/* 수정 (작성자, 삭제되지 않은 경우) */}
            {isOwner && !isDeleted && (
              <Link
                href={`/cards/${card.share_id}/edit`}
                className="flex items-center gap-1.5 rounded-full border border-border p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Pencil className="h-4 w-4" />
                <span className="hidden sm:inline text-sm font-medium">수정</span>
              </Link>
            )}
            {/* 삭제 (작성자, 삭제되지 않은 경우) */}
            {isOwner && !isDeleted && (
              <button
                onClick={() => setConfirmAction("soft-delete")}
                className="flex items-center gap-1.5 rounded-full border border-red-200 p-2 text-red-500 hover:bg-red-50 dark:border-red-500/30 dark:hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline text-sm font-medium">삭제</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 삭제 대기 배너 */}
      {isDeleted && isOwner && (
        <div className="border-b border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <p className="text-sm font-medium">삭제 대기 중인 게시글입니다</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRestore}
                disabled={actionLoading}
                className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-foreground border border-border hover:bg-muted transition-colors disabled:opacity-50 dark:bg-background"
              >
                {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                복구
              </button>
              <button
                onClick={() => setConfirmAction("permanent")}
                disabled={actionLoading}
                className="flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                완전삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 카드 본문 */}
      <div className={`mx-auto w-full max-w-lg px-4 py-6 ${isDeleted ? "opacity-60" : ""}`}>
        {/* 작성자 + 공개범위 */}
        <div className="mb-4 flex items-center justify-between">
          <AuthorBadge userId={card.user_id} profile={authorProfile} isMe={isOwner} />
          {isOwner ? (
            <div className="relative">
              <button
                onClick={() => setShowVisibilityMenu((v) => !v)}
                className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                {(() => { const m = VISIBILITY_META[currentVisibility]; const Icon = m.icon; return <><Icon className="h-3.5 w-3.5" />{m.label}</>; })()}
              </button>
              {showVisibilityMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowVisibilityMenu(false)} />
                  <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-xl border border-border bg-background py-1 shadow-lg">
                    {(["public", "followers", "private"] as Visibility[]).map((v) => {
                      const m = VISIBILITY_META[v];
                      const Icon = m.icon;
                      return (
                        <button
                          key={v}
                          onClick={() => handleVisibilityChange(v)}
                          className={`flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-muted ${
                            currentVisibility === v ? "text-primary font-semibold" : "text-foreground"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          ) : currentVisibility !== "public" ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              {(() => { const m = VISIBILITY_META[currentVisibility]; const Icon = m.icon; return <><Icon className="h-3.5 w-3.5" />{m.label}</>; })()}
            </span>
          ) : null}
        </div>
        <ShareView card={card} />
      </div>

      {/* 댓글 패널 */}
      <CommentSection
        cardId={card.share_id}
        ownerId={card.user_id}
        currentUserId={currentUserId}
        onCountChange={setLiveCommentCount}
        open={showComments}
        onClose={() => setShowComments(false)}
      />

      {/* 확인 모달 */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-border bg-background p-6 shadow-xl">
            <h3 className="text-lg font-semibold">
              {confirmAction === "soft-delete" ? "게시글을 삭제할까요?" : "완전히 삭제할까요?"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {confirmAction === "soft-delete"
                ? "삭제 대기 상태로 변경됩니다. 마이페이지에서 복구하거나 완전히 삭제할 수 있어요."
                : "이 작업은 되돌릴 수 없습니다. 사진, 댓글, 좋아요가 모두 삭제됩니다."}
            </p>
            <div className="mt-5 flex gap-2 justify-end">
              <button
                onClick={() => setConfirmAction(null)}
                disabled={actionLoading}
                className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
              >
                취소
              </button>
              <button
                onClick={confirmAction === "soft-delete" ? handleSoftDelete : handlePermanentDelete}
                disabled={actionLoading}
                className="flex items-center gap-1.5 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {confirmAction === "soft-delete" ? "삭제" : "완전삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
