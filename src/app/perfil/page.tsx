"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useDailyRecords } from "@/hooks/useDailyRecords";
import { analyzeFatigue } from "@/lib/fatigueAnalysis";
import { getRiskLabel, getRiskColor } from "@/lib/recommendations";
import { useRouter } from "next/navigation";
import { User, BookOpen, Building2, GraduationCap, Mail, LogOut } from "lucide-react";

export default function PerfilPage() {
  return (
    <AuthGuard>
      <AppLayout>
        <PerfilContent />
      </AppLayout>
    </AuthGuard>
  );
}

function PerfilContent() {
  const { profile, logout } = useAuth();
  const { records } = useDailyRecords(profile?.uid);
  const router = useRouter();
  const analysis = analyzeFatigue(records);

  async function handleSignOut() {
    await logout();
    router.push("/login");
  }

  if (!profile) return null;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-black text-slate-900 sm:text-2xl">Perfil</h2>
        <p className="text-slate-500 mt-1">Informações da sua conta e resumo acadêmico</p>
      </div>

      {/* Avatar + Nome */}
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-100 sm:h-20 sm:w-20">
            <User className="h-8 w-8 text-blue-600 sm:h-10 sm:w-10" />
          </div>
          <div className="min-w-0">
            <h3 className="break-words text-lg font-bold text-slate-900 sm:text-xl">{profile.name}</h3>
            <p className="mt-0.5 break-words text-sm text-slate-500">{profile.course}</p>
            <span
              className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: getRiskColor(analysis.level) }}
            >
              {getRiskLabel(analysis.level)} · {analysis.score}/100
            </span>
          </div>
        </div>
      </Card>

      {/* Dados do perfil */}
      <Card>
        <h3 className="font-semibold text-slate-800 mb-4">Informações acadêmicas</h3>
        <div className="space-y-4">
          <InfoRow icon={Mail} label="E-mail" value={profile.email} />
          <InfoRow icon={BookOpen} label="Curso" value={profile.course} />
          <InfoRow icon={Building2} label="Instituição" value={profile.institution} />
          <InfoRow icon={GraduationCap} label="Período" value={profile.semester} />
        </div>
      </Card>

      {/* Estatísticas */}
      <Card>
        <h3 className="font-semibold text-slate-800 mb-4">Estatísticas</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatBox label="Registros totais" value={records.length.toString()} />
          <StatBox
            label="Média de sono"
            value={
              records.length > 0
                ? `${(records.reduce((a, r) => a + r.sleepHours, 0) / records.length).toFixed(1)}h`
                : "–"
            }
          />
          <StatBox
            label="Média de estresse"
            value={
              records.length > 0
                ? `${(records.reduce((a, r) => a + r.stress, 0) / records.length).toFixed(1)}`
                : "–"
            }
          />
          <StatBox
            label="Média de humor"
            value={
              records.length > 0
                ? `${(records.reduce((a, r) => a + r.screenTime, 0) / records.length).toFixed(1)}h`
                : "–"
            }
          />
        </div>
      </Card>

      {/* Sair */}
      <Button
        variant="danger"
        size="lg"
        className="w-full flex items-center gap-2 justify-center"
        onClick={handleSignOut}
      >
        <LogOut className="w-5 h-5" />
        Sair da conta
      </Button>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-3">
      <Icon className="w-5 h-5 text-slate-400 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        <p className="mt-0.5 break-words text-sm font-medium text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 p-4 text-center">
      <p className="break-words text-2xl font-black text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  );
}
