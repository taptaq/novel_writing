import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { env } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  title: `${env.appName} · AI 小说写作台`,
  description: "一个以长篇小说创作为核心的 AI 共创工作台。"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="site-shell">
          <aside className="site-sidebar">
            <Link href="/" className="brand-block">
              <span className="brand-mark">HD</span>
              <div>
                <strong>{env.appName}</strong>
                <p>AI 帮你写，不抢你定</p>
              </div>
            </Link>

            <nav className="sidebar-nav">
              <Link href="/" className="sidebar-link">
                开始页
              </Link>
              <Link href="/novels" className="sidebar-link">
                我的作品
              </Link>
              <Link href="/demo/tide-and-embers" className="sidebar-link">
                先看示例
              </Link>
            </nav>

            <div className="sidebar-card">
              <p className="panel-eyebrow">先记这 3 句</p>
              <ul className="plain-list compact-list">
                <li>先把书建起来。</li>
                <li>先保前后顺。</li>
                <li>AI 给草稿，你来定。</li>
              </ul>
            </div>
          </aside>

          <main className="site-main">{children}</main>
        </div>
      </body>
    </html>
  );
}
