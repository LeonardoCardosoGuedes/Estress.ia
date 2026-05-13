"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, type UseFormRegisterReturn } from "react-hook-form";
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
  sleepQuality: z.number().min(1).max(10),
  screenTime: z.number().min(0).max(24),
  socialMediaHours: z.number().min(0).max(24),
  gamingHours: z.number().min(0).max(24),
  caffeineIntakeMgPerDay: z.number().min(0).max(2000),
  locationType: z.string().min(1, "Informe o tipo de local"),
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
  const [submitError, setSubmitError] = useState("");

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: getTodayString(),
      sleepHours: 7,
      sleepQuality: 7,
      screenTime: 4,
      socialMediaHours: 2,
      gamingHours: 1,
      caffeineIntakeMgPerDay: 100,
      locationType: "urban",
      notes: "",
    },
  });

  async function onSubmit(data: FormData) {
    if (!profile) return;

    setSubmitError("");
    try {
      await addRecord({ ...data, userId: profile.uid });
      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 1800);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Falha ao salvar registro.");
    }
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
        <h2 className="text-2xl font-black text-slate-900">Registro diario</h2>
        <p className="text-slate-500 mt-1">
          Informe os dados de entrada do modelo para prever seu nivel de estresse.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <h3 className="font-semibold text-slate-700 mb-4">Informacoes do dia</h3>
          <Input label="Data" type="date" error={errors.date?.message} {...register("date")} />
        </Card>

        <Card>
          <h3 className="font-semibold text-slate-700 mb-5">Descanso</h3>
          <div className="space-y-6">
            <NumberField
              label="Horas de sono"
              step="0.5"
              min="0"
              max="24"
              register={register("sleepHours", { valueAsNumber: true })}
            />
            <Controller
              name="sleepQuality"
              control={control}
              render={({ field }) => (
                <RangeInput
                  label="Qualidade do sono"
                  value={Number(field.value)}
                  min={1}
                  max={10}
                  leftLabel="Muito ruim"
                  rightLabel="Excelente"
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              )}
            />
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-slate-700 mb-5">Uso digital</h3>
          <div className="space-y-4">
            <NumberField
              label="Tempo de tela"
              step="0.5"
              min="0"
              max="24"
              register={register("screenTime", { valueAsNumber: true })}
            />
            <NumberField
              label="Redes sociais"
              step="0.5"
              min="0"
              max="24"
              register={register("socialMediaHours", { valueAsNumber: true })}
            />
            <NumberField
              label="Jogos"
              step="0.5"
              min="0"
              max="24"
              register={register("gamingHours", { valueAsNumber: true })}
            />
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-slate-700 mb-5">Contexto</h3>
          <div className="space-y-4">
            <NumberField
              label="Cafeina por dia (mg)"
              step="1"
              min="0"
              max="2000"
              register={register("caffeineIntakeMgPerDay", { valueAsNumber: true })}
            />

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">
                Tipo de local
              </label>
              <select
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                {...register("locationType")}
              >
                <option value="urban">Urbano</option>
                <option value="suburban">Suburbano</option>
                <option value="rural">Rural</option>
              </select>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-slate-700 mb-4">Observacoes do dia</h3>
          <textarea
            rows={3}
            placeholder="Algo que queira registrar?"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            {...register("notes")}
          />
        </Card>

        {submitError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            {submitError}
          </div>
        )}

        <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
          Prever estresse e salvar
        </Button>
      </form>
    </div>
  );
}

function NumberField({
  label,
  step,
  min,
  max,
  register,
}: {
  label: string;
  step: string;
  min: string;
  max: string;
  register: UseFormRegisterReturn;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700 block mb-1">{label}</label>
      <input
        type="number"
        step={step}
        min={min}
        max={max}
        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        {...register}
      />
    </div>
  );
}
