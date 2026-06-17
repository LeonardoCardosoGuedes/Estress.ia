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
import { average, chronological, formatNumber } from "@/lib/chartAnalysis";
import { Card } from "@/components/ui/Card";
import { ChartInsight } from "@/components/charts/ChartInsight";

interface StressChartProps {
  records: DailyRecord[];
}

export function StressChart({ records }: StressChartProps) {
  const data = chronological(records).map((record) => ({
    date: formatDate(record.date).slice(0, 5),
    Estresse: record.stress,
    "Qualidade do sono": record.sleepQuality,
  }));
  const avgStress = average(records.map((record) => record.stress));
  const avgSleepQuality = average(records.map((record) => record.sleepQuality));
  const highStressDays = records.filter((record) => record.stress >= 7).length;
  const interpretation =
    highStressDays > 0
      ? `O estresse medio previsto foi ${formatNumber(avgStress)} e houve ${highStressDays} registro(s) com estresse alto. A qualidade media do sono ficou em ${formatNumber(avgSleepQuality)}/10.`
      : `O estresse previsto ficou concentrado abaixo de 7, com media ${formatNumber(avgStress)}. A qualidade media do sono foi ${formatNumber(avgSleepQuality)}/10 no periodo.`;

  return (
    <Card className="min-w-0 overflow-hidden">
      <h3 className="mb-6 font-semibold text-slate-800">Estresse previsto e qualidade do sono</h3>
      <div className="h-64 sm:h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 4, left: -24, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#94a3b8" }} interval="preserveStartEnd" />
            <YAxis domain={[0, 10]} tick={{ fontSize: 12, fill: "#94a3b8" }} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
            />
            <Legend wrapperStyle={{ fontSize: 13 }} />
            <Bar dataKey="Estresse" fill="#ef4444" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Qualidade do sono" fill="#22c55e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartInsight>{interpretation}</ChartInsight>
    </Card>
  );
}

