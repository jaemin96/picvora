"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  ImageIcon,
  Heart,
  Pencil,
  Check,
  X,
  Eye,
  EyeOff,
  Loader2,
  Trash2,
  RotateCcw,
  AlertTriangle,
  Globe,
  Users,
  Lock,
} from "lucide-react";
import { motion } from "framer-motion";
import { LikeButton } from "@/components/features/like-button";
import { ImageCropEditor } from "@/components/features/image-crop-editor";
import { FollowListModal } from "@/components/features/follow-list-modal";

import type { Visibility } from "@/types";

const VISIBILITY_ICON: Record<Visibility, typeof Globe> = {
  public: Globe,
  followers: Users,
  private: Lock,
};

type CardSummary = {
  share_id: string;
  image_url: string | null;
  address: string | null;
  analysis: { shortcutMessage: string; mood: string };
  deleted_at: string | null;
  visibility?: Visibility;
};

type Profile = {
  id: string;
  email: string;
  display_name: string;
  username: string;
  avatar_url: string;
};

type Tab = "my" | "liked";

export default function MyPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("my");
  const [myCards, setMyCards] = useState<CardSummary[]>([]);
  const [likedCards, setLikedCards] = useState<CardSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile state
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    display_name: "",
    username: "",
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [cropPreviewUrl, setCropPreviewUrl] = useState<string | null>(null);
  const [followCounts, setFollowCounts] = useState({ follower_count: 0, following_count: 0 });
  const [followModal, setFollowModal] = useState<"followers" | "following" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [myRes, likedRes, profileRes] = await Promise.all([
          fetch("/api/cards?mine=true&include_deleted=true"),
          fetch("/api/my/liked"),
          fetch("/api/profile"),
        ]);
        const myData = await myRes.json();
        const likedData = await likedRes.json();
        const profileData = await profileRes.json();
        setMyCards(myData.cards ?? []);
        setLikedCards(likedData.cards ?? []);
        if (profileRes.ok) {
          setProfile(profileData);
          setForm({
            display_name: profileData.display_name ?? "",
            username: profileData.username ?? "",
            email: profileData.email ?? "",
            password: "",
          });
          // 팔로워/팔로잉 카운트 가져오기
          fetch(`/api/follows?userId=${profileData.id}`)
            .then((r) => r.json())
            .then((d) => setFollowCounts({ follower_count: d.follower_count ?? 0, following_count: d.following_count ?? 0 }))
            .catch(() => {});
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const body: Record<string, string> = {};
      if (form.display_name !== profile?.display_name) body.display_name = form.display_name;
      if (form.username !== profile?.username) body.username = form.username;
      if (form.email !== profile?.email) body.email = form.email;
      if (form.password) body.password = form.password;

      if (Object.keys(body).length === 0) {
        setEditing(false);
        return;
      }

      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "저장에 실패했습니다" });
        return;
      }

      setProfile(data);
      setForm((prev) => ({ ...prev, password: "" }));
      setEditing(false);
      setMessage({ type: "success", text: "프로필이 저장되었습니다" });
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: "error", text: "저장에 실패했습니다" });
    } finally {
      setSaving(false);
    }
  };

  // 파일 선택 → 크롭 UI 열기
  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // 같은 파일 재선택 가능하도록 초기화
    e.target.value = "";
    const url = URL.createObjectURL(file);
    setCropPreviewUrl(url);
  };

  // 크롭 완료 → 서버 업로드
  const handleCropApply = useCallback(async (blob: Blob) => {
    setCropPreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    setUploadingAvatar(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("avatar", blob, "avatar.jpg");

      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "업로드에 실패했습니다" });
        return;
      }

      setProfile((prev) => (prev ? { ...prev, avatar_url: data.avatar_url } : prev));
      setMessage({ type: "success", text: "프로필 사진이 변경되었습니다" });
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: "error", text: "업로드에 실패했습니다" });
    } finally {
      setUploadingAvatar(false);
    }
  }, []);

  const handleCropCancel = useCallback(() => {
    setCropPreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
  }, []);

  const cancelEdit = () => {
    setEditing(false);
    setForm({
      display_name: profile?.display_name ?? "",
      username: profile?.username ?? "",
      email: profile?.email ?? "",
      password: "",
    });
    setMessage(null);
  };

  const [cardActionLoading, setCardActionLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleSoftDelete = async (shareId: string) => {
    setCardActionLoading(shareId);
    try {
      const res = await fetch(`/api/cards/${shareId}`, { method: "DELETE" });
      if (res.ok) {
        setMyCards((prev) =>
          prev.map((c) => c.share_id === shareId ? { ...c, deleted_at: new Date().toISOString() } : c)
        );
      }
    } finally {
      setCardActionLoading(null);
      setConfirmDelete(null);
    }
  };

  const handleRestore = async (shareId: string) => {
    setCardActionLoading(shareId);
    try {
      const res = await fetch(`/api/cards/${shareId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore" }),
      });
      if (res.ok) {
        setMyCards((prev) =>
          prev.map((c) => c.share_id === shareId ? { ...c, deleted_at: null } : c)
        );
      }
    } finally {
      setCardActionLoading(null);
    }
  };

  const handlePermanentDelete = async (shareId: string) => {
    setCardActionLoading(shareId);
    try {
      const res = await fetch(`/api/cards/${shareId}?permanent=true`, { method: "DELETE" });
      if (res.ok) {
        setMyCards((prev) => prev.filter((c) => c.share_id !== shareId));
      }
    } finally {
      setCardActionLoading(null);
      setConfirmDelete(null);
    }
  };

  const cards = tab === "my" ? myCards : likedCards;
  const activeCards = tab === "my" ? myCards.filter((c) => !c.deleted_at) : likedCards;

  return (
    <>
    {cropPreviewUrl && (
      <ImageCropEditor
        previewUrl={cropPreviewUrl}
        onApply={handleCropApply}
        onCancel={handleCropCancel}
      />
    )}
    <main className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
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
            <span className="font-semibold">마이페이지</span>
          </div>
        </div>
      </header>

      {/* 프로필 섹션 */}
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start gap-5">
            {/* 아바타 */}
            <div className="relative shrink-0">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="group relative h-20 w-20 overflow-hidden rounded-full border-2 border-border transition-colors hover:border-primary"
              >
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt="프로필"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-violet-500 text-white text-2xl font-bold">
                    {(profile?.display_name || profile?.email || "U")[0].toUpperCase()}
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  {uploadingAvatar ? (
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  ) : (
                    <Camera className="h-5 w-5 text-white" />
                  )}
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarFileSelect}
                className="hidden"
              />
            </div>

            {/* 프로필 정보 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold truncate">
                  {profile?.display_name || profile?.email?.split("@")[0] || "사용자"}
                </h2>
                {!editing ? (
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    편집
                  </button>
                ) : (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={cancelEdit}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {saving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      저장
                    </button>
                  </div>
                )}
              </div>

              {!editing ? (
                <div className="space-y-2 text-sm text-muted-foreground">
                  {profile?.username && (
                    <p>@{profile.username}</p>
                  )}
                  <p>{profile?.email}</p>
                  <div className="flex items-center gap-4 pt-1">
                    <button
                      onClick={() => setFollowModal("followers")}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      <span className="font-semibold text-foreground">{followCounts.follower_count}</span>
                      <span>팔로워</span>
                    </button>
                    <button
                      onClick={() => setFollowModal("following")}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      <span className="font-semibold text-foreground">{followCounts.following_count}</span>
                      <span>팔로잉</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      닉네임
                    </label>
                    <input
                      type="text"
                      value={form.display_name}
                      onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                      placeholder="닉네임을 입력하세요"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      사용자 이름
                    </label>
                    <input
                      type="text"
                      value={form.username}
                      onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                      placeholder="사용자 이름을 입력하세요"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      이메일
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="이메일을 입력하세요"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      새 비밀번호
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                        placeholder="변경할 비밀번호 (비워두면 유지)"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 메시지 */}
          {message && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-3 text-xs font-medium ${
                message.type === "success" ? "text-green-500" : "text-red-500"
              }`}
            >
              {message.text}
            </motion.p>
          )}
        </div>
      </div>

      {/* 탭 */}
      <div className="sticky top-[57px] z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl gap-0 px-4 pb-0">
          <button
            onClick={() => setTab("my")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === "my"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <ImageIcon className="h-4 w-4" />
            내 사진
            {activeCards.length > 0 && (
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                {activeCards.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("liked")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === "liked"
                ? "border-rose-500 text-rose-500"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Heart className="h-4 w-4" />
            좋아요
            {likedCards.length > 0 && (
              <span className="rounded-full bg-rose-500/10 px-1.5 py-0.5 text-xs text-rose-500">
                {likedCards.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl px-4 py-6">
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
            className="flex flex-col items-center gap-4 py-24 text-center"
          >
            <div className="rounded-full bg-muted p-5">
              {tab === "my" ? (
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              ) : (
                <Heart className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="font-semibold">
                {tab === "my" ? "아직 올린 사진이 없어요" : "좋아요한 사진이 없어요"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {tab === "my"
                  ? "갤러리에서 사진을 업로드해보세요"
                  : "갤러리에서 마음에 드는 사진에 좋아요를 눌러보세요"}
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={tab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 gap-3 sm:grid-cols-3"
          >
            {cards.map((card, i) => {
              const isSoftDeleted = tab === "my" && !!card.deleted_at;
              const isLoading = cardActionLoading === card.share_id;

              return (
                <motion.div
                  key={card.share_id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="relative"
                >
                  <Link href={`/cards/${card.share_id}`} className="group block">
                    <div className={`relative overflow-hidden rounded-2xl border bg-muted aspect-square ${
                      isSoftDeleted ? "border-amber-300 dark:border-amber-500/40" : "border-border"
                    }`}>
                      {card.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={card.image_url}
                          alt={card.analysis?.shortcutMessage ?? "사진"}
                          className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                            isSoftDeleted ? "grayscale opacity-50" : ""
                          }`}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      {isSoftDeleted && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <div className="flex items-center gap-1.5 rounded-full bg-amber-500/90 px-3 py-1.5 text-xs font-medium text-white">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            삭제 대기
                          </div>
                        </div>
                      )}
                      {!isSoftDeleted && (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                          <div className="absolute bottom-0 left-0 right-0 p-2.5 translate-y-1 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                            <p className="text-xs font-medium text-white line-clamp-2">
                              {card.analysis?.shortcutMessage}
                            </p>
                          </div>
                          <div className="absolute right-2 top-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                            <LikeButton cardId={card.share_id} size="sm" />
                          </div>
                          {/* 공개범위 배지 (전체 공개가 아닌 경우) */}
                          {tab === "my" && card.visibility && card.visibility !== "public" && (() => {
                            const Icon = VISIBILITY_ICON[card.visibility];
                            return (
                              <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                                <Icon className="h-3 w-3" />
                                {card.visibility === "followers" ? "팔로워" : "비공개"}
                              </div>
                            );
                          })()}
                        </>
                      )}
                    </div>
                  </Link>
                  {/* 삭제 대기 카드: 복구/완전삭제 버튼 */}
                  {isSoftDeleted && (
                    <div className="mt-2 flex gap-1.5">
                      <button
                        onClick={() => handleRestore(card.share_id)}
                        disabled={isLoading}
                        className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-border py-1.5 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
                      >
                        {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                        복구
                      </button>
                      <button
                        onClick={() => setConfirmDelete(card.share_id)}
                        disabled={isLoading}
                        className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-red-500 py-1.5 text-xs font-medium text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="h-3 w-3" />
                        완전삭제
                      </button>
                    </div>
                  )}
                  {/* 내 사진 탭: 삭제 안 된 카드에 삭제 버튼 */}
                  {tab === "my" && !isSoftDeleted && (
                    <div className="mt-1.5 flex items-center justify-between px-0.5">
                      <p className="truncate text-xs text-muted-foreground flex-1">
                        {card.address ?? ""}
                      </p>
                      <button
                        onClick={() => handleSoftDelete(card.share_id)}
                        disabled={isLoading}
                        className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
                      >
                        {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  )}
                  {/* 좋아요 탭: 기존 주소 표시 유지 */}
                  {tab === "liked" && card.address && (
                    <p className="mt-1.5 truncate px-0.5 text-xs text-muted-foreground">
                      {card.address}
                    </p>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </main>

    {/* 팔로워/팔로잉 모달 */}
    {followModal && profile && (
      <FollowListModal
        userId={profile.id}
        type={followModal}
        onClose={() => setFollowModal(null)}
        onFollowChange={(action) =>
          setFollowCounts((prev) => ({
            ...prev,
            following_count: prev.following_count + (action === "followed" ? 1 : -1),
          }))
        }
      />
    )}

    {/* 완전삭제 확인 모달 */}
    {confirmDelete && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="mx-4 w-full max-w-sm rounded-2xl border border-border bg-background p-6 shadow-xl">
          <h3 className="text-lg font-semibold">완전히 삭제할까요?</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            이 작업은 되돌릴 수 없습니다. 사진, 댓글, 좋아요가 모두 삭제됩니다.
          </p>
          <div className="mt-5 flex gap-2 justify-end">
            <button
              onClick={() => setConfirmDelete(null)}
              disabled={!!cardActionLoading}
              className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              취소
            </button>
            <button
              onClick={() => handlePermanentDelete(confirmDelete)}
              disabled={!!cardActionLoading}
              className="flex items-center gap-1.5 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {cardActionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              완전삭제
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
