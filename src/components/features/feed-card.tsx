"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Eye,
  MessageCircle,
  Share2,
  Download,
  MoreHorizontal,
  EyeOff,
  Flag,
  MapPin,
  ImageIcon,
  Check,
  Maximize2,
} from "lucide-react";
import { LikeButton } from "./like-button";
import { ImagePreviewModal } from "./image-preview-modal";

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

export function FeedCard({
  card,
  currentUserId,
  onHide,
}: {
  card: CardSummary;
  currentUserId: string | null;
  onHide?: (shareId: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isOwn = currentUserId === card.user_id;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/share/${card.share_id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const handleHide = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const hidden: string[] = JSON.parse(localStorage.getItem("hidden_cards") ?? "[]");
      if (!hidden.includes(card.share_id)) {
        localStorage.setItem("hidden_cards", JSON.stringify([...hidden, card.share_id]));
      }
    } catch {
      /* ignore */
    }
    setMenuOpen(false);
    onHide?.(card.share_id);
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!card.image_url) return;
    const toastId = toast.loading("다운로드 중...");
    try {
      const res = await fetch(card.image_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `picvora-${card.share_id}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("다운로드를 시작합니다", { id: toastId });
    } catch {
      toast.error("다운로드에 실패했습니다", { id: toastId });
      window.open(card.image_url, "_blank");
    }
  };

  const handleReport = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(false);
    toast.success("신고가 접수되었습니다. 검토 후 조치하겠습니다.");
  };

  const displayName = card.display_name || "사용자";
  const initial = displayName[0].toUpperCase();

  return (
    <>
    <article className="overflow-hidden rounded-2xl border border-border bg-card">
      {/* 카드 헤더 */}
      <div className="flex items-center justify-between px-4 py-3">
        <Link
          href={`/users/${card.user_id}`}
          className="flex min-w-0 items-center gap-2.5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-border">
            {card.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={card.avatar_url}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-violet-500 text-sm font-bold text-white">
                {initial}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{displayName}</p>
            {card.address && (
              <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" />
                {card.address}
              </p>
            )}
          </div>
        </Link>

        {/* 우측 메뉴 */}
        <div className="relative ml-2 shrink-0" ref={menuRef}>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-xl border border-border bg-background shadow-lg">
              {!isOwn && (
                <button
                  onClick={handleHide}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-muted"
                >
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                  이 사진 안 보기
                </button>
              )}
              {!isOwn && (
                <button
                  onClick={handleReport}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-500 transition-colors hover:bg-muted"
                >
                  <Flag className="h-4 w-4" />
                  신고하기
                </button>
              )}
              {isOwn && (
                <div className="px-4 py-2.5 text-xs text-muted-foreground">
                  내가 올린 사진입니다
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 이미지 + 텍스트 (클릭 → 상세 페이지) */}
      <Link href={`/cards/${card.share_id}`} className="group block">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {card.image_url ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={card.image_url}
                alt={card.analysis?.shortcutMessage ?? "사진"}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
              {/* 프리뷰 버튼 */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setPreviewOpen(true);
                }}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100 hover:bg-black/60"
                title="원본 보기"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <ImageIcon className="h-10 w-10 text-muted-foreground" />
            </div>
          )}
        </div>
        {card.analysis?.shortcutMessage && (
          <div className="px-4 pb-2 pt-3">
            <p className="line-clamp-2 text-sm font-medium text-foreground">
              {card.analysis.shortcutMessage}
            </p>
          </div>
        )}
      </Link>

      {/* 액션 바 */}
      <div className="flex items-center gap-1 border-t border-border/50 px-3 py-2.5">
        {/* 조회수 */}
        <div className="flex items-center gap-1 px-2 text-xs text-muted-foreground">
          <Eye className="h-3.5 w-3.5" />
          <span>{card.view_count ?? 0}</span>
        </div>

        {/* 좋아요 */}
        <LikeButton cardId={card.share_id} size="lg" />

        {/* 댓글 */}
        <Link
          href={`/cards/${card.share_id}#comments`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          <MessageCircle className="h-4 w-4" />
          {(card.comment_count ?? 0) > 0 && (
            <span className="text-xs font-medium">{card.comment_count}</span>
          )}
        </Link>

        <div className="flex-1" />

        {/* 공유 링크 복사 */}
        <button
          onClick={handleCopyLink}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm transition-colors ${
            copied
              ? "border-primary/40 bg-primary/5 text-primary"
              : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
          }`}
        >
          {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
          {copied && <span className="text-xs">복사됨</span>}
        </button>

        {/* 다운로드 */}
        {card.image_url && (
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            <Download className="h-4 w-4" />
          </button>
        )}
      </div>
    </article>

    {/* 이미지 프리뷰 모달 */}
    {previewOpen && card.image_url && (
      <ImagePreviewModal
        src={card.image_url}
        alt={card.analysis?.shortcutMessage ?? "사진"}
        onClose={() => setPreviewOpen(false)}
      />
    )}
  </>
  );
}
