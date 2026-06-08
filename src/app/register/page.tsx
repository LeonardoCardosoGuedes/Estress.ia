"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { registerUser } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Brain } from "lucide-react";

const schema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  course: z.string().min(2, "Informe seu curso"),
  institution: z.string().min(2, "Informe sua instituição"),
  semester: z.string().min(1, "Informe seu período"),
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading, refresh } = useAuth();
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  async function onSubmit(data: FormData) {
    setError("");
    try {
      await registerUser(data.email, data.password, {
        name: data.name,
        course: data.course,
        institution: data.institution,
        semester: data.semester,
      });
      refresh();
      router.replace("/dashboard");
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("já está em uso")) {
        setError("Este e-mail já está em uso.");
      } else {
        setError("Erro ao criar conta. Tente novamente.");
      }
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 py-8 sm:py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center sm:mb-8">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 sm:h-16 sm:w-16">
            <Brain className="h-8 w-8 text-white sm:h-9 sm:w-9" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">Stressia</h1>
          <p className="text-slate-500 mt-1">Crie sua conta gratuita</p>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xl sm:p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-6">Criar conta</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Nome completo"
              placeholder="Seu nome"
              error={errors.name?.message}
              {...register("name")}
            />
            <Input
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              error={errors.email?.message}
              {...register("email")}
            />
            <Input
              label="Senha"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register("password")}
            />
            <Input
              label="Curso"
              placeholder="Ex: Engenharia de Software"
              error={errors.course?.message}
              {...register("course")}
            />
            <Input
              label="Instituição"
              placeholder="Nome da faculdade ou universidade"
              error={errors.institution?.message}
              {...register("institution")}
            />
            <Input
              label="Período / Semestre"
              placeholder="Ex: 4º semestre"
              error={errors.semester?.message}
              {...register("semester")}
            />

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                {error}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              loading={isSubmitting}
              className="w-full mt-2"
            >
              Criar conta
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Já tem conta?{" "}
            <Link href="/login" className="text-blue-600 font-medium hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
