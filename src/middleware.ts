import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

  // Let public/static asset requests bypass auth redirects.
  if (/\.[^/]+$/.test(pathname)) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(list) {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          list.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // /user/:id → /users/:id 리다이렉트
  if (/^\/user\//.test(pathname)) {
    return NextResponse.redirect(new URL(pathname.replace(/^\/user\//, "/users/"), request.url));
  }

  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isPendingPage = pathname === "/pending";

  if (!user && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_approved, role, account_status, suspended_until")
      .eq("id", user.id)
      .single();

    // 관리자는 항상 통과
    if (profile?.role === "admin") {
      // 관리자가 로그인 페이지 접근 시 홈으로
      if (isAuthPage) return NextResponse.redirect(new URL("/", request.url));
      return response;
    }

    // 정지 계정 처리
    if (profile?.account_status === "suspended") {
      // 기간제 정지: 만료 여부 확인
      if (profile.suspended_until && new Date(profile.suspended_until) < new Date()) {
        // 정지 기간 만료 → 자동 해제 후 정상 진행
        await supabase
          .from("profiles")
          .update({ account_status: "active", suspended_until: null, suspend_reason: null })
          .eq("id", user.id);
      } else {
        // 아직 정지 중 — 로그인 페이지(reason=suspended)만 허용, 나머지는 강제 로그아웃
        if (!isAuthPage) {
          const until = profile.suspended_until
            ? `&until=${encodeURIComponent(profile.suspended_until)}`
            : "";
          const redirectRes = NextResponse.redirect(
            new URL(`/login?reason=suspended${until}`, request.url)
          );
          // 세션 쿠키 만료 처리
          request.cookies.getAll().forEach(({ name }) => {
            if (name.startsWith("sb-")) {
              redirectRes.cookies.set(name, "", { maxAge: 0, path: "/" });
            }
          });
          return redirectRes;
        }
        // isAuthPage이면 그냥 통과 (클라이언트에서 signOut 처리)
        return response;
      }
    }

    // 탈퇴 계정 처리
    if (profile?.account_status === "withdrawn") {
      if (!isAuthPage) {
        const redirectRes = NextResponse.redirect(new URL("/login?reason=withdrawn", request.url));
        request.cookies.getAll().forEach(({ name }) => {
          if (name.startsWith("sb-")) {
            redirectRes.cookies.set(name, "", { maxAge: 0, path: "/" });
          }
        });
        return redirectRes;
      }
      return response;
    }

    // 휴면 계정 처리
    if (profile?.account_status === "dormant") {
      if (!isAuthPage) {
        const redirectRes = NextResponse.redirect(new URL("/login?reason=dormant", request.url));
        request.cookies.getAll().forEach(({ name }) => {
          if (name.startsWith("sb-")) {
            redirectRes.cookies.set(name, "", { maxAge: 0, path: "/" });
          }
        });
        return redirectRes;
      }
      return response;
    }

    // 정상 유저가 로그인 페이지 접근 시 홈으로
    if (isAuthPage) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // 미승인 사용자
    if (!isPendingPage && !profile?.is_approved) {
      return NextResponse.redirect(new URL("/pending", request.url));
    }

    // 일반 사용자가 /admin 접근 시 차단
    if (pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // 승인된 사용자가 /pending 접근 시 홈으로
  if (user && isPendingPage) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_approved, role")
      .eq("id", user.id)
      .single();

    if (profile?.is_approved || profile?.role === "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico|api/|share/).*)",
};
