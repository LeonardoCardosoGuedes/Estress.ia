"use client";

import {
  ComposedChart,
  Bar,
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

interface CaffeineStressChartProps {
  records: DailyRecord[];
}

export function CaffeineStressChart({ records }: CaffeineStressChartProps) {
  const data = chronological(records).map((record) => ({
    date: formatDate(record.date).slice(0, 5),
    Cafeina: record.caffeineIntakeMgPerDay,
    Estresse: record.stress,
  }));
  const avgCaffeine = average(records.map((record) => record.caffeineIntakeMgPerDay));
  const highCaffeineRecords = records.filter((record) => record.caffeineIntakeMgPerDay >= 250);
  const highCaffeineStress = average(highCaffeineRecords.map((record) => record.stress));
  const normalCaffeineRecords = records.filter((record) => record.caffeineIntakeMgPerDay < 250);
  const normalCaffeineStress = average(normalCaffeineRecords.map((record) => record.stress));
  const interpretation =
    highCaffeineRecords.length > 0 && normalCaffeineRecords.length > 0
      ? `A cafeina media foi ${formatNumber(avgCaffeine, 0)}mg/dia. Nos ${highCaffeineRecords.length} registro(s) com 250mg ou mais, o estresse medio foi ${formatNumber(highCaffeineStress)}, contra ${formatNumber(normalCaffeineStress)} nos demais dias.`
      : `A cafeina media foi ${formatNumber(avgCaffeine, 0)}mg/dia. Nao ha contraste suficiente entre dias acima e abaixo de 250mg para comparar grupos nesse periodo.`;

  return (
    <Card className="min-w-0 overflow-hidden">
      <h3 className="mb-6 font-semibold text-slate-800">Cafeina e estresse previsto</h3>
      <div className="h-64 sm:h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 5, right: 4, left: -24, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#94a3b8" }} interval="preserveStartEnd" />
            <YAxis yAxisId="left" domain={[0, 10]} tick={{ fontSize: 12, fill: "#94a3b8" }} />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 12, fill: "#94a3b8" }}
              width={44}
            />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
            />
            <Legend wrapperStyle={{ fontSize: 13 }} />
            <Bar yAxisId="right" dataKey="Cafeina" fill="#f97316" radius={[4, 4, 0, 0]} />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="Estresse"
              stroke="#dc2626"
              strokeWidth={2.5}
              dot={{ r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <ChartInsight>{interpretation}</ChartInsight>
    </Card>
  );
}

