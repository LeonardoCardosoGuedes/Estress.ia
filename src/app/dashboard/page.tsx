"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RiskIndicator } from "@/components/dashboard/RiskIndicator";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { RecommendationsPanel } from "@/components/dashboard/RecommendationsPanel";
import { WeeklyChart } from "@/components/charts/WeeklyChart";
import { useAuth } from "@/hooks/useAuth";
import { useDailyRecords } from "@/hooks/useDailyRecords";
import { analyzeFatigue, detectAlerts } from "@/lib/fatigueAnalysis";
import { formatDate } from "@/lib/recommendations";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import {
  Moon,
  Monitor,
  BookOpen,
  Smile,
  Zap,
  Coffee,
  Heart,
  CalendarPlus,
} from "lucide-react";

export default function DashboardPage() {
  return (
    <AuthGuard>
      <AppLayout>
        <DashboardContent />
      </AppLayout>
    </AuthGuard>
  );
}

function DashboardContent() {
  const { profile } = useAuth();
  const { records, loading } = useDailyRecords(profile?.uid);

  const latest = records[0];
  const analysis = analyzeFatigue(records);
  const alerts = detectAlerts(records);

  const firstName = profile?.name?.split(" ")[0] ?? "Estudante";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 text-sm">Carregando dados...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">
            {greeting}, {firstName}! 👋
          </h2>
          <p className="text-slate-500 mt-1">
            {latest
              ? `Último registro: ${formatDate(latest.date)}`
              : "Nenhum registro ainda — comece hoje!"}
          </p>
        </div>
        <Link href="/registro">
          <Button size="lg" className="flex items-center gap-2">
            <CalendarPlus className="w-5 h-5" />
            Registrar hoje
          </Button>
        </Link>
      </div>

      {records.length === 0 ? (
        <div className="bg-blue-50 rounded-2xl p-8 text-center border border-blue-100">
          <Heart className="w-12 h-12 text-blue-400 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-800 text-lg mb-2">Bem-vindo ao Stressia!</h3>
          <p className="text-slate-500 max-w-md mx-auto text-sm mb-4">
            Faça seu primeiro registro diário para começar a monitorar sua saúde mental e receber insights personalizados.
          </p>
          <Link href="/registro">
            <Button>Fazer primeiro registro</Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Métricas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Sono"
              value={latest?.sleepHours ?? "–"}
              unit="h"
              icon={Moon}
              color="blue"
              subtitle={`Qualidade: ${latest?.sleepQuality ?? "–"}/5`}
            />
            <MetricCard
              label="Tempo de Tela"
              value={latest?.screenTime ?? "–"}
              unit="h"
              icon={Monitor}
              color="amber"
            />
            <MetricCard
              label="Estudo"
              value={latest?.studyTime ?? "–"}
              unit="h"
              icon={BookOpen}
              color="purple"
            />
            <MetricCard
              label="Lazer"
              value={latest?.leisureTime ?? "–"}
              unit="h"
              icon={Coffee}
              color="green"
            />
            <MetricCard
              label="Humor"
              value={latest ? `${latest.mood}/5` : "–"}
              icon={Smile}
              color="green"
            />
            <MetricCard
              label="Cansaço"
              value={latest ? `${latest.tiredness}/5` : "–"}
              icon={Zap}
              color={latest?.tiredness >= 4 ? "red" : "amber"}
            />
            <MetricCard
              label="Estresse"
              value={latest ? `${latest.stress}/5` : "–"}
              icon={Heart}
              color={latest?.stress >= 4 ? "red" : "blue"}
            />
          </div>

          {/* Risco + Alertas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RiskIndicator analysis={analysis} />
            <AlertsPanel alerts={alerts} />
          </div>

          {/* Recomendações */}
          <RecommendationsPanel recommendations={analysis.recommendations} />

          {/* Gráfico semanal */}
          {records.length >= 2 && <WeeklyChart records={records} />}
        </>
      )}
    </div>
  );
}
