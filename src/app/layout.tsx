import type { Metadata } from "next";
import { Gowun_Batang, IBM_Plex_Sans_KR, Nanum_Pen_Script } from "next/font/google";
import "./globals.css";

/* 제목 — 오래된 식당 메뉴판 같은 명조 */
const display = Gowun_Batang({
  variable: "--font-display",
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
});

/* 본문 — 읽기 편한 한글 산세리프 */
const body = IBM_Plex_Sans_KR({
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

/* 손글씨 — 곁들이는 한마디에만 아주 조금 */
const hand = Nanum_Pen_Script({
  variable: "--font-hand",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "오늘 뭐 먹지? — AI 메뉴 추천",
  description:
    "기분·예산·함께 먹는 사람·날씨만 고르면 지금 딱 맞는 메뉴 3가지를 추천해드려요.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${display.variable} ${body.variable} ${hand.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
