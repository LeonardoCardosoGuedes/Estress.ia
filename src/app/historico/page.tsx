"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { Card } from "@/components/ui/Card";
import { WellbeingChart } from "@/components/charts/WellbeingChart";
import { WeeklyChart } from "@/components/charts/WeeklyChart";
import { StressChart } from "@/components/charts/StressChart";
import { CaffeineStressChart } from "@/components/charts/CaffeineStressChart";
import { StressDistributionChart } from "@/components/charts/StressDistributionChart";
import { useAuth } from "@/hooks/useAuth";
import { useDailyRecords } from "@/hooks/useDailyRecords";
import { formatDate, getWellbeingScore } from "@/lib/recommendations";
import { Moon, Monitor, MessageCircle, Gamepad2, Coffee, Heart } from "lucide-react";

export default function HistoricoPage() {
  return (
    <AuthGuard>
      <AppLayout>
        <HistoricoContent />
      </AppLayout>
    </AuthGuard>
  );
}

function HistoricoContent() {
  const { profile } = useAuth();
  const { records, loading } = useDailyRecords(profile?.uid);
  const [filter, setFilter] = useState<7 | 14 | 30>(7);

  const filtered = records.slice(0, filter);

  if (loading) {
    return <div className="text-slate-400 text-sm">Carregando historico...</div>;
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Nenhum registro encontrado. Comece registrando seu primeiro dia!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-black text-slate-900 sm:text-2xl">Historico</h2>
          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            {records.length} registros encontrados
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-shrink-0">
          {([7, 14, 30] as const).map((n) => (
            <button
              key={n}
              onClick={() => setFilter(n)}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition-all sm:px-4 ${
                filter === n
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-blue-300"
              }`}
            >
              {n} dias
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Visualizacoes com interpretacao</h3>
          <p className="mt-1 text-sm text-slate-500">
            5 leituras calculadas com os registros reais do periodo selecionado.
          </p>
        </div>
        <WellbeingChart records={filtered} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WeeklyChart records={filtered} />
          <StressChart records={filtered} />
          <CaffeineStressChart records={filtered} />
          <StressDistributionChart records={filtered} />
        </div>
      </div>

      <Card padding="none">
        <div className="border-b border-slate-100 p-4 sm:p-6">
          <h3 className="font-semibold text-slate-800">Registros recentes</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {filtered.map((record) => (
            <div key={record.id} className="p-4 transition-colors hover:bg-slate-50">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-semibold text-slate-800">{formatDate(record.date)}</span>
                <span className="w-fit rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-600">
                  Bem-estar: {getWellbeingScore(record)}/100
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <MetricBadge icon={Moon} label="Sono" value={`${record.sleepHours}h`} />
                <MetricBadge icon={Monitor} label="Tela" value={`${record.screenTime}h`} />
                <MetricBadge icon={MessageCircle} label="Social" value={`${record.socialMediaHours}h`} />
                <MetricBadge icon={Gamepad2} label="Jogos" value={`${record.gamingHours}h`} />
                <MetricBadge icon={Coffee} label="Cafeina" value={`${record.caffeineIntakeMgPerDay}mg`} />
                <MetricBadge icon={Heart} label="MLflow" value={record.stress.toFixed(1)} />
              </div>
              {record.notes && (
                <p className="mt-3 break-words text-sm italic text-slate-500">"{record.notes}"</p>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function MetricBadge({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1 rounded-xl bg-slate-50 p-2 text-center">
      <Icon className="w-4 h-4 text-slate-400" />
      <span className="max-w-full truncate text-xs font-semibold text-slate-700">{value}</span>
      <span className="max-w-full truncate text-xs text-slate-400">{label}</span>
    </div>
  );
}
