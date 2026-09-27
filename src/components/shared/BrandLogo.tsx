import React from "react";
import { cn } from "@/lib/utils";

export interface BrandLogoProps {
  variant?: "full" | "mark" | "monochrome";
  size?: "sm" | "md" | "lg";
  subtitle?: string;
  className?: string;
}

/**
 * MockMaster Geometric Precision Mark & Editorial Wordmark
 * Concept: Architectural "M" monolith + ascending calibration apex & baseline in metallic amber.
 */
export function BrandLogo({
  variant = "full",
  size = "md",
  subtitle,
  className,
}: BrandLogoProps) {
  const iconDimensions = {
    sm: "w-6 h-6",
    md: "w-7 h-7",
    lg: "w-9 h-9",
  }[size];

  const textClass = {
    sm: "text-sm",
    md: "text-[15px]",
    lg: "text-lg",
  }[size];

  return (
    <span className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className={cn(iconDimensions, "shrink-0 rounded-[6px] shadow-2xs")}
      >
        <rect
          width="32"
          height="32"
          rx="6"
          className="fill-[#141413] dark:fill-[#F2EFE9]"
        />
        <path
          d="M7.5 23.5V8.5H11.2L16 16.2L20.8 8.5H24.5V23.5H21V14.1L16 21.8L11 14.1V23.5H7.5Z"
          className="fill-[#F7F5F0] dark:fill-[#141413]"
        />
        <path
          d="M14.2 8.5H17.8L16 11.6L14.2 8.5Z"
          className={
            variant === "monochrome"
              ? "fill-[#F7F5F0] dark:fill-[#141413]"
              : "fill-[#D49B43] dark:fill-[#B87D24]"
          }
        />
        <rect
          x="7.5"
          y="24.8"
          width="17"
          height="1.5"
          className={
            variant === "monochrome"
              ? "fill-[#F7F5F0] dark:fill-[#141413]"
              : "fill-[#D49B43] dark:fill-[#B87D24]"
          }
        />
      </svg>

      {variant !== "mark" && (
        <span className="inline-flex items-baseline gap-2">
          <span
            className={cn(
              "font-semibold tracking-[-0.03em] text-[var(--foreground)]",
              textClass
            )}
          >
            MockMaster
          </span>
          {subtitle && (
            <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--muted-foreground)] border-l border-[var(--border)] pl-2">
              {subtitle}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
