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
    <Card className="flex items-start gap-4">
      <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0", colors.bg)}>
        <Icon className={clsx("w-6 h-6", colors.icon)} />
      </div>
      <div>
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
        <p className={clsx("text-2xl font-bold mt-0.5", colors.value)}>
          {value}
          {unit && <span className="text-base font-normal text-slate-400 ml-1">{unit}</span>}
        </p>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </Card>
  );
}
