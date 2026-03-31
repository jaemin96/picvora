import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { Providers } from "@/lib/providers";
import { Toaster } from "sonner";
import { ChatbotButton } from "@/components/features/chatbot-button";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Picvora - AI Photo Life Service",
  description:
    "사진 한 장으로 그 장소의 맥락을 추출하고 정보성 카드 UI를 생성하는 AI 포토 라이프 서비스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          inter.variable
        )}
      >
        <Providers>
          {children}
          <ChatbotButton />
        </Providers>
        <Toaster position="bottom-center" richColors />
      </body>
    </html>
  );
}
