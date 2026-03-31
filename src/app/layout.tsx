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
  metadataBase: new URL("https://picvora.vercel.app"),
  title: {
    default: "Picvora - 당신의 찰나가 누군가의 경험으로 이어지도록",
    template: "%s | Picvora",
  },
  description:
    "Picvora에서 찰나의 순간을 기록하고 다른 이들과 경험을 이어보세요.",
  keywords: ["사진공유", "이미지커뮤니티", "Picvora", "픽보라", "사진기록"],
  authors: [{ name: "Picvora Team" }],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://picvora.vercel.app",
    title: "Picvora",
    description: "당신의 찰나가 누군가의 경험으로 이어지는 곳, Picvora",
    siteName: "Picvora",
    images: [
      {
        url: "/slogan.png",
        width: 1200,
        height: 630,
        alt: "Picvora - 당신의 찰나가 누군가의 경험으로 이어지도록",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Picvora",
    description: "당신의 찰나가 누군가의 경험으로 이어지는 곳, Picvora",
    images: ["/slogan.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
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
