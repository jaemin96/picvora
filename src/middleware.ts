import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

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

  const { pathname } = request.nextUrl;

  // /user/:id → /users/:id 리다이렉트
  if (/^\/user\//.test(pathname)) {
    return NextResponse.redirect(new URL(pathname.replace(/^\/user\//, "/users/"), request.url));
  }

  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isPendingPage = pathname === "/pending";

  if (!user && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && isAuthPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 로그인된 사용자: 승인 여부 확인
  if (user && !isAuthPage && !isPendingPage) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_approved, role")
      .eq("id", user.id)
      .single();

    // 관리자는 항상 통과
    if (profile?.role === "admin") {
      // 관리자가 아닌데 /admin 접근 시 차단 (여기서는 관리자이므로 통과)
      return response;
    }

    // 미승인 사용자는 /pending으로 리다이렉트
    if (!profile?.is_approved) {
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
