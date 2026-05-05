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
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900">Perfil</h2>
        <p className="text-slate-500 mt-1">Informações da sua conta e resumo acadêmico</p>
      </div>

      {/* Avatar + Nome */}
      <Card>
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0">
            <User className="w-10 h-10 text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">{profile.name}</h3>
            <p className="text-slate-500 text-sm mt-0.5">{profile.course}</p>
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
        <div className="grid grid-cols-2 gap-4">
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
                ? `${(records.reduce((a, r) => a + r.stress, 0) / records.length).toFixed(1)}/5`
                : "–"
            }
          />
          <StatBox
            label="Média de humor"
            value={
              records.length > 0
                ? `${(records.reduce((a, r) => a + r.mood, 0) / records.length).toFixed(1)}/5`
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
    <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
      <Icon className="w-5 h-5 text-slate-400 flex-shrink-0" />
      <div>
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        <p className="text-sm text-slate-800 font-medium mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-xl p-4 text-center">
      <p className="text-2xl font-black text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  );
}
