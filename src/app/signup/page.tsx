"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Check, X, Loader2, CheckCircle2, XCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemedLogo } from "@/components/ui/themed-logo";
import { createClient } from "@/lib/supabase/client";

const EMAIL_DOMAINS = ["gmail.com", "naver.com", "kakao.com", "daum.net", "nate.com", "hanmail.net", "outlook.com", "icloud.com"];

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: "매우 약함", color: "bg-destructive" };
  if (score === 2) return { score, label: "약함", color: "bg-orange-500" };
  if (score === 3) return { score, label: "보통", color: "bg-yellow-500" };
  if (score === 4) return { score, label: "강함", color: "bg-primary/80" };
  return { score, label: "매우 강함", color: "bg-primary" };
}

// 공통 인풋 클래스
const inputCls =
  "w-full rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-sm text-[hsl(263,50%,32%)] dark:text-[hsl(263,40%,82%)] placeholder:text-muted-foreground/50 outline-none transition-all duration-200 focus:border-primary/60 focus:bg-background focus:ring-2 focus:ring-primary/20 ring-offset-background";

// 라벨 클래스
const labelCls = "text-xs font-semibold tracking-wide text-[hsl(263,40%,52%)] dark:text-[hsl(263,40%,68%)] uppercase";

export default function SignupPage() {
  const router = useRouter();
  const [emailInput, setEmailInput] = useState("");
  const [emailDomain, setEmailDomain] = useState("");
  const [useCustomDomain, setUseCustomDomain] = useState(false);
  const [showDomainList, setShowDomainList] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailChecked, setEmailChecked] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [emailCheckMessage, setEmailCheckMessage] = useState<string | null>(null);

  const fullEmail = useCustomDomain
    ? `${emailInput}@${emailDomain}`.trim()
    : emailDomain
    ? `${emailInput}@${emailDomain}`
    : emailInput;

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fullEmail);
  const passwordStrength = getPasswordStrength(password);
  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;

  const handleEmailLocalChange = (value: string) => {
    setEmailInput(value);
    setEmailChecked(false);
    setEmailAvailable(null);
    setEmailCheckMessage(null);
  };

  const handleDomainSelect = (domain: string) => {
    setEmailDomain(domain);
    setUseCustomDomain(false);
    setShowDomainList(false);
    setEmailChecked(false);
    setEmailAvailable(null);
    setEmailCheckMessage(null);
  };

  const handleCustomDomain = () => {
    setUseCustomDomain(true);
    setEmailDomain("");
    setShowDomainList(false);
    setEmailChecked(false);
    setEmailAvailable(null);
    setEmailCheckMessage(null);
  };

  const handleCheckEmail = async () => {
    const normalizedEmail = fullEmail.trim().toLowerCase();
    if (!isEmailValid) {
      setEmailCheckMessage("올바른 이메일 형식을 입력해 주세요.");
      return;
    }
    setCheckingEmail(true);
    setEmailCheckMessage(null);
    try {
      const res = await fetch(`/api/signup/check-email?email=${encodeURIComponent(normalizedEmail)}`);
      const data = await res.json();
      if (!res.ok) {
        setEmailChecked(false);
        setEmailAvailable(null);
        setEmailCheckMessage(data.error ?? "중복 확인에 실패했습니다. 다시 시도해 주세요.");
        return;
      }
      setEmailChecked(true);
      setEmailAvailable(!data.exists);
      setEmailCheckMessage(
        data.exists ? "이미 Picvora에 가입된 이메일입니다." : "사용할 수 있는 이메일입니다."
      );
    } catch {
      setEmailChecked(false);
      setEmailAvailable(null);
      setEmailCheckMessage("네트워크 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!emailChecked || !emailAvailable) {
      setError("이메일 중복 확인을 완료해 주세요.");
      return;
    }
    if (password.length < 6) {
      setError("비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }
    if (!passwordsMatch) {
      setError("비밀번호가 일치하지 않습니다. 다시 확인해 주세요.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const normalizedEmail = fullEmail.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({ email: normalizedEmail, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    if (data.session) {
      router.push("/");
      router.refresh();
      return;
    }
    setEmailSent(true);
    setLoading(false);
  };

  if (emailSent) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="flex flex-col items-center gap-4">
            <ThemedLogo />
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-7 w-7 text-primary" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-bold tracking-tight">인증 메일을 보냈어요</h1>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{fullEmail}</span>
                <br />
                메일함을 확인하고 링크를 클릭해 가입을 완료하세요.
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
            메일이 오지 않는다면 스팸함을 확인해 주세요.
          </div>
          <Link href="/login" className="block text-sm font-medium text-primary hover:underline">
            로그인 페이지로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-8">

        {/* 헤더 */}
        <div className="flex flex-col items-center gap-2">
          <ThemedLogo />
          <p className="text-sm text-muted-foreground">새 계정을 만들어 시작하세요</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* 이메일 */}
          <div className="space-y-2">
            <label className={labelCls}>이메일</label>

            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={emailInput}
                onChange={(e) => handleEmailLocalChange(e.target.value)}
                autoComplete="email"
                className={inputCls.replace("w-full", "min-w-0 flex-1")}
                placeholder="아이디"
              />
              <span className="shrink-0 text-sm font-medium text-muted-foreground">@</span>
              {useCustomDomain ? (
                <input
                  type="text"
                  value={emailDomain}
                  onChange={(e) => {
                    setEmailDomain(e.target.value);
                    setEmailChecked(false);
                    setEmailAvailable(null);
                    setEmailCheckMessage(null);
                  }}
                  className={inputCls.replace("w-full", "w-36")}
                  placeholder="도메인 입력"
                  autoFocus
                />
              ) : (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowDomainList((v) => !v)}
                    className="flex w-36 items-center justify-between rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-sm text-left outline-none transition-all duration-200 focus:border-primary/60 focus:bg-background focus:ring-2 focus:ring-primary/20 ring-offset-background"
                  >
                    <span className={emailDomain ? "text-foreground" : "text-muted-foreground/60"}>
                      {emailDomain || "도메인"}
                    </span>
                    <svg className="h-3.5 w-3.5 shrink-0 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showDomainList && (
                    <div className="absolute top-full left-0 z-20 mt-1 w-44 rounded-xl border border-border bg-popover shadow-xl overflow-hidden">
                      {EMAIL_DOMAINS.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => handleDomainSelect(d)}
                          className="w-full px-3.5 py-2 text-left text-sm hover:bg-primary/8 transition-colors"
                        >
                          {d}
                        </button>
                      ))}
                      <div className="border-t border-border" />
                      <button
                        type="button"
                        onClick={handleCustomDomain}
                        className="w-full px-3.5 py-2 text-left text-sm font-medium text-primary hover:bg-primary/8 transition-colors"
                      >
                        직접 입력
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 중복 확인 버튼 */}
            <button
              type="button"
              onClick={handleCheckEmail}
              disabled={checkingEmail || !emailInput || !emailDomain}
              className="w-full rounded-xl border border-primary/30 bg-primary/6 px-3.5 py-2 text-sm font-medium text-primary transition-all duration-200 hover:bg-primary/12 hover:border-primary/50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {checkingEmail ? (
                <span className="flex items-center justify-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />확인 중...
                </span>
              ) : (
                "이메일 중복 확인"
              )}
            </button>

            {emailCheckMessage && (
              <div className={`flex items-center gap-1.5 text-xs ${emailAvailable ? "text-primary" : "text-destructive"}`}>
                {emailAvailable
                  ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  : <XCircle className="h-3.5 w-3.5 shrink-0" />
                }
                {emailCheckMessage}
              </div>
            )}
          </div>

          {/* 비밀번호 */}
          <div className="space-y-2">
            <label htmlFor="password" className={labelCls}>비밀번호</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={6}
                className={inputCls + " pr-10"}
                placeholder="6자 이상 입력"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {password.length > 0 && (
              <div className="space-y-1">
                <div className="flex gap-1 h-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-full transition-all duration-300 ${
                        i <= passwordStrength.score ? passwordStrength.color : "bg-border"
                      }`}
                    />
                  ))}
                </div>
                <p className={`text-xs ${
                  passwordStrength.score <= 1 ? "text-destructive" :
                  passwordStrength.score === 2 ? "text-orange-500" :
                  passwordStrength.score === 3 ? "text-yellow-600 dark:text-yellow-400" :
                  "text-primary"
                }`}>
                  강도: {passwordStrength.label}
                </p>
              </div>
            )}
          </div>

          {/* 비밀번호 확인 */}
          <div className="space-y-2">
            <label htmlFor="confirm-password" className={labelCls}>비밀번호 확인</label>
            <div className="relative">
              <input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className={inputCls + " pr-10"}
                placeholder="비밀번호를 다시 입력"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {confirmPassword.length > 0 && (
              <div className={`flex items-center gap-1 text-xs ${passwordsMatch ? "text-primary" : "text-destructive"}`}>
                {passwordsMatch
                  ? <><Check className="h-3.5 w-3.5" />비밀번호가 일치합니다</>
                  : <><X className="h-3.5 w-3.5" />비밀번호가 일치하지 않습니다</>
                }
              </div>
            )}
          </div>

          {/* 전체 에러 */}
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/8 px-3.5 py-2.5">
              <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading || checkingEmail || !emailChecked || !emailAvailable || !passwordsMatch}
          >
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />가입 중...</>
            ) : (
              "Picvora 시작하기"
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </main>
  );
}
