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
import { chronological, formatNumber } from "@/lib/chartAnalysis";
import { Card } from "@/components/ui/Card";
import { ChartInsight } from "@/components/charts/ChartInsight";

interface WellbeingChartProps {
  records: DailyRecord[];
}

export function WellbeingChart({ records }: WellbeingChartProps) {
  const ordered = chronological(records);
  const data = ordered.map((record) => ({
    date: formatDate(record.date).slice(0, 5),
    "Bem-estar": getWellbeingScore(record),
  }));
  const firstScore = data[0]?.["Bem-estar"] ?? 0;
  const lastScore = data[data.length - 1]?.["Bem-estar"] ?? 0;
  const avgScore = data.length
    ? data.reduce((total, item) => total + item["Bem-estar"], 0) / data.length
    : 0;
  const scoreDelta = lastScore - firstScore;
  const bestRecord = ordered.reduce<DailyRecord | null>((best, record) => {
    if (!best) return record;
    return getWellbeingScore(record) > getWellbeingScore(best) ? record : best;
  }, null);
  const trendText =
    scoreDelta === 0
      ? "permaneceu estavel"
      : `variou ${scoreDelta > 0 ? "positivamente" : "negativamente"} em ${formatNumber(Math.abs(scoreDelta), 0)} pontos`;
  const interpretation =
    records.length === 1
      ? `O unico registro do periodo tem bem-estar ${lastScore}/100, sono de ${formatNumber(ordered[0]?.sleepHours ?? 0)}h e estresse previsto ${formatNumber(ordered[0]?.stress ?? 0)}.`
      : `No periodo filtrado, o bem-estar medio foi ${formatNumber(avgScore)}/100 e ${trendText}. O melhor ponto aparece em ${bestRecord ? formatDate(bestRecord.date) : "-"}, com ${bestRecord ? getWellbeingScore(bestRecord) : 0}/100.`;

  return (
    <Card className="min-w-0 overflow-hidden">
      <h3 className="mb-6 font-semibold text-slate-800">Evolucao do bem-estar</h3>
      <div className="h-64 sm:h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 4, left: -24, bottom: 5 }}>
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
      </div>
      <ChartInsight>{interpretation}</ChartInsight>
    </Card>
  );
}
