"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface WorkspaceNavProps {
  novelSlug: string;
  firstChapterSlug?: string;
}

export function WorkspaceNav({ novelSlug, firstChapterSlug }: WorkspaceNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const items = [
    {
      href: `/novels/${novelSlug}`,
      label: "总览"
    },
    {
      href: `/novels/${novelSlug}/outline`,
      label: "结构"
    },
    {
      href: `/novels/${novelSlug}/world`,
      label: "设定"
    },
    {
      href: `/novels/${novelSlug}/graph`,
      label: "图谱"
    },
    {
      href: `/novels/${novelSlug}/style`,
      label: "文风"
    },
    {
      href: `/novels/${novelSlug}/insights`,
      label: "AI 策略"
    },
    firstChapterSlug
      ? {
          href: `/novels/${novelSlug}/chapters/${firstChapterSlug}`,
          label: "写作"
        }
      : null
  ].filter(Boolean) as Array<{ href: string; label: string }>;
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
          (isWriting && normalizedPathname.startsWith(`/novels/${novelSlug}/chapters/`));
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
