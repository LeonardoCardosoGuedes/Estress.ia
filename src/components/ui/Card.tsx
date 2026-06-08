import { HTMLAttributes } from "react";
import { clsx } from "clsx";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
}

export function Card({ children, className, padding = "md", ...props }: CardProps) {
  return (
    <div
      className={clsx(
        "bg-white rounded-2xl border border-slate-100 shadow-sm",
        {
          "p-0": padding === "none",
          "p-4": padding === "sm",
          "p-4 sm:p-6": padding === "md",
          "p-6 sm:p-8": padding === "lg",
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
