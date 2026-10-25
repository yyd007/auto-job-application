import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "投递计划",
  description: "对照简历拟出一份职位申请的答案。不填写，不提交。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
