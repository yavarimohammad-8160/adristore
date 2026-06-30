import { cn } from "@/lib/utils";

interface KimdiBadgeProps {
  size?: "sm" | "md";
  className?: string;
}

export function KimdiBadge({ size = "sm", className }: KimdiBadgeProps) {
  return (
    <span
      className={cn(
        "kimdi-badge inline-flex items-center gap-0.5 font-black tracking-wide",
        size === "sm" ? "kimdi-badge--sm" : "kimdi-badge--md",
        className
      )}
      title="برند Kimdi"
    >
      <span className="kimdi-badge__icon" aria-hidden>
        K
      </span>
      Kimdi
    </span>
  );
}