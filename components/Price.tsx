import { cn } from "@/lib/utils";

interface PriceProps {
  value: number;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showCurrency?: boolean;
}

const sizeClasses = {
  sm: "text-sm",
  md: "text-lg",
  lg: "text-2xl",
  xl: "text-4xl md:text-5xl",
};

export function Price({ value, className, size = "md", showCurrency = true }: PriceProps) {
  const formatted = Math.round(value).toLocaleString("fa-IR");
  return (
    <span className={cn("price-tag font-black text-[#fbbf24]", sizeClasses[size], className)}>
      {formatted}
      {showCurrency && " تومان"}
    </span>
  );
}