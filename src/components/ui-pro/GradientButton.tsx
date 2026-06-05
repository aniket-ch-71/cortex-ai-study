import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

type Props = ComponentPropsWithoutRef<"button"> & {
  size?: "sm" | "md" | "lg";
};

export function GradientButton({ className, size = "md", children, ...props }: Props) {
  const sizeCls =
    size === "sm"
      ? "px-3.5 py-2 text-sm"
      : size === "lg"
        ? "px-6 py-3.5 text-[15px]"
        : "px-5 py-2.5 text-sm";
  return (
    <button
      {...props}
      className={cn(
        "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl font-medium text-white shadow-elev-2 transition hover:shadow-glow-blue focus-ring disabled:opacity-60",
        sizeCls,
        className,
      )}
    >
      <span className="absolute inset-0 gradient-brand-bg animate-gradient" />
      <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </button>
  );
}
