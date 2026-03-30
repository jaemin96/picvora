"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, X, Users, UserCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type PendingUser = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  is_approved: boolean;
  role: string;
  created_at: string;
};

type Filter = "pending" | "all";

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<PendingUser[]>([]);
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

  const handleAction = async (userId: string, action: "approve" | "reject") => {
    setActionLoading(userId);
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action }),
    });

    if (res.ok) {
      toast.success(action === "approve" ? "승인 완료" : "거절 완료");
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } else {
      const data = await res.json();
      toast.error(data.error || "작업 실패");
    }
    setActionLoading(null);
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
        <div className="flex gap-2">
          <Button
            variant={filter === "pending" ? "default" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => setFilter("pending")}
          >
            <Users className="h-4 w-4" />
            승인 대기
          </Button>
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => setFilter("all")}
          >
            <UserCheck className="h-4 w-4" />
            전체 사용자
          </Button>
        </div>

        {/* 사용자 목록 */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : users.length === 0 ? (
          <div className="rounded-lg border border-border bg-muted/50 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              {filter === "pending" ? "승인 대기 중인 사용자가 없습니다" : "사용자가 없습니다"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* 아바타 */}
                  <div className="h-10 w-10 shrink-0 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-sm font-medium text-muted-foreground">
                        {(user.display_name || user.email)?.[0]?.toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {user.display_name || "이름 없음"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {user.role === "admin" ? (
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      관리자
                    </span>
                  ) : user.is_approved ? (
                    <span className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-600">
                      승인됨
                    </span>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                        onClick={() => handleAction(user.id, "reject")}
                        disabled={actionLoading === user.id}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleAction(user.id, "approve")}
                        disabled={actionLoading === user.id}
                      >
                        {actionLoading === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
