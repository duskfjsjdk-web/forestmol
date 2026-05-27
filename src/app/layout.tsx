import type { Metadata } from "next";
import { Fraunces, DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const fraunces = Fraunces({
  subsets: ['latin'], 
  variable: '--font-fraunces',
  weight: ['300','400','600'],
  style: ['normal','italic'],
});

const dmSans = DM_Sans({
  subsets: ['latin'], 
  variable: '--font-dm-sans',
  weight: ['300','400','500'],
});

const dmMono = DM_Mono({
  subsets: ['latin'], 
  variable: '--font-dm-mono',
  weight: ['400','500'],
});

export const metadata: Metadata = {
  title: "ForestMol - AI 산림 소재 탐색 플랫폼",
  description: "산림 공공데이터 7종 기반 AI 소재 탐색 및 특허 검증 R&D 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={cn(
        "min-h-screen bg-[#F6FBFF] antialiased", 
        fraunces.variable, 
        dmSans.variable, 
        dmMono.variable
      )}>
        {children}
      </body>
    </html>
  );
}
