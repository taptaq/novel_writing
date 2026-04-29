"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface WorkspaceNavProps {
  novelSlug: string;
  firstChapterSlug?: string;
  basePath?: string;
}

export function WorkspaceNav({ novelSlug, firstChapterSlug, basePath = "/novels" }: WorkspaceNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const items = [
    {
      href: `${basePath}/${novelSlug}`,
      label: "总览",
      title: "先看现在最该做什么"
    },
    {
      href: `${basePath}/${novelSlug}/outline`,
      label: "结构",
      title: "不知道后面怎么写时，先来这里"
    },
    {
      href: `${basePath}/${novelSlug}/world`,
      label: "设定",
      title: "补人物、地点、关系都在这里"
    },
    {
      href: `${basePath}/${novelSlug}/graph`,
      label: "图谱",
      title: "快速看清人物关系"
    },
    {
      href: `${basePath}/${novelSlug}/style`,
      label: "文风",
      title: "让 AI 更贴近这本书的感觉"
    },
    {
      href: `${basePath}/${novelSlug}/insights`,
      label: "AI 策略",
      title: "不知道怎么用 AI 更省事时看这里"
    },
    firstChapterSlug
      ? {
          href: `${basePath}/${novelSlug}/chapters/${firstChapterSlug}`,
          label: "写作",
          title: "直接开始写这一章"
        }
      : null
  ].filter(Boolean) as Array<{ href: string; label: string; title: string }>;
  const normalizedPathname = normalizePath(pathname);

  function navigateTo(href: string) {
    if (normalizePath(href) === normalizedPathname) {
      setPendingHref(null);
      return;
    }

    setPendingHref(href);
    startTransition(() => {
      router.push(href);
    });
  }

  return (
    <nav className="workspace-nav" aria-label="作品工作区导航">
      {items.map((item) => {
        const normalizedHref = normalizePath(item.href);
        const isWriting = item.label === "写作";
        const isActive =
          normalizedPathname === normalizedHref ||
          (isWriting && normalizedPathname.startsWith(`${basePath}/${novelSlug}/chapters/`));
        const isNavigating = isPending && pendingHref === item.href;

        return (
          <Link
            key={item.href}
            className={[
              "workspace-tab",
              isActive ? "workspace-tab-active" : "",
              isNavigating ? "workspace-tab-pending" : ""
            ]
              .filter(Boolean)
              .join(" ")}
            href={item.href}
            title={item.title}
            onClick={(event) => {
              event.preventDefault();
              navigateTo(item.href);
            }}
            aria-current={isActive ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function normalizePath(value: string) {
  const withoutQuery = value.split("?")[0]?.split("#")[0] ?? value;
  return withoutQuery.length > 1 ? withoutQuery.replace(/\/+$/g, "") : withoutQuery;
}
