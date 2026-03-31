"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, LogOut, User, Shield, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ThemedLogo } from "@/components/ui/themed-logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SearchBar } from "@/components/features/search-bar";
import { NotificationBell } from "@/components/features/notification-bell";
import { createClient } from "@/lib/supabase/client";

type Props = {
  /** 뒤로가기 버튼 표시 여부 */
  showBack?: boolean;
  /** 새 사진 업로드 버튼 클릭 핸들러 (없으면 버튼 미표시) */
  onNewPhoto?: () => void;
  /** 검색 바 표시 여부 (기본 true) */
  showSearch?: boolean;
  /** 우측에 추가로 렌더링할 액션 노드 */
  rightAction?: React.ReactNode;
};

export function AppHeader({ showBack = false, onNewPhoto, showSearch = true, rightAction }: Props) {
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [userId, setUserId] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.avatar_url) setAvatarUrl(data.avatar_url);
        if (data.display_name) setDisplayName(data.display_name);
        else if (data.email) setDisplayName(data.email);
        if (data.id) setUserId(data.id);
        if (data.role === "admin") setIsAdmin(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-2xl items-center px-4 py-3 gap-2">
        {/* 좌측: 뒤로가기 + 로고 — 모바일 검색 열리면 숨김 */}
        <div className={`flex items-center gap-2 shrink-0 transition-all ${searchOpen ? "opacity-0 pointer-events-none w-0 overflow-hidden" : ""}`}>
          {showBack && (
            <button
              onClick={() => router.back()}
              className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <Link href="/" className="flex items-center">
            <ThemedLogo width={100} height={30} />
          </Link>
        </div>

        {/* 중앙 여백 — 모바일 검색 열리면 숨김 */}
        <div className={`flex-1 ${searchOpen ? "hidden sm:block" : ""}`} />

        {/* 우측: 검색 + 액션 */}
        <div className={`flex items-center gap-1.5 ${searchOpen ? "flex-1 sm:flex-none" : ""}`}>
          {showSearch && <SearchBar onOpenChange={setSearchOpen} />}

          {onNewPhoto && (
            <>
              {/* 모바일: + 아이콘만 */}
              <button
                onClick={onNewPhoto}
                className={`${searchOpen ? "hidden" : "flex"} sm:hidden h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90`}
                aria-label="새 사진"
              >
                <Plus className="h-4 w-4" />
              </button>
              {/* 데스크탑: 아이콘 + 텍스트 */}
              <button
                onClick={onNewPhoto}
                className="hidden sm:flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                새 사진
              </button>
            </>
          )}

          <div className={searchOpen ? "hidden sm:contents" : "contents"}>{rightAction}</div>
          {userId && <div className={searchOpen ? "hidden sm:block" : ""}><NotificationBell userId={userId} /></div>}
          <div className={searchOpen ? "hidden sm:block" : ""}><ThemeToggle /></div>

          {/* 프로필 버튼 */}
          <div className="relative flex items-center" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border-2 border-border transition-all hover:border-primary/60"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="프로필" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-violet-500 text-white text-sm font-bold">
                  {(displayName || "U")[0].toUpperCase()}
                </div>
              )}
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-40 overflow-hidden rounded-xl border border-border bg-background shadow-lg z-50">
                {isAdmin && (
                  <>
                    <Link
                      href="/admin"
                      onClick={() => setShowMenu(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                    >
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      관리자 페이지
                    </Link>
                    <div className="border-b border-border" />
                  </>
                )}
                <Link
                  href="/my"
                  onClick={() => setShowMenu(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                  마이페이지
                </Link>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    handleLogout();
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-muted transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  로그아웃
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
