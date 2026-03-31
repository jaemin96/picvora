"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, CheckCircle2, Loader2, Send, ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  FAQ_CATEGORIES,
  getFaqByCategory,
  type FaqCategory,
  type FaqItem,
} from "@/lib/faq-data";
import type { SupportTicket } from "@/types";

type Step =
  | "category-list"
  | "faq-list"
  | "faq-answer"
  | "contact-form"
  | "done"
  | "my-tickets"
  | "ticket-detail";

const STATUS_LABEL: Record<SupportTicket["status"], string> = {
  open: "검토 중",
  answered: "답변 완료",
  closed: "종료",
};

const STATUS_CLASS: Record<SupportTicket["status"], string> = {
  open: "bg-amber-500/10 text-amber-600",
  answered: "bg-green-500/10 text-green-600",
  closed: "bg-muted text-muted-foreground",
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ChatbotPanel({onClose}: { onClose?: () => void }) {
  const [step, setStep] = useState<Step>("category-list");
  const [selectedCategory, setSelectedCategory] = useState<FaqCategory | null>(null);
  const [selectedFaq, setSelectedFaq] = useState<FaqItem | null>(null);

  // 로그인 유저 정보
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [emailReadOnly, setEmailReadOnly] = useState(false);

  // contact form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // 내 문의 내역
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setUserEmail(user.email);
        setEmail(user.email);
        setEmailReadOnly(true);
      }
    });
  }, []);

  const fetchMyTickets = async () => {
    setTicketsLoading(true);
    const res = await fetch("/api/support");
    if (res.ok) {
      setTickets(await res.json());
    }
    setTicketsLoading(false);
  };

  const goToMyTickets = () => {
    setStep("my-tickets");
    fetchMyTickets();
  };

  const goBack = () => {
    if (step === "faq-list") {
      setStep("category-list");
      setSelectedCategory(null);
    } else if (step === "faq-answer") {
      setStep("faq-list");
      setSelectedFaq(null);
    } else if (step === "contact-form") {
      if (selectedFaq) setStep("faq-answer");
      else if (selectedCategory) setStep("faq-list");
      else setStep("category-list");
      setFormError("");
    } else if (step === "my-tickets") {
      setStep("category-list");
    } else if (step === "ticket-detail") {
      setStep("my-tickets");
      setSelectedTicket(null);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setFormError("이름을 입력해 주세요"); return; }
    if (!email.trim()) { setFormError("이메일을 입력해 주세요"); return; }
    if (message.trim().length < 10) { setFormError("문의 내용을 10자 이상 입력해 주세요"); return; }

    setSubmitting(true);
    setFormError("");

    const res = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() }),
    });

    setSubmitting(false);

    if (res.ok) {
      setStep("done");
    } else {
      const data = await res.json();
      setFormError(data.error ?? "제출에 실패했습니다. 다시 시도해 주세요.");
    }
  };

  const resetAll = () => {
    setStep("category-list");
    setSelectedCategory(null);
    setSelectedFaq(null);
    setMessage("");
    setFormError("");
    setSelectedTicket(null);
  };

  const headerSubtitle = () => {
    if (step === "category-list") return "무엇이 궁금하신가요?";
    if (step === "faq-list") return FAQ_CATEGORIES.find(c => c.key === selectedCategory)?.label ?? "";
    if (step === "faq-answer") return "답변";
    if (step === "contact-form") return "직접 문의하기";
    if (step === "done") return "접수 완료";
    if (step === "my-tickets") return "내 문의 내역";
    if (step === "ticket-detail") return "문의 상세";
    return "";
  };

  const showBackBtn = step !== "category-list" && step !== "done";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.96 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="fixed bottom-[5.5rem] right-6 z-40 w-80 max-h-[480px] rounded-2xl border border-border bg-background shadow-xl overflow-hidden flex flex-col"
    >
      {/* 헤더 */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3 bg-muted/40 shrink-0">
        <AnimatePresence mode="wait">
          {showBackBtn && (
            <motion.button
              key="back"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              onClick={goBack}
              className="rounded-md p-1 hover:bg-muted -ml-1"
            >
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </motion.button>
          )}
        </AnimatePresence>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">Picvora 도움말</p>
          <p className="text-xs text-muted-foreground">{headerSubtitle()}</p>
        </div>
      </div>

      {/* 바디 */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {step === "category-list" && (
            <SlidePanel key="category-list">
              <div className="p-3 space-y-2">
                {FAQ_CATEGORIES.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => {
                      setSelectedCategory(cat.key);
                      setStep("faq-list");
                    }}
                    className="w-full flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left text-sm hover:bg-muted transition-colors"
                  >
                    <span className="text-lg leading-none">{cat.emoji}</span>
                    <span className="font-medium">{cat.label}</span>
                  </button>
                ))}
                <ContactButton onClick={() => { setSelectedCategory(null); setStep("contact-form"); }} />
                {userEmail && (
                  <button
                    onClick={goToMyTickets}
                    className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <ClipboardList className="h-3.5 w-3.5" />
                    내 문의 내역 보기
                  </button>
                )}
              </div>
            </SlidePanel>
          )}

          {step === "faq-list" && selectedCategory && (
            <SlidePanel key="faq-list">
              <div className="p-3 space-y-2">
                {getFaqByCategory(selectedCategory).map((faq) => (
                  <button
                    key={faq.id}
                    onClick={() => {
                      setSelectedFaq(faq);
                      setStep("faq-answer");
                    }}
                    className="w-full rounded-xl border border-border bg-card px-4 py-3 text-left text-sm hover:bg-muted transition-colors"
                  >
                    {faq.question}
                  </button>
                ))}
                <ContactButton onClick={() => setStep("contact-form")} />
              </div>
            </SlidePanel>
          )}

          {step === "faq-answer" && selectedFaq && (
            <SlidePanel key="faq-answer">
              <div className="p-4 space-y-4">
                <div className="rounded-xl bg-muted/60 px-4 py-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Q</p>
                  <p className="text-sm font-medium">{selectedFaq.question}</p>
                </div>
                <div className="rounded-xl border border-border bg-card px-4 py-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">A</p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedFaq.answer}</p>
                </div>
                <div className="pt-1">
                  <p className="text-xs text-muted-foreground text-center mb-2">도움이 되지 않으셨나요?</p>
                  <ContactButton onClick={() => setStep("contact-form")} />
                </div>
              </div>
            </SlidePanel>
          )}

          {step === "contact-form" && (
            <SlidePanel key="contact-form">
              <div className="p-4 space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">이름</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="홍길동"
                    maxLength={50}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">이메일</label>
                  <input
                    value={email}
                    onChange={(e) => !emailReadOnly && setEmail(e.target.value)}
                    readOnly={emailReadOnly}
                    placeholder="your@email.com"
                    type="email"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring read-only:bg-muted read-only:cursor-default"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    문의 내용
                    <span className="ml-1 text-muted-foreground/60">({message.length}/2000)</span>
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value.slice(0, 2000))}
                    placeholder="문의 내용을 상세히 작성해 주세요 (최소 10자)"
                    rows={4}
                    className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                {formError && <p className="text-xs text-destructive">{formError}</p>}
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {submitting ? "제출 중..." : "문의 제출"}
                </button>
              </div>
            </SlidePanel>
          )}

          {step === "done" && (
            <SlidePanel key="done">
              <div className="flex flex-col items-center justify-center gap-4 px-6 py-10 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <div className="space-y-1">
                  <p className="font-semibold">문의가 접수되었습니다</p>
                  <p className="text-sm text-muted-foreground">
                    {userEmail
                      ? "답변이 등록되면 내 문의 내역에서 확인할 수 있습니다."
                      : "입력하신 이메일로 답변 드리겠습니다."}
                    <br />
                    보통 3~5 영업일 내 처리됩니다.
                  </p>
                </div>
                <div className="flex gap-2">
                  {userEmail && (
                    <button
                      onClick={goToMyTickets}
                      className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      내역 보기
                    </button>
                  )}
                  <button
                    onClick={resetAll}
                    className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-muted transition-colors"
                  >
                    처음으로
                  </button>
                </div>
              </div>
            </SlidePanel>
          )}

          {step === "my-tickets" && (
            <SlidePanel key="my-tickets">
              <div className="p-3 space-y-2">
                {ticketsLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-sm text-muted-foreground">문의 내역이 없습니다</p>
                    <button
                      onClick={() => setStep("category-list")}
                      className="mt-3 text-xs text-primary hover:underline"
                    >
                      문의하러 가기
                    </button>
                  </div>
                ) : (
                  <>
                  {tickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      onClick={() => {
                        setSelectedTicket(ticket);
                        setStep("ticket-detail");
                      }}
                      className="w-full rounded-xl border border-border bg-card px-4 py-3 text-left hover:bg-muted transition-colors space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate flex-1">{ticket.message.slice(0, 40)}{ticket.message.length > 40 ? "…" : ""}</p>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[ticket.status]}`}>
                          {STATUS_LABEL[ticket.status]}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(ticket.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </button>
                  ))}
                  <ContactButton onClick={() => { setSelectedCategory(null); setStep("contact-form"); }} />
                  </>
                )}
              </div>
            </SlidePanel>
          )}

          {step === "ticket-detail" && selectedTicket && (
            <SlidePanel key="ticket-detail">
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASS[selectedTicket.status]}`}>
                    {STATUS_LABEL[selectedTicket.status]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(selectedTicket.created_at).toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" })}
                  </span>
                </div>

                <div className="rounded-xl bg-muted/60 px-4 py-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">내 문의</p>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{selectedTicket.message}</p>
                </div>

                {selectedTicket.admin_reply ? (
                  <>
                    <div className="rounded-xl border border-border bg-card px-4 py-3">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">답변</p>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{selectedTicket.admin_reply}</p>
                      {selectedTicket.replied_at && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {new Date(selectedTicket.replied_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                    </div>
                    <div className="rounded-xl bg-muted/40 px-4 py-3 space-y-2">
                      <p className="text-xs text-muted-foreground text-center">답변이 만족스럽지 않으셨나요?</p>
                      <ContactButton onClick={() => { setSelectedCategory(null); setStep("contact-form"); }} />
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl border border-dashed border-border px-4 py-3 text-center">
                    <p className="text-sm text-muted-foreground">아직 답변이 등록되지 않았습니다</p>
                    <p className="text-xs text-muted-foreground mt-0.5">보통 3~5 영업일 내 답변드립니다</p>
                  </div>
                )}
              </div>
            </SlidePanel>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function SlidePanel({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

function ContactButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
    >
      직접 문의하기
    </button>
  );
}
