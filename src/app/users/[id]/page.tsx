"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ImageIcon, Eye, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { FollowButton } from "@/components/features/follow-button";
import { FollowListModal } from "@/components/features/follow-list-modal";

type CardSummary = {
  share_id: string;
  image_url: string | null;
  address: string | null;
  analysis: { shortcutMessage: string; mood: string };
  view_count: number;
  comment_count: number;
  created_at: string;
};

type UserProfile = {
  display_name: string | null;
  avatar_url: string | null;
};

function ProfileAvatar({ profile, size = 64 }: { profile: UserProfile; size?: number }) {
  const name = profile.display_name ?? "?";
  if (profile.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profile.avatar_url}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-violet-500 flex items-center justify-center text-white font-bold"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {name[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [cards, setCards] = useState<CardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [followInfo, setFollowInfo] = useState({ follower_count: 0, following_count: 0, is_following: false });
  const [followModal, setFollowModal] = useState<"followers" | "following" | null>(null);
  const [isMe, setIsMe] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/users/${userId}`)
      .then((res) => {
        if (res.status === 404) { setNotFound(true); return null; }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        setProfile(data.profile);
        setCards(data.cards ?? []);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));

    // 팔로우 정보 가져오기
    fetch(`/api/follows?userId=${userId}`)
      .then((r) => r.json())
      .then((d) => setFollowInfo({
        follower_count: d.follower_count ?? 0,
        following_count: d.following_count ?? 0,
        is_following: d.is_following ?? false,
      }))
      .catch(() => {});

    // 본인 확인
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => { if (d.id === userId) setIsMe(true); })
      .catch(() => {});
  }, [userId]);

  const displayName = profile?.display_name ?? "알 수 없는 사용자";

  if (notFound) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">존재하지 않는 사용자입니다.</p>
        <button
          onClick={() => router.back()}
          className="text-sm text-primary hover:underline"
        >
          돌아가기
        </button>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.back()}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="font-semibold truncate">{loading ? "..." : displayName}</span>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        {/* 프로필 섹션 */}
        {loading ? (
          <div className="flex items-center gap-4 mb-8">
            <div className="h-16 w-16 shrink-0 rounded-full bg-muted animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-32 rounded bg-muted animate-pulse" />
              <div className="h-3 w-20 rounded bg-muted animate-pulse" />
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-4">
              <ProfileAvatar profile={profile ?? { display_name: null, avatar_url: null }} size={64} />
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <p className="text-lg font-bold">{displayName}</p>
                  {!isMe && (
                    <FollowButton
                      targetUserId={userId}
                      isFollowing={followInfo.is_following}
                      onToggle={(followed) =>
                        setFollowInfo((prev) => ({
                          ...prev,
                          is_following: followed,
                          follower_count: prev.follower_count + (followed ? 1 : -1),
                        }))
                      }
                    />
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1.5 text-sm text-muted-foreground">
                  <span>사진 {cards.length}장</span>
                  <button
                    onClick={() => setFollowModal("followers")}
                    className="hover:text-foreground transition-colors"
                  >
                    <span className="font-semibold text-foreground">{followInfo.follower_count}</span> 팔로워
                  </button>
                  <button
                    onClick={() => setFollowModal("following")}
                    className="hover:text-foreground transition-colors"
                  >
                    <span className="font-semibold text-foreground">{followInfo.following_count}</span> 팔로잉
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* 사진 그리드 */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : cards.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-3 py-20 text-center"
          >
            <div className="rounded-full bg-muted p-5">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">아직 등록된 사진이 없어요</p>
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
                    {/* 호버 오버레이 */}
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
                    {/* 댓글 수 */}
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

      {/* 팔로워/팔로잉 모달 */}
      {followModal && (
        <FollowListModal
          userId={userId}
          type={followModal}
          onClose={() => setFollowModal(null)}
          onFollowChange={(action) =>
            setFollowInfo((prev) => ({
              ...prev,
              following_count: prev.following_count + (action === "followed" ? 1 : -1),
            }))
          }
        />
      )}
    </main>
  );
}
