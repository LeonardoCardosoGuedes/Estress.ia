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
import { average, chronological, formatNumber } from "@/lib/chartAnalysis";
import { Card } from "@/components/ui/Card";
import { ChartInsight } from "@/components/charts/ChartInsight";

interface WeeklyChartProps {
  records: DailyRecord[];
}

export function WeeklyChart({ records }: WeeklyChartProps) {
  const ordered = chronological(records);
  const data = ordered.map((record) => ({
    date: formatDate(record.date).slice(0, 5),
    Sono: record.sleepHours,
    Tela: record.screenTime,
    "Redes sociais": record.socialMediaHours,
    Jogos: record.gamingHours,
  }));
  const avgSleep = average(records.map((record) => record.sleepHours));
  const avgScreen = average(records.map((record) => record.screenTime));
  const avgSocial = average(records.map((record) => record.socialMediaHours));
  const avgGaming = average(records.map((record) => record.gamingHours));
  const screenDelta = Math.abs(avgScreen - avgSleep);
  const interpretation =
    avgScreen >= avgSleep
      ? `A tela media ficou em ${formatNumber(avgScreen)}h/dia, ${formatNumber(screenDelta)}h acima do sono medio (${formatNumber(avgSleep)}h). Redes sociais e jogos somam ${formatNumber(avgSocial + avgGaming)}h/dia em media.`
      : `O sono medio (${formatNumber(avgSleep)}h) ficou ${formatNumber(screenDelta)}h acima da tela media (${formatNumber(avgScreen)}h), um sinal de rotina mais equilibrada no periodo. Redes sociais e jogos somam ${formatNumber(avgSocial + avgGaming)}h/dia.`;

  return (
    <Card className="min-w-0 overflow-hidden">
      <h3 className="mb-6 font-semibold text-slate-800">Evolucao de horas</h3>
      <div className="h-72 sm:h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 4, left: -24, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#94a3b8" }} interval="preserveStartEnd" />
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
      <ChartInsight>{interpretation}</ChartInsight>
    </Card>
  );
}

