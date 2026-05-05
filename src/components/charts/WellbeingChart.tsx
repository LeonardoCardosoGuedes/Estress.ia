"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { DailyRecord } from "@/types/dailyRecord";
import { formatDate, getWellbeingScore } from "@/lib/recommendations";
import { Card } from "@/components/ui/Card";

interface WellbeingChartProps {
  records: DailyRecord[];
}

export function WellbeingChart({ records }: WellbeingChartProps) {
  const data = [...records]
    .slice(0, 14)
    .reverse()
    .map((r) => ({
      date: formatDate(r.date).slice(0, 5),
      "Bem-estar": getWellbeingScore(r),
    }));

  return (
    <Card>
      <h3 className="font-semibold text-slate-800 mb-6">Evolução do Bem-estar</h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <defs>
            <linearGradient id="wellbeing" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#94a3b8" }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "#94a3b8" }} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
          />
          <Area
            type="monotone"
            dataKey="Bem-estar"
            stroke="#0ea5e9"
            strokeWidth={2.5}
            fill="url(#wellbeing)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}
