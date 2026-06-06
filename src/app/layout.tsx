import "@/lib/prompt/init";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://controllable-image-prompt-guide.vercel.app"),
  title: "可控图片提示词向导",
  description: "选择题式图片提示词生成向导，面向非专业用户的图片生成提示词工具"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
