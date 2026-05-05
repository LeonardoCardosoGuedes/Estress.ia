"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { Card } from "@/components/ui/Card";
import { WellbeingChart } from "@/components/charts/WellbeingChart";
import { WeeklyChart } from "@/components/charts/WeeklyChart";
import { StressChart } from "@/components/charts/StressChart";
import { useAuth } from "@/hooks/useAuth";
import { useDailyRecords } from "@/hooks/useDailyRecords";
import { formatDate, getWellbeingScore } from "@/lib/recommendations";
import { Moon, Monitor, BookOpen, Coffee, Smile, Zap, Heart } from "lucide-react";

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
    return <div className="text-slate-400 text-sm">Carregando histórico...</div>;
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Nenhum registro encontrado. Comece registrando seu primeiro dia!</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Histórico</h2>
          <p className="text-slate-500 mt-1">{records.length} registros encontrados</p>
        </div>
        <div className="flex gap-2">
          {([7, 14, 30] as const).map((n) => (
            <button
              key={n}
              onClick={() => setFilter(n)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
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

      {/* Gráficos */}
      <div className="space-y-6">
        <WellbeingChart records={filtered} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WeeklyChart records={filtered} />
          <StressChart records={filtered} />
        </div>
      </div>

      {/* Tabela de registros */}
      <Card padding="none">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Registros recentes</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {filtered.map((record) => (
            <div key={record.id} className="p-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-slate-800">{formatDate(record.date)}</span>
                <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                  Bem-estar: {getWellbeingScore(record)}/100
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                <MetricBadge icon={Moon} label="Sono" value={`${record.sleepHours}h`} />
                <MetricBadge icon={Monitor} label="Tela" value={`${record.screenTime}h`} />
                <MetricBadge icon={BookOpen} label="Estudo" value={`${record.studyTime}h`} />
                <MetricBadge icon={Coffee} label="Lazer" value={`${record.leisureTime}h`} />
                <MetricBadge icon={Smile} label="Humor" value={`${record.mood}/5`} />
                <MetricBadge icon={Heart} label="Estresse" value={`${record.stress}/5`} />
              </div>
              {record.notes && (
                <p className="mt-3 text-sm text-slate-500 italic">"{record.notes}"</p>
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
    <div className="flex flex-col items-center gap-1 bg-slate-50 rounded-xl p-2">
      <Icon className="w-4 h-4 text-slate-400" />
      <span className="text-xs font-semibold text-slate-700">{value}</span>
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  );
}
