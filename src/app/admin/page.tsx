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
  MessageSquare,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { SupportTicket } from "@/types";

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
type AdminTab = "users" | "support";
type SupportFilter = "open" | "answered" | "closed" | "all";

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

const SUPPORT_FILTER_TABS: { key: SupportFilter; label: string }[] = [
  { key: "open", label: "미처리" },
  { key: "answered", label: "답변완료" },
  { key: "closed", label: "종료" },
  { key: "all", label: "전체" },
];

function SupportStatusBadge({ status }: { status: SupportTicket["status"] }) {
  if (status === "open") {
    return (
      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600">
        미처리
      </span>
    );
  }
  if (status === "answered") {
    return (
      <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600">
        답변완료
      </span>
    );
  }
  return (
    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      종료
    </span>
  );
}

function SupportPanel() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<SupportFilter>("open");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  const fetchTickets = async (f: SupportFilter) => {
    setLoading(true);
    const res = await fetch(`/api/admin/support?status=${f}`);
    if (res.ok) {
      setTickets(await res.json());
    } else {
      toast.error("문의 목록을 불러올 수 없습니다");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTickets(filter);
  }, [filter]);

  const handleReply = async (ticket: SupportTicket, newStatus?: SupportTicket["status"]) => {
    const reply = replies[ticket.id] ?? ticket.admin_reply ?? "";
    setSubmitting(ticket.id);

    const res = await fetch("/api/admin/support", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticketId: ticket.id,
        admin_reply: reply || undefined,
        status: newStatus,
      }),
    });

    setSubmitting(null);

    if (res.ok) {
      toast.success("업데이트 완료");
      fetchTickets(filter);
      setExpandedId(null);
    } else {
      const data = await res.json();
      toast.error(data.error ?? "실패");
    }
  };

  return (
    <div className="space-y-4">
      {/* 상태 필터 */}
      <div className="flex gap-2 flex-wrap">
        {SUPPORT_FILTER_TABS.map((tab) => (
          <Button
            key={tab.key}
            variant={filter === tab.key ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="rounded-lg border border-border bg-muted/50 p-8 text-center">
          <p className="text-sm text-muted-foreground">문의가 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => {
            const isExpanded = expandedId === ticket.id;
            const replyText = replies[ticket.id] ?? ticket.admin_reply ?? "";
            return (
              <div
                key={ticket.id}
                className="rounded-lg border border-border bg-card overflow-hidden"
              >
                {/* 카드 헤더 */}
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : ticket.id)}
                >
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{ticket.name}</span>
                      <SupportStatusBadge status={ticket.status} />
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{ticket.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(ticket.created_at).toLocaleDateString("ko-KR", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <ChevronRight
                    className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                  />
                </button>

                {/* 확장 영역 */}
                {isExpanded && (
                  <div className="border-t border-border px-4 py-3 space-y-3 bg-muted/20">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">문의 내용</p>
                      <p className="text-sm whitespace-pre-wrap rounded-lg bg-background border border-border px-3 py-2">
                        {ticket.message}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">답변</p>
                      <textarea
                        value={replyText}
                        onChange={(e) =>
                          setReplies((prev) => ({ ...prev, [ticket.id]: e.target.value }))
                        }
                        placeholder="답변을 입력해 주세요..."
                        rows={3}
                        className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        size="sm"
                        className="h-8 gap-1 px-3 text-xs"
                        onClick={() => handleReply(ticket)}
                        disabled={submitting === ticket.id}
                      >
                        {submitting === ticket.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : null}
                        답변 저장
                      </Button>
                      {ticket.status !== "closed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-xs text-muted-foreground"
                          onClick={() => handleReply(ticket, "closed")}
                          disabled={submitting === ticket.id}
                        >
                          종료 처리
                        </Button>
                      )}
                      {ticket.status === "closed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-xs"
                          onClick={() => handleReply(ticket, "open")}
                          disabled={submitting === ticket.id}
                        >
                          재열기
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [adminTab, setAdminTab] = useState<AdminTab>("users");

  // users tab state
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
    if (adminTab === "users") fetchUsers(filter);
  }, [filter, adminTab]);

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
        {/* 상위 탭 */}
        <div className="flex gap-2">
          <Button
            variant={adminTab === "users" ? "default" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={() => setAdminTab("users")}
          >
            <Users className="h-4 w-4" />
            사용자 관리
          </Button>
          <Button
            variant={adminTab === "support" ? "default" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={() => setAdminTab("support")}
          >
            <MessageSquare className="h-4 w-4" />
            문의 관리
          </Button>
        </div>

        {/* 사용자 관리 탭 */}
        {adminTab === "users" && (
          <>
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
          </>
        )}

        {/* 문의 관리 탭 */}
        {adminTab === "support" && <SupportPanel />}
      </div>
    </main>
  );
}
