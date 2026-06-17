"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { DailyRecord } from "@/types/dailyRecord";
import { formatNumber } from "@/lib/chartAnalysis";
import { Card } from "@/components/ui/Card";
import { ChartInsight } from "@/components/charts/ChartInsight";

interface StressDistributionChartProps {
  records: DailyRecord[];
}

const STRESS_BUCKETS = [
  { name: "Baixo", color: "#22c55e", test: (stress: number) => stress < 4 },
  { name: "Moderado", color: "#f59e0b", test: (stress: number) => stress >= 4 && stress < 7 },
  { name: "Alto", color: "#ef4444", test: (stress: number) => stress >= 7 },
];

export function StressDistributionChart({ records }: StressDistributionChartProps) {
  const data = STRESS_BUCKETS.map((bucket) => ({
    name: bucket.name,
    Registros: records.filter((record) => bucket.test(record.stress)).length,
    color: bucket.color,
  }));
  const total = records.length;
  const dominant = data.reduce((current, item) => (item.Registros > current.Registros ? item : current), data[0]);
  const highCount = data.find((item) => item.name === "Alto")?.Registros ?? 0;
  const highPercent = total ? (highCount / total) * 100 : 0;
  const interpretation =
    highCount > 0
      ? `${highCount} de ${total} registro(s), ou ${formatNumber(highPercent, 0)}%, ficaram na faixa alta de estresse previsto. A faixa mais frequente foi "${dominant.name}", com ${dominant.Registros} registro(s).`
      : `Nenhum registro ficou na faixa alta de estresse previsto. A faixa mais frequente foi "${dominant.name}", com ${dominant.Registros} de ${total} registro(s).`;

  return (
    <Card className="min-w-0 overflow-hidden">
      <h3 className="mb-6 font-semibold text-slate-800">Distribuicao do estresse previsto</h3>
      <div className="h-64 sm:h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 4, left: -24, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#94a3b8" }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
            />
            <Bar dataKey="Registros" radius={[4, 4, 0, 0]}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartInsight>{interpretation}</ChartInsight>
    </Card>
  );
}

