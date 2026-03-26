"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Camera, Pencil, Eye, MessageCircle } from "lucide-react";
import Link from "next/link";
import { ShareView } from "@/components/features/share-view";
import { LikeButton } from "@/components/features/like-button";
import { CommentSection } from "@/components/features/comment-section";
import { formatCount } from "@/lib/format";
import type { ExifData, PhotoAnalysis } from "@/types";

type CardData = {
  share_id: string;
  user_id: string;
  image_url: string | null;
  address: string | null;
  exif: ExifData | null;
  analysis: PhotoAnalysis;
  created_at: string;
  view_count?: number;
};

export function CardDetailClient({
  card,
  viewCount,
  commentCount,
  isOwner,
  currentUserId,
}: {
  card: CardData;
  viewCount: number;
  commentCount: number;
  isOwner: boolean;
  currentUserId: string | null;
}) {
  const [showComments, setShowComments] = useState(false);
  const [liveCommentCount, setLiveCommentCount] = useState(commentCount);

  // 최초 마운트 시 조회수 증가 (쿠키 없을 때만 Route Handler에서 처리)
  useEffect(() => {
    fetch("/api/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId: card.share_id }),
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="flex min-h-screen flex-col">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
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
            <LikeButton cardId={card.share_id} size="lg" />
            {/* 수정 (작성자) */}
            {isOwner && (
              <Link
                href={`/cards/${card.share_id}/edit`}
                className="flex items-center gap-1.5 rounded-full border border-border p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Pencil className="h-4 w-4" />
                <span className="hidden sm:inline text-sm font-medium">수정</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* 카드 본문 */}
      <div className="mx-auto w-full max-w-lg px-4 py-6">
        <ShareView card={card} />
      </div>

      {/* 댓글 패널 (모바일: 하단 드로어 / 데스크탑: 우측 사이드) */}
      <CommentSection
        cardId={card.share_id}
        ownerId={card.user_id}
        currentUserId={currentUserId}
        onCountChange={setLiveCommentCount}
        open={showComments}
        onClose={() => setShowComments(false)}
      />
    </main>
  );
}
