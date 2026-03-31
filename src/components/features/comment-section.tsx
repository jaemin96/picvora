"use client";

import { useState, useEffect, useRef } from "react";
import {
  Heart,
  MessageCircle,
  Reply,
  Trash2,
  ShieldBan,
  ChevronDown,
  ChevronUp,
  Send,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import Link from "next/link";

type Profile = { display_name: string | null; avatar_url: string | null };

type Comment = {
  id: string;
  card_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  like_count: number;
  created_at: string;
  profiles: Profile | null;
  liked: boolean;
};

function Avatar({ profile, size = 28 }: { profile: Profile | null; size?: number }) {
  const name = profile?.display_name ?? "?";
  if (profile?.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profile.avatar_url}
        alt={name}
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="shrink-0 rounded-full bg-violet-500 flex items-center justify-center text-white font-bold"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {name[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

function timeAgo(dateStr: string) {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ko });
}

function CommentItem({
  comment,
  ownerId,
  currentUserId,
  blockedIds,
  onDelete,
  onLike,
  onBlock,
  onReply,
  replies,
  depth,
}: {
  comment: Comment;
  ownerId: string;
  currentUserId: string | null;
  blockedIds: string[];
  onDelete: (id: string) => void;
  onLike: (id: string) => void;
  onBlock: (userId: string) => void;
  onReply: (parentId: string, parentAuthor: string) => void;
  replies: Comment[];
  depth: number;
}) {
  const [showReplies, setShowReplies] = useState(true);
  const isOwner = comment.user_id === ownerId;
  const isMine = comment.user_id === currentUserId;
  const isBlocked = blockedIds.includes(comment.user_id);
  const authorName = comment.profiles?.display_name ?? "익명";

  if (isBlocked) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground italic">
        <ShieldBan className="h-3 w-3 shrink-0" />
        <span>차단된 사용자의 댓글입니다.</span>
        <button onClick={() => onBlock(comment.user_id)} className="underline hover:text-foreground">
          차단 해제
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* 댓글 본체 */}
      <div className={`flex gap-2.5 py-2.5 ${depth > 0 ? "pl-8" : ""}`}>
        <Avatar profile={comment.profiles} size={depth > 0 ? 22 : 28} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
            <Link
              href={isMine ? "/my" : `/users/${comment.user_id}`}
              className="text-xs font-semibold truncate hover:underline"
            >
              {authorName}
            </Link>
            {isOwner && (
              <span className="inline-flex rounded-full bg-primary/10 px-1.5 py-px text-[9px] font-bold text-primary leading-tight whitespace-nowrap">
                작성자
              </span>
            )}
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {timeAgo(comment.created_at)}
            </span>
          </div>
          <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{comment.content}</p>
          <div className="mt-1.5 flex items-center gap-3">
            <button
              onClick={() => onLike(comment.id)}
              className={`flex items-center gap-1 text-[11px] transition-colors ${
                comment.liked ? "text-rose-500" : "text-muted-foreground hover:text-rose-500"
              }`}
            >
              <Heart className={`h-3 w-3 ${comment.liked ? "fill-rose-500" : ""}`} />
              {comment.like_count > 0 && <span>{comment.like_count}</span>}
            </button>
            {depth === 0 && currentUserId && (
              <button
                onClick={() => onReply(comment.id, authorName)}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <Reply className="h-3 w-3" />
                답글
              </button>
            )}
            {isMine && (
              <button
                onClick={() => onDelete(comment.id)}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-red-500 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
            {!isMine && currentUserId && (
              <button
                onClick={() => onBlock(comment.user_id)}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                title="이 사용자 댓글 숨기기"
              >
                <ShieldBan className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 대댓글 토글 버튼 */}
      {replies.length > 0 && depth === 0 && (
        <button
          onClick={() => setShowReplies((v) => !v)}
          className="ml-9 mb-1 flex items-center gap-1 text-[11px] text-primary hover:underline"
        >
          {showReplies ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          답글 {replies.length}개
        </button>
      )}

      {/* 대댓글 목록 — 부모와 같은 레벨, pl-8로 들여쓰기 */}
      {replies.length > 0 && depth === 0 && showReplies && (
        <div className="border-l-2 border-border/50 ml-3.5">
          {replies.map((r) => (
            <CommentItem
              key={r.id}
              comment={r}
              ownerId={ownerId}
              currentUserId={currentUserId}
              blockedIds={blockedIds}
              onDelete={onDelete}
              onLike={onLike}
              onBlock={onBlock}
              onReply={onReply}
              replies={[]}
              depth={1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 댓글 섹션 내부 콘텐츠 ────────────────────────────────────────────
function CommentContent({
  cardId,
  ownerId,
  currentUserId,
  onCountChange,
}: {
  cardId: string;
  ownerId: string;
  currentUserId: string | null;
  onCountChange?: (count: number) => void;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; author: string } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch(`/api/comments?cardId=${cardId}`)
      .then((r) => r.json())
      .then((d) => {
        setComments(d.comments ?? []);
        setBlockedIds(d.blockedIds ?? []);
        onCountChange?.((d.comments ?? []).length);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [cardId, onCountChange]);

  const roots = comments.filter((c) => !c.parent_id);
  const repliesOf = (id: string) => comments.filter((c) => c.parent_id === id);

  const handleReply = (parentId: string, parentAuthor: string) => {
    setReplyTo({ id: parentId, author: parentAuthor });
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleSubmit = async () => {
    if (!input.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId, content: input.trim(), parentId: replyTo?.id ?? null }),
      });
      const data = await res.json();
      if (data.comment) {
        setComments((prev) => {
          const next = [...prev, data.comment];
          onCountChange?.(next.length);
          return next;
        });
        setInput("");
        setReplyTo(null);
      }
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    await fetch("/api/comments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId }),
    });
    setComments((prev) => {
      const next = prev.filter((c) => c.id !== commentId && c.parent_id !== commentId);
      onCountChange?.(next.length);
      return next;
    });
  };

  const handleLike = async (commentId: string) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? { ...c, liked: !c.liked, like_count: c.liked ? c.like_count - 1 : c.like_count + 1 }
          : c
      )
    );
    try {
      await fetch("/api/comments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId }),
      });
    } catch {
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, liked: !c.liked, like_count: c.liked ? c.like_count - 1 : c.like_count + 1 }
            : c
        )
      );
    }
  };

  const handleBlock = async (userId: string) => {
    const res = await fetch("/api/comments/block", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockedId: userId }),
    });
    const data = await res.json();
    if (data.blocked) setBlockedIds((prev) => [...prev, userId]);
    else setBlockedIds((prev) => prev.filter((id) => id !== userId));
  };

  return (
    <div className="flex h-full flex-col">
      {/* 헤더 */}
      <div className="flex items-center gap-2 pb-3 border-b border-border shrink-0">
        <MessageCircle className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold">댓글 {comments.length}개</span>
      </div>

      {/* 댓글 목록 — 스크롤 */}
      <div className="flex-1 overflow-y-auto py-2 min-h-0">
        {loading ? (
          <div className="space-y-3 pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-2.5">
                <div className="h-7 w-7 shrink-0 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 w-24 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-full rounded bg-muted animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : roots.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">첫 댓글을 남겨보세요</p>
        ) : (
          <div className="divide-y divide-border/40">
            {roots.map((c) => (
              <CommentItem
                key={c.id}
                comment={c}
                ownerId={ownerId}
                currentUserId={currentUserId}
                blockedIds={blockedIds}
                onDelete={handleDelete}
                onLike={handleLike}
                onBlock={handleBlock}
                onReply={handleReply}
                replies={repliesOf(c.id)}
                depth={0}
              />
            ))}
          </div>
        )}
      </div>

      {/* 입력창 — 하단 고정 */}
      <div className="shrink-0 pt-3 border-t border-border">
        {currentUserId ? (
          <div className="rounded-xl border border-border bg-muted/40 p-3">
            {replyTo && (
              <div className="mb-2 flex items-center justify-between rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs">
                <span>
                  <span className="font-semibold text-primary">{replyTo.author}</span>
                  <span className="text-muted-foreground">에게 답글 작성 중</span>
                </span>
                <button
                  onClick={() => setReplyTo(null)}
                  className="text-muted-foreground hover:text-foreground text-[10px]"
                >
                  취소
                </button>
              </div>
            )}
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder={replyTo ? `${replyTo.author}에게 답글...` : "댓글을 입력하세요..."}
                rows={2}
                maxLength={500}
                className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <button
                onClick={handleSubmit}
                disabled={!input.trim() || submitting}
                className="shrink-0 rounded-full bg-primary p-1.5 text-primary-foreground disabled:opacity-40 transition-opacity"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-1 text-right text-[10px] text-muted-foreground">{input.length}/500</div>
          </div>
        ) : (
          <p className="text-center text-xs text-muted-foreground py-2">
            댓글을 작성하려면 로그인이 필요합니다
          </p>
        )}
      </div>
    </div>
  );
}

