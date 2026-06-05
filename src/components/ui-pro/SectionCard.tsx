import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  padding = "md",
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
}) {
  const pad = padding === "sm" ? "p-4" : padding === "lg" ? "p-7" : "p-5 md:p-6";
  return (
    <section
      className={cn(
        "rounded-2xl border border-border/70 bg-card/80 shadow-elev-1 backdrop-blur-sm",
        pad,
        className,
      )}
    >
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && (
              <h3 className="font-display text-base font-semibold tracking-tight">{title}</h3>
            )}
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
