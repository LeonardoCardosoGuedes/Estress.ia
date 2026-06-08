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
  MessageCircle,
  Gamepad2,
  Coffee,
  Heart,
  CalendarPlus,
  MapPin,
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
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 text-sm">Carregando dados...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-black text-slate-900 sm:text-2xl">
            {greeting}, {firstName}!
          </h2>
          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            {latest
              ? `Ultimo registro: ${formatDate(latest.date)}`
              : "Nenhum registro ainda - comece hoje!"}
          </p>
        </div>
        <Link href="/registro" className="w-full sm:w-auto">
          <Button size="lg" className="flex w-full items-center justify-center gap-2 sm:w-auto">
            <CalendarPlus className="w-5 h-5" />
            Registrar hoje
          </Button>
        </Link>
      </div>

      {records.length === 0 ? (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6 text-center sm:p-8">
          <Heart className="w-12 h-12 text-blue-400 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-800 text-lg mb-2">Bem-vindo ao Stressia!</h3>
          <p className="text-slate-500 max-w-md mx-auto text-sm mb-4">
            Faca seu primeiro registro para prever o nivel de estresse e receber insights personalizados.
          </p>
          <Link href="/registro">
            <Button>Fazer primeiro registro</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Sono"
              value={latest?.sleepHours ?? "-"}
              unit="h"
              icon={Moon}
              color="blue"
              subtitle={`Qualidade: ${latest?.sleepQuality ?? "-"}/10`}
            />
            <MetricCard
              label="Tela"
              value={latest?.screenTime ?? "-"}
              unit="h"
              icon={Monitor}
              color="amber"
            />
            <MetricCard
              label="Redes sociais"
              value={latest?.socialMediaHours ?? "-"}
              unit="h"
              icon={MessageCircle}
              color="purple"
            />
            <MetricCard
              label="Jogos"
              value={latest?.gamingHours ?? "-"}
              unit="h"
              icon={Gamepad2}
              color="green"
            />
            <MetricCard
              label="Cafeina"
              value={latest?.caffeineIntakeMgPerDay ?? "-"}
              unit="mg"
              icon={Coffee}
              color="amber"
            />
            <MetricCard
              label="Local"
              value={latest?.locationType ?? "-"}
              icon={MapPin}
              color="blue"
            />
            <MetricCard
              label="Estresse previsto"
              value={latest ? latest.stress.toFixed(1) : "-"}
              icon={Heart}
              color={latest && latest.stress >= 7 ? "red" : "blue"}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RiskIndicator analysis={analysis} />
            <AlertsPanel alerts={alerts} />
          </div>

          <RecommendationsPanel recommendations={analysis.recommendations} />

          {records.length >= 2 && <WeeklyChart records={records} />}
        </>
      )}
    </div>
  );
}
