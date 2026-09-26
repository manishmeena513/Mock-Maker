import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, Inbox, X } from "lucide-react";

/* ============================================================================
 * BUTTON
 * ========================================================================== */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
      primary:
        "bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white border border-transparent shadow-xs",
      secondary:
        "bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80",
      outline:
        "bg-white hover:bg-slate-50 dark:bg-[#131c2e] dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800",
      ghost:
        "bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-600 dark:text-slate-300 border border-transparent",
      danger:
        "bg-rose-600 hover:bg-rose-700 text-white border border-transparent shadow-xs",
      success:
        "bg-emerald-600 hover:bg-emerald-700 text-white border border-transparent shadow-xs",
    };

    const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
      sm: "h-8 px-3 text-xs rounded-lg gap-1.5",
      md: "h-10 px-4 text-sm rounded-lg gap-2",
      lg: "h-11 px-6 text-sm rounded-xl gap-2.5",
      icon: "h-9 w-9 rounded-lg justify-center",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-semibold transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:pointer-events-none select-none",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

/* ============================================================================
 * CARD
 * ========================================================================== */
export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131c2e] text-slate-900 dark:text-slate-100 shadow-2xs",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 flex flex-col gap-1",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-base font-bold tracking-tight text-slate-900 dark:text-slate-100", className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-xs text-slate-500 dark:text-slate-400", className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-6", className)} {...props}>
      {children}
    </div>
  );
}

/* ============================================================================
 * BADGE
 * ========================================================================== */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "primary" | "pyq" | "model" | "success" | "warning" | "danger" | "outline";
}

export function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  const variants: Record<NonNullable<BadgeProps["variant"]>, string> = {
    default:
      "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    primary:
      "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/80",
    pyq:
      "bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80",
    model:
      "bg-indigo-50/90 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/80",
    success:
      "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80",
    warning:
      "bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/80",
    danger:
      "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/80",
    outline:
      "bg-transparent text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border tracking-tight",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/* ============================================================================
 * INPUT & SELECT
 * ========================================================================== */
export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "w-full h-10 px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 dark:focus:border-blue-500 transition-colors",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "w-full h-10 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 dark:focus:border-blue-500 transition-colors",
      className
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";

/* ============================================================================
 * PROGRESS
 * ========================================================================== */
export function Progress({
  value,
  max = 100,
  className,
  indicatorClassName,
  label,
}: {
  value: number;
  max?: number;
  className?: string;
  indicatorClassName?: string;
  label?: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden", className)}
    >
      <div
        className={cn("h-full rounded-full bg-blue-600 transition-all duration-300", indicatorClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ============================================================================
 * SKELETON
 * ========================================================================== */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-slate-200/70 dark:bg-slate-800/70", className)}
      {...props}
    />
  );
}

/* ============================================================================
 * EMPTY STATE & ERROR STATE
 * ========================================================================== */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131c2e] p-10 text-center flex flex-col items-center justify-center max-w-full",
        className
      )}
    >
      <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center text-slate-500 dark:text-slate-400 mb-3.5">
        {icon || <Inbox className="w-5 h-5" />}
      </div>
      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Unable to complete action",
  message,
  onRetry,
  className,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-xl border border-rose-200 dark:border-rose-900/70 bg-rose-50/70 dark:bg-rose-950/30 p-4 flex items-start gap-3 text-rose-800 dark:text-rose-200",
        className
      )}
    >
      <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
      <div className="flex-1 text-xs">
        <div className="font-bold">{title}</div>
        <div className="mt-0.5 text-rose-700 dark:text-rose-300 leading-relaxed">{message}</div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-2.5 py-1 rounded-md text-xs font-semibold bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 hover:bg-rose-50 transition"
        >
          Retry
        </button>
      )}
    </div>
  );
}

/* ============================================================================
 * DIALOG / MODAL
 * ========================================================================== */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  maxWidth = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        className={cn(
          "bg-white dark:bg-[#131c2e] border border-slate-200 dark:border-slate-800 rounded-xl w-full p-6 shadow-xl my-8 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150",
          maxWidth
        )}
      >
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 id="dialog-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="pt-4">{children}</div>
      </div>
    </div>
  );
}
