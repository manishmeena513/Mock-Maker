import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, Inbox, X } from "lucide-react";

/* ============================================================================
 * BUTTON — Editorial Tactile Controls
 * ========================================================================== */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "accent" | "secondary" | "outline" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
      primary:
        "bg-[var(--primary)] hover:opacity-92 text-[var(--primary-foreground)] border border-transparent shadow-2xs",
      accent:
        "bg-[var(--accent)] hover:opacity-92 text-[var(--accent-foreground)] border border-transparent shadow-2xs",
      secondary:
        "bg-[var(--secondary)] hover:bg-[var(--border)]/60 text-[var(--foreground)] border border-[var(--border)]",
      outline:
        "bg-[var(--card)] hover:bg-[var(--muted)]/70 hover:border-[var(--border-strong)] text-[var(--foreground)] border border-[var(--border)]",
      ghost:
        "bg-transparent hover:bg-[var(--muted)]/70 text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-transparent",
      danger:
        "bg-[var(--destructive)] hover:opacity-92 text-white border border-transparent",
      success:
        "bg-[var(--sage)] hover:opacity-92 text-white border border-transparent",
    };

    const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
      sm: "h-8 px-3 text-xs rounded-md gap-1.5",
      md: "h-9 px-4 text-xs rounded-md gap-2",
      lg: "h-11 px-5 text-sm rounded-md gap-2.5",
      icon: "h-9 w-9 sm:h-8 sm:w-8 rounded-md justify-center",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "mm-btn-press inline-flex items-center justify-center font-medium tracking-[-0.01em] cursor-pointer disabled:opacity-50 disabled:pointer-events-none select-none",
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
 * CARD — Restrained Architectural Surface
 * ========================================================================== */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export function Card({
  className,
  interactive = false,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] min-w-0",
        interactive && "mm-card-interactive",
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
        "px-5 py-4 border-b border-[var(--border)] flex flex-col gap-1 min-w-0",
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
      className={cn("text-sm font-semibold tracking-tight text-[var(--foreground)]", className)}
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
    <p className={cn("text-xs text-[var(--muted-foreground)]", className)} {...props}>
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
    <div className={cn("p-5 min-w-0", className)} {...props}>
      {children}
    </div>
  );
}

/* ============================================================================
 * BADGE — Editorial Status & Taxonomy Pill
 * ========================================================================== */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "primary" | "pyq" | "model" | "success" | "warning" | "danger" | "outline";
}

export function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  const variants: Record<NonNullable<BadgeProps["variant"]>, string> = {
    default:
      "bg-[var(--muted)] text-[var(--foreground)] border-[var(--border)]",
    primary:
      "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent-border)]",
    pyq:
      "bg-[var(--sage-soft)] text-[var(--sage)] border-[var(--sage-border)]",
    model:
      "bg-[var(--plum-soft)] text-[var(--plum)] border-[var(--plum-border)]",
    success:
      "bg-[var(--sage-soft)] text-[var(--sage)] border-[var(--sage-border)]",
    warning:
      "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent-border)]",
    danger:
      "bg-rose-500/10 text-[var(--destructive)] border-rose-500/25",
    outline:
      "bg-transparent text-[var(--muted-foreground)] border-[var(--border)]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border tracking-tight",
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
      "w-full h-10 sm:h-9 px-3 py-1.5 text-base sm:text-xs rounded-md border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--accent)] transition-colors",
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
      "w-full h-10 sm:h-9 px-3 py-1.5 text-base sm:text-xs font-medium rounded-md border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] transition-colors",
      className
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";

/* ============================================================================
 * PROGRESS — Precision Calibration Bar
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
      className={cn("w-full h-1.5 rounded-full bg-[var(--muted)] overflow-hidden", className)}
    >
      <div
        className={cn("h-full rounded-full bg-[var(--accent)] transition-all duration-300", indicatorClassName)}
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
      className={cn("mm-skeleton rounded-md bg-[var(--muted)]", className)}
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
        "rounded-lg border border-[var(--border)] bg-[var(--card)] p-8 text-center flex flex-col items-center justify-center max-w-full animate-fade-in",
        className
      )}
    >
      <div className="w-9 h-9 rounded-md bg-[var(--muted)] border border-[var(--border)] flex items-center justify-center text-[var(--muted-foreground)] mb-3">
        {icon || <Inbox className="w-4 h-4" />}
      </div>
      <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
      <p className="text-xs text-[var(--muted-foreground)] max-w-sm mt-1 leading-relaxed">
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
        "rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 flex items-start gap-3 text-[var(--foreground)] animate-fade-in",
        className
      )}
    >
      <AlertCircle className="w-4 h-4 text-[var(--destructive)] shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 text-xs">
        <div className="font-semibold">{title}</div>
        <div className="mt-0.5 text-[var(--muted-foreground)] leading-relaxed break-words">{message}</div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mm-btn-press px-2.5 py-1 rounded text-xs font-medium bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--muted)] transition shrink-0"
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
  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
    >
      <div
        className={cn(
          "bg-[var(--card)] border border-[var(--border)] rounded-lg w-full p-5 sm:p-6 shadow-xl my-auto max-h-[88dvh] overflow-y-auto touch-scroll animate-scale-in",
          maxWidth
        )}
      >
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--border)]">
          <div className="min-w-0">
            <h3 id="dialog-title" className="text-base font-semibold text-[var(--foreground)]">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="mm-btn-press p-1.5 rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="pt-4">{children}</div>
      </div>
    </div>
  );
}
