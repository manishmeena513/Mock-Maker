"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Sliders,
  Search,
  Bookmark,
  Award,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  BookOpen,
  BarChart3,
} from "lucide-react";

const WORKSPACE_PREFIXES = [
  "/dashboard",
  "/mock/configure",
  "/revision",
  "/search",
  "/exam/",
  "/results/",
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isWorkspaceRoute = WORKSPACE_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (!isWorkspaceRoute) {
    return <main className="flex-1 flex flex-col">{children}</main>;
  }

  const sidebarGroups = [
    {
      heading: "Preparation",
      links: [
        {
          href: "/dashboard",
          label: "Dashboard",
          icon: LayoutDashboard,
          active: pathname.startsWith("/dashboard"),
        },
        {
          href: "/mock/configure",
          label: "Configure Mock",
          icon: Sliders,
          active: pathname.startsWith("/mock/configure"),
        },
        {
          href: "/revision",
          label: "Revision Hub",
          icon: Bookmark,
          active: pathname.startsWith("/revision"),
        },
        {
          href: "/search",
          label: "Question Explorer",
          icon: Search,
          active: pathname.startsWith("/search"),
        },
      ],
    },
    {
      heading: "Examinations",
      links: [
        {
          href: "/exam/upsc-cse",
          label: "UPSC CSE Prelims",
          icon: Award,
          active: pathname === "/exam/upsc-cse",
        },
        {
          href: "/exam/uppsc-pcs",
          label: "UPPSC Upper PCS",
          icon: Award,
          active: pathname === "/exam/uppsc-pcs",
        },
        {
          href: "/exam/ssc-cgl",
          label: "SSC CGL Tier-I",
          icon: Award,
          active: pathname === "/exam/ssc-cgl",
        },
      ],
    },
    {
      heading: "Account & Plan",
      links: [
        {
          href: "/pricing",
          label: "Plans & Quotas",
          icon: CreditCard,
          active: pathname.startsWith("/pricing"),
        },
      ],
    },
  ];

  return (
    <div className="flex-1 flex flex-col lg:flex-row max-w-[1440px] w-full mx-auto">
      {/* Desktop Left Workspace Sidebar */}
      <aside
        aria-label="Workspace Sidebar"
        className="hidden lg:flex lg:w-60 xl:w-64 shrink-0 flex-col justify-between border-r border-slate-200/90 dark:border-slate-800/90 bg-white/60 dark:bg-[#0b0f17]/60 p-4 select-none"
      >
        <div className="space-y-6 sticky top-20">
          {sidebarGroups.map((group) => (
            <div key={group.heading} className="space-y-1.5">
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {group.heading}
              </div>
              <nav className="space-y-0.5">
                {group.links.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                        item.active
                          ? "bg-blue-50/90 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/50 border border-transparent"
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          item.active
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-slate-400 dark:text-slate-500"
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}

          {/* Verification Integrity Pill */}
          <div className="mx-1 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800/90 bg-slate-50/80 dark:bg-[#131c2e]/80 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>80:20 PYQ Standard</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Every generated mock strictly pairs 80% verified past papers with 20% reviewed model items.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Workspace Content */}
      <main className="flex-1 min-w-0 pb-16 lg:pb-0">{children}</main>

      {/* Mobile Bottom Quick Bar for Workspace Routes */}
      <nav
        aria-label="Mobile Workspace Navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 h-14 bg-white/95 dark:bg-[#0b0f17]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 grid grid-cols-4 px-2"
      >
        <Link
          href="/dashboard"
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold ${
            pathname.startsWith("/dashboard")
              ? "text-blue-600 dark:text-blue-400"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Dashboard</span>
        </Link>
        <Link
          href="/mock/configure"
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold ${
            pathname.startsWith("/mock/configure")
              ? "text-blue-600 dark:text-blue-400"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Mock</span>
        </Link>
        <Link
          href="/revision"
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold ${
            pathname.startsWith("/revision")
              ? "text-blue-600 dark:text-blue-400"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>Revision</span>
        </Link>
        <Link
          href="/search"
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold ${
            pathname.startsWith("/search")
              ? "text-blue-600 dark:text-blue-400"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Explorer</span>
        </Link>
      </nav>
    </div>
  );
}
