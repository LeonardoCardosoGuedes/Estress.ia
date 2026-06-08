"use client";

import {
  LineChart,
  Line,
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

interface WeeklyChartProps {
  records: DailyRecord[];
}

export function WeeklyChart({ records }: WeeklyChartProps) {
  const data = [...records]
    .slice(0, 7)
    .reverse()
    .map((r) => ({
      date: formatDate(r.date).slice(0, 5),
      Sono: r.sleepHours,
      Tela: r.screenTime,
      "Redes sociais": r.socialMediaHours,
      Jogos: r.gamingHours,
    }));

  return (
    <Card className="min-w-0 overflow-hidden">
      <h3 className="font-semibold text-slate-800 mb-6">Evolucao semanal - horas</h3>
      <div className="h-72 sm:h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 4, left: -24, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#94a3b8" }} />
          <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
          />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          <Line type="monotone" dataKey="Sono" stroke="#0ea5e9" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Tela" stroke="#f59e0b" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Redes sociais" stroke="#8b5cf6" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Jogos" stroke="#22c55e" strokeWidth={2} dot={false} />
        </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