// ─── 외부에서 사용하는 CommentSection (패널 포함) ─────────────────────
export function CommentSection({
  cardId,
  ownerId,
  currentUserId,
  onCountChange,
  open,
  onClose,
}: {
  cardId: string;
  ownerId: string;
  currentUserId: string | null;
  onCountChange?: (count: number) => void;
  open: boolean;
  onClose: () => void;
}) {
  // 모바일: 하단 드로어 / 데스크탑: 우측 사이드 패널
  // 두 경우 모두 portal 없이 card-detail-client 레이아웃 내에서 처리
  return (
    <>
      {/* ── 모바일: 하단 슬라이드업 드로어 (md 미만) ── */}
      <div
        className={`
          md:hidden fixed inset-x-0 bottom-0 z-50
          transition-transform duration-300 ease-in-out
          ${open ? "translate-y-0" : "translate-y-full"}
        `}
      >
        {/* 딤 배경 */}
        {open && (
          <div
            className="fixed inset-0 bg-black/40 -z-10"
            onClick={onClose}
          />
        )}
        <div className="relative rounded-t-2xl border-t border-border bg-background px-4 pt-3 pb-6"
          style={{ maxHeight: "75dvh", display: "flex", flexDirection: "column" }}
        >
          {/* 핸들 */}
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border shrink-0" />
          <button
            onClick={onClose}
            className="absolute right-4 top-3 rounded-full p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex-1 min-h-0">
            <CommentContent
              cardId={cardId}
              ownerId={ownerId}
              currentUserId={currentUserId}
              onCountChange={onCountChange}
            />
          </div>
        </div>
      </div>

      {/* ── 데스크탑: 우측 고정 사이드 패널 (md 이상) ── */}
      <div
        className={`
          hidden md:flex fixed top-0 right-0 h-full z-40
          flex-col border-l border-border bg-background shadow-xl
          transition-transform duration-300 ease-in-out
          w-80
          ${open ? "translate-x-0" : "translate-x-full"}
        `}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <span className="font-semibold text-sm">댓글</span>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 min-h-0 px-4 py-2">
          <CommentContent
            cardId={cardId}
            ownerId={ownerId}
            currentUserId={currentUserId}
            onCountChange={onCountChange}
          />
        </div>
      </div>

      {/* 데스크탑 딤 배경 */}
      {open && (
        <div
          className="hidden md:block fixed inset-0 z-30"
          onClick={onClose}
        />
      )}
    </>
  );
}
