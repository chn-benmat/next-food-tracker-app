import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import "./globals.css";
import SessionHistory from "./session-history";

const prompt = Prompt({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-prompt",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Food Tracker | สมุดบันทึกอาหาร",
  description: "บันทึกมื้ออาหารและย้อนดูเมนูที่เคยกินได้ทุกวัน",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className={prompt.variable}>
      <body>
        {children}
        <SessionHistory />
      </body>
    </html>
  );
}
