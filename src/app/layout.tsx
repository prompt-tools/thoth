import "@/lib/prompt/init";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://thoth-rho.vercel.app"),
  title: "人像/角色提示词向导",
  description: "选择题式人像与角色提示词生成向导。画质与安全负向词自动附加，无需单独选择。"
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
