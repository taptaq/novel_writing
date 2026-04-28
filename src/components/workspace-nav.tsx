"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface WorkspaceNavProps {
  novelSlug: string;
  firstChapterSlug?: string;
}

export function WorkspaceNav({ novelSlug, firstChapterSlug }: WorkspaceNavProps) {
  const pathname = usePathname();
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

  return (
    <nav className="workspace-nav" aria-label="作品工作区导航">
      {items.map((item) => {
        const isActive =
          pathname === item.href || (item.label === "写作" && pathname.startsWith(`/novels/${novelSlug}/chapters/`));

        return (
          <Link key={item.href} className={isActive ? "workspace-tab workspace-tab-active" : "workspace-tab"} href={item.href}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
