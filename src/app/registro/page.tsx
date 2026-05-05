"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { RangeInput } from "@/components/ui/RangeInput";
import { useAuth } from "@/hooks/useAuth";
import { useDailyRecords } from "@/hooks/useDailyRecords";
import { getTodayString } from "@/lib/recommendations";
import { CheckCircle } from "lucide-react";

const schema = z.object({
  date: z.string().min(1, "Informe a data"),
  sleepHours: z.number().min(0).max(24),
  sleepQuality: z.number().min(1).max(5),
  screenTime: z.number().min(0).max(24),
  studyTime: z.number().min(0).max(24),
  leisureTime: z.number().min(0).max(24),
  mood: z.number().min(1).max(5),
  tiredness: z.number().min(1).max(5),
  stress: z.number().min(1).max(5),
  notes: z.string(),
});

type FormData = z.infer<typeof schema>;

export default function RegistroPage() {
  return (
    <AuthGuard>
      <AppLayout>
        <RegistroContent />
      </AppLayout>
    </AuthGuard>
  );
}

function RegistroContent() {
  const { profile } = useAuth();
  const { addRecord } = useDailyRecords(profile?.uid);
  const router = useRouter();
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: getTodayString(),
      sleepHours: 7,
      sleepQuality: 3,
      screenTime: 4,
      studyTime: 4,
      leisureTime: 1,
      mood: 3,
      tiredness: 2,
      stress: 2,
      notes: "",
    },
  });

  const values = watch();

  async function onSubmit(data: FormData) {
    if (!profile) return;
    await addRecord({ ...data, userId: profile.uid });
    setSuccess(true);
    setTimeout(() => router.push("/dashboard"), 1800);
  }

  if (success) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800">Registro salvo!</h3>
          <p className="text-slate-500 mt-1">Redirecionando para o dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900">Registro Diário</h2>
        <p className="text-slate-500 mt-1">Registre como foi o seu dia para receber insights personalizados.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <h3 className="font-semibold text-slate-700 mb-4">Informações do dia</h3>
          <Input
            label="Data"
            type="date"
            error={errors.date?.message}
            {...register("date")}
          />
        </Card>

        <Card>
          <h3 className="font-semibold text-slate-700 mb-5">Descanso</h3>
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">
                Horas de sono
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="24"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...register("sleepHours", { valueAsNumber: true })}
              />
            </div>
            <Controller
              name="sleepQuality"
              control={control}
              render={({ field }) => (
                <RangeInput
                  label="Qualidade do sono"
                  value={Number(field.value)}
                  min={1}
                  max={5}
                  leftLabel="Muito ruim"
                  rightLabel="Excelente"
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              )}
            />
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-slate-700 mb-5">Tempo (horas)</h3>
          <div className="space-y-4">
            {[
              { key: "screenTime", label: "Tempo de tela" },
              { key: "studyTime", label: "Tempo de estudo" },
              { key: "leisureTime", label: "Tempo de lazer" },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="text-sm font-medium text-slate-700 block mb-1">{label}</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  {...register(key as keyof FormData, { valueAsNumber: true })}
                />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-slate-700 mb-5">Como você está?</h3>
          <div className="space-y-6">
            <Controller
              name="mood"
              control={control}
              render={({ field }) => (
                <RangeInput
                  label="Humor"
                  value={Number(field.value)}
                  min={1}
                  max={5}
                  leftLabel="Muito mal"
                  rightLabel="Ótimo"
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              )}
            />
            <Controller
              name="tiredness"
              control={control}
              render={({ field }) => (
                <RangeInput
                  label="Nível de cansaço"
                  value={Number(field.value)}
                  min={1}
                  max={5}
                  leftLabel="Descansado"
                  rightLabel="Exausto"
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              )}
            />
            <Controller
              name="stress"
              control={control}
              render={({ field }) => (
                <RangeInput
                  label="Nível de estresse"
                  value={Number(field.value)}
                  min={1}
                  max={5}
                  leftLabel="Tranquilo"
                  rightLabel="Muito estressado"
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              )}
            />
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-slate-700 mb-4">Observações do dia</h3>
          <textarea
            rows={3}
            placeholder="Como foi seu dia? Algo que queira registrar?"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            {...register("notes")}
          />
        </Card>

        <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
          Salvar registro
        </Button>
      </form>
    </div>
  );
}
