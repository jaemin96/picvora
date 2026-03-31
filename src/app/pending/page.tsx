"use client";

import { Clock, LogOut } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function PendingPage() {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <Image src="/picvora-logo-dark.svg" alt="Picvora" width={140} height={42} className="hidden dark:block" priority />
          <Image src="/picvora-logo-light.svg" alt="Picvora" width={140} height={42} className="block dark:hidden" priority />
        </div>

        <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-muted/50 p-6">
          <Clock className="h-10 w-10 text-muted-foreground" />
          <h2 className="text-lg font-semibold">승인 대기 중</h2>
          <p className="text-sm text-muted-foreground">
            회원가입이 완료되었습니다.
            <br />
            관리자의 승인을 기다려 주세요.
          </p>
        </div>

        <Button variant="outline" className="w-full gap-2" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          로그아웃
        </Button>
      </div>
    </main>
  );
}
