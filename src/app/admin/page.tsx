"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  X,
  Users,
  UserCheck,
  Loader2,
  ShieldOff,
  ShieldCheck,
  Moon,
  RotateCcw,
  UserX,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type AccountStatus = "active" | "suspended" | "dormant" | "withdrawn";

type ManagedUser = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  is_approved: boolean;
  role: string;
  created_at: string;
  account_status: AccountStatus;
  suspended_until: string | null;
  suspend_reason: string | null;
  last_active_at: string | null;
  withdrawn_at: string | null;
};

type Filter = "pending" | "all" | "suspended" | "dormant" | "withdrawn";

const SUSPEND_OPTIONS = [
  { label: "1일", days: 1 },
  { label: "3일", days: 3 },
  { label: "7일", days: 7 },
  { label: "30일", days: 30 },
  { label: "영구", days: null },
];

function SuspendDropdown({
  userId,
  onSuspend,
  disabled,
}: {
  userId: string;
  onSuspend: (userId: string, days: number | null) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1 px-2 text-xs text-destructive hover:bg-destructive/10"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
      >
        <ShieldOff className="h-3.5 w-3.5" />
        정지
        <ChevronDown className="h-3 w-3" />
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-20 w-28 rounded-lg border border-border bg-popover shadow-md py-1">
            {SUSPEND_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                className="w-full px-3 py-1.5 text-left text-xs hover:bg-muted transition-colors"
                onClick={() => {
                  setOpen(false);
                  onSuspend(userId, opt.days);
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SuspendedBadge({ until }: { until: string | null }) {
  if (!until) {
    return (
      <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
        영구정지
      </span>
    );
  }
  const now = new Date();
  const end = new Date(until);
  const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return (
    <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
      정지 {daysLeft > 0 ? `${daysLeft}일 남음` : "만료"}
    </span>
  );
}

function StatusBadge({ user }: { user: ManagedUser }) {
  if (user.role === "admin") {
    return (
      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
        관리자
      </span>
    );
  }
  if (user.account_status === "suspended") {
    return <SuspendedBadge until={user.suspended_until} />;
  }
  if (user.account_status === "dormant") {
    return (
      <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600">
        휴면
      </span>
    );
  }
  if (user.account_status === "withdrawn") {
    return (
      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
        탈퇴
      </span>
    );
  }
  if (!user.is_approved) {
    return (
      <span className="rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-xs font-medium text-yellow-600">
        승인대기
      </span>
    );
  }
  return (
    <span className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-600">
      활성
    </span>
  );
}

function UserActions({
  user,
  actionLoading,
  onAction,
  onSuspend,
}: {
  user: ManagedUser;
  actionLoading: string | null;
  onAction: (userId: string, action: string) => void;
  onSuspend: (userId: string, days: number | null) => void;
}) {
  const isLoading = actionLoading === user.id;

  if (user.role === "admin") return null;

  // 승인 대기
  if (!user.is_approved && user.account_status === "active") {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
          onClick={() => onAction(user.id, "reject")}
          disabled={isLoading}
        >
          <X className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onAction(user.id, "approve")}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        </Button>
      </>
    );
  }

  // 정지 상태
  if (user.account_status === "suspended") {
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1 px-2 text-xs text-green-600 hover:bg-green-500/10"
        onClick={() => onAction(user.id, "unsuspend")}
        disabled={isLoading}
      >
        {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
        정지해제
      </Button>
    );
  }

  // 휴면/탈퇴 상태
  if (user.account_status === "dormant" || user.account_status === "withdrawn") {
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1 px-2 text-xs"
        onClick={() => onAction(user.id, "restore")}
        disabled={isLoading}
      >
        {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
        복구
      </Button>
    );
  }

  // 활성 사용자: 정지 / 휴면 / 탈퇴처리
  return (
    <>
      <SuspendDropdown userId={user.id} onSuspend={onSuspend} disabled={isLoading} />
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1 px-2 text-xs text-amber-600 hover:bg-amber-500/10"
        onClick={() => onAction(user.id, "set_dormant")}
        disabled={isLoading}
      >
        {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Moon className="h-3.5 w-3.5" />}
        휴면
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1 px-2 text-xs text-muted-foreground hover:bg-muted"
        onClick={() => onAction(user.id, "withdraw")}
        disabled={isLoading}
      >
        {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserX className="h-3.5 w-3.5" />}
        탈퇴
      </Button>
    </>
  );
}

const FILTER_TABS: { key: Filter; label: string; icon: React.ReactNode }[] = [
  { key: "pending", label: "승인 대기", icon: <Users className="h-4 w-4" /> },
  { key: "all", label: "전체", icon: <UserCheck className="h-4 w-4" /> },
  { key: "suspended", label: "정지", icon: <ShieldOff className="h-4 w-4" /> },
  { key: "dormant", label: "휴면", icon: <Moon className="h-4 w-4" /> },
  { key: "withdrawn", label: "탈퇴", icon: <UserX className="h-4 w-4" /> },
];

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("pending");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = async (f: Filter) => {
    setLoading(true);
    const res = await fetch(`/api/admin/users?filter=${f}`);
    if (res.ok) {
      setUsers(await res.json());
    } else {
      toast.error("사용자 목록을 불러올 수 없습니다");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers(filter);
  }, [filter]);

  const handleAction = async (userId: string, action: string) => {
    setActionLoading(userId);
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action }),
    });

    if (res.ok) {
      const messages: Record<string, string> = {
        approve: "승인 완료",
        reject: "거절 완료",
        unsuspend: "정지 해제 완료",
        set_dormant: "휴면 처리 완료",
        restore: "계정 복구 완료",
        withdraw: "탈퇴 처리 완료",
      };
      toast.success(messages[action] ?? "완료");
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } else {
      const data = await res.json();
      toast.error(data.error || "작업 실패");
    }
    setActionLoading(null);
  };

  const handleSuspend = async (userId: string, days: number | null) => {
    setActionLoading(userId);
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action: "suspend", days }),
    });

    if (res.ok) {
      const label = days != null ? `${days}일 정지 완료` : "영구 정지 완료";
      toast.success(label);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } else {
      const data = await res.json();
      toast.error(data.error || "정지 실패");
    }
    setActionLoading(null);
  };

  const emptyMessages: Record<Filter, string> = {
    pending: "승인 대기 중인 사용자가 없습니다",
    all: "사용자가 없습니다",
    suspended: "정지된 사용자가 없습니다",
    dormant: "휴면 사용자가 없습니다",
    withdrawn: "탈퇴한 사용자가 없습니다",
  };

  return (
    <main className="min-h-screen bg-background">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
          <button onClick={() => router.push("/")} className="rounded-lg p-1.5 hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold">관리자</h1>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        {/* 필터 탭 */}
        <div className="flex gap-2 flex-wrap">
          {FILTER_TABS.map((tab) => (
            <Button
              key={tab.key}
              variant={filter === tab.key ? "default" : "outline"}
              size="sm"
              className="gap-1.5"
              onClick={() => setFilter(tab.key)}
            >
              {tab.icon}
              {tab.label}
            </Button>
          ))}
        </div>

        {/* 사용자 목록 */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : users.length === 0 ? (
          <div className="rounded-lg border border-border bg-muted/50 p-8 text-center">
            <p className="text-sm text-muted-foreground">{emptyMessages[filter]}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <div
                key={user.id}
                className="rounded-lg border border-border bg-card p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* 아바타 */}
                    <div className="relative h-10 w-10 shrink-0 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                      {user.avatar_url ? (
                        <Image src={user.avatar_url} alt="" fill className="object-cover" />
                      ) : (
                        <span className="text-sm font-medium text-muted-foreground">
                          {(user.display_name || user.email)?.[0]?.toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">
                          {user.display_name || "이름 없음"}
                        </p>
                        <StatusBadge user={user} />
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                      <p className="text-xs text-muted-foreground">
                        가입: {new Date(user.created_at).toLocaleDateString("ko-KR")}
                        {user.last_active_at && (
                          <> · 최근: {new Date(user.last_active_at).toLocaleDateString("ko-KR")}</>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 정지 사유 표시 */}
                {user.account_status === "suspended" && user.suspend_reason && (
                  <p className="text-xs text-destructive/80 bg-destructive/5 rounded px-2.5 py-1.5">
                    사유: {user.suspend_reason}
                  </p>
                )}
                {user.account_status === "withdrawn" && user.withdrawn_at && (
                  <p className="text-xs text-muted-foreground">
                    탈퇴일: {new Date(user.withdrawn_at).toLocaleDateString("ko-KR")}
                  </p>
                )}

                {/* 액션 버튼 */}
                <div className="flex items-center gap-2 flex-wrap">
                  <UserActions
                    user={user}
                    actionLoading={actionLoading}
                    onAction={handleAction}
                    onSuspend={handleSuspend}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
