"use client";

import { useState } from "react";
import { Loader2, UserPlus, UserMinus } from "lucide-react";
import { toast } from "sonner";

type FollowButtonProps = {
  targetUserId: string;
  isFollowing: boolean;
  onToggle?: (newState: boolean) => void;
};

export function FollowButton({ targetUserId, isFollowing: initialFollowing, onToggle }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      });
      if (res.ok) {
        const data = await res.json();
        const newState = data.action === "followed";
        setIsFollowing(newState);
        onToggle?.(newState);
        toast.success(newState ? "팔로우했습니다" : "언팔로우했습니다");
      } else {
        toast.error("요청에 실패했습니다");
      }
    } catch {
      toast.error("요청에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const showUnfollow = isFollowing && hovered;

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all disabled:opacity-50 min-w-[100px] justify-center ${
        showUnfollow
          ? "border border-red-300 text-red-500 bg-red-50 dark:border-red-500/40 dark:bg-red-500/10"
          : isFollowing
            ? "border border-border text-muted-foreground hover:border-border"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
      }`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : showUnfollow ? (
        <UserMinus className="h-4 w-4" />
      ) : isFollowing ? (
        null
      ) : (
        <UserPlus className="h-4 w-4" />
      )}
      {showUnfollow ? "언팔로우" : isFollowing ? "팔로잉" : "팔로우"}
    </button>
  );
}
