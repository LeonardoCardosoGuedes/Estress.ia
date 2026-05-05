"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { DailyRecord } from "@/types/dailyRecord";
import { formatDate } from "@/lib/recommendations";
import { Card } from "@/components/ui/Card";

interface StressChartProps {
  records: DailyRecord[];
}

export function StressChart({ records }: StressChartProps) {
  const data = [...records]
    .slice(0, 7)
    .reverse()
    .map((r) => ({
      date: formatDate(r.date).slice(0, 5),
      Estresse: r.stress,
      Cansaço: r.tiredness,
      Humor: r.mood,
    }));

  return (
    <Card>
      <h3 className="font-semibold text-slate-800 mb-6">Estresse, Cansaço e Humor</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#94a3b8" }} />
          <YAxis domain={[0, 5]} tick={{ fontSize: 12, fill: "#94a3b8" }} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
          />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          <Bar dataKey="Estresse" fill="#ef4444" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Cansaço" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Humor" fill="#22c55e" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
