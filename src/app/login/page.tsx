"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Clock, UserX } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

function SuspendedBanner({ until }: { until: string | null }) {
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const getDaysLeft = (iso: string) => {
    const diff = new Date(iso).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 flex gap-3">
      <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-destructive">계정이 정지되었습니다</p>
        {until ? (
          <p className="text-xs text-destructive/80">
            정지 해제일: {formatDate(until)} ({getDaysLeft(until)}일 남음)
          </p>
        ) : (
          <p className="text-xs text-destructive/80">영구 정지된 계정입니다. 문의가 필요하시면 관리자에게 연락하세요.</p>
        )}
      </div>
    </div>
  );
}

function DormantBanner() {
  return (
    <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 flex gap-3">
      <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-amber-700 dark:text-amber-500">휴면 계정입니다</p>
        <p className="text-xs text-amber-600/80 dark:text-amber-500/80">
          장기 미접속으로 휴면 처리되었습니다. 계정 복구를 원하시면 관리자에게 문의하세요.
        </p>
      </div>
    </div>
  );
}

function WithdrawnBanner() {
  return (
    <div className="rounded-lg bg-muted border border-border px-4 py-3 flex gap-3">
      <UserX className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
      <div className="space-y-1">
        <p className="text-sm font-medium">탈퇴한 계정입니다</p>
        <p className="text-xs text-muted-foreground">
          이미 탈퇴 처리된 계정입니다. 계정 복구가 필요하시면 관리자에게 문의하세요.
        </p>
      </div>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");
  const until = searchParams.get("until");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 정지/탈퇴/휴면으로 리다이렉트된 경우 세션 제거
  useEffect(() => {
    if (reason) {
      const supabase = createClient();
      supabase.auth.signOut();
    }
  }, [reason]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // 로그인 성공 후 계정 상태 확인
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("account_status, suspended_until")
        .eq("id", user.id)
        .single();

      if (profile?.account_status === "suspended") {
        await supabase.auth.signOut();
        const until = profile.suspended_until
          ? `&until=${encodeURIComponent(profile.suspended_until)}`
          : "";
        setLoading(false);
        router.replace(`/login?reason=suspended${until}`);
        return;
      }
      if (profile?.account_status === "withdrawn") {
        await supabase.auth.signOut();
        setLoading(false);
        router.replace("/login?reason=withdrawn");
        return;
      }
      if (profile?.account_status === "dormant") {
        await supabase.auth.signOut();
        setLoading(false);
        router.replace("/login?reason=dormant");
        return;
      }
    }

    router.push("/");
    router.refresh();
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3">
          <Image src="/picvora-logo-dark.svg" alt="Picvora" width={140} height={42} className="hidden dark:block" priority />
          <Image src="/picvora-logo-light.svg" alt="Picvora" width={140} height={42} className="block dark:hidden" priority />
          <p className="text-sm text-muted-foreground">기록된 찰나, 이어지는 경험</p>
        </div>

        {reason === "suspended" && <SuspendedBanner until={until} />}
        {reason === "dormant" && <DormantBanner />}
        {reason === "withdrawn" && <WithdrawnBanner />}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              이메일
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-primary focus:ring-offset-2"
              placeholder="name@example.com"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-primary focus:ring-offset-2"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "로그인 중..." : "로그인"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          계정이 없으신가요?{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            회원가입
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
