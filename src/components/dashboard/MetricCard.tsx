import { Card } from "@/components/ui/Card";
import { LucideIcon } from "lucide-react";
import { clsx } from "clsx";

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  color?: "blue" | "purple" | "green" | "amber" | "red";
  subtitle?: string;
}

const colorMap = {
  blue: { bg: "bg-blue-50", icon: "text-blue-600", value: "text-blue-700" },
  purple: { bg: "bg-purple-50", icon: "text-purple-600", value: "text-purple-700" },
  green: { bg: "bg-green-50", icon: "text-green-600", value: "text-green-700" },
  amber: { bg: "bg-amber-50", icon: "text-amber-600", value: "text-amber-700" },
  red: { bg: "bg-red-50", icon: "text-red-600", value: "text-red-700" },
};

export function MetricCard({
  label,
  value,
  unit,
  icon: Icon,
  color = "blue",
  subtitle,
}: MetricCardProps) {
  const colors = colorMap[color];

  return (
    <Card className="flex min-w-0 items-start gap-3 sm:gap-4">
      <div className={clsx("flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12", colors.bg)}>
        <Icon className={clsx("h-5 w-5 sm:h-6 sm:w-6", colors.icon)} />
      </div>
      <div className="min-w-0">
        <p className="break-words text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className={clsx("mt-0.5 break-words text-xl font-bold sm:text-2xl", colors.value)}>
          {value}
          {unit && <span className="text-base font-normal text-slate-400 ml-1">{unit}</span>}
        </p>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </Card>
  );
}
