"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { loginUser } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Brain, Zap } from "lucide-react";

const schema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

type FormData = z.infer<typeof schema>;

const ADMIN_EMAIL = "admin@stressia.com";
const ADMIN_PASSWORD = "admin123";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, refresh } = useAuth();
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  async function onSubmit(data: FormData) {
    setError("");
    try {
      await loginUser(data.email, data.password);
      refresh();
      router.replace("/dashboard");
    } catch {
      setError("E-mail ou senha incorretos. Tente novamente.");
    }
  }

  async function handleAdminLogin() {
    setError("");
    setValue("email", ADMIN_EMAIL);
    setValue("password", ADMIN_PASSWORD);
    try {
      await loginUser(ADMIN_EMAIL, ADMIN_PASSWORD);
      refresh();
      router.replace("/dashboard");
    } catch {
      setError("Usuário admin não encontrado. Rode: node scripts/createAdmin.mjs");
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center sm:mb-8">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 sm:h-16 sm:w-16">
            <Brain className="h-8 w-8 text-white sm:h-9 sm:w-9" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">Stressia</h1>
          <p className="text-slate-500 mt-1">Saúde Mental Acadêmica</p>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xl sm:p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-6">Entrar na sua conta</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" loading={isSubmitting} className="w-full mt-2">
              Entrar
            </Button>
          </form>

          {/* Acesso rápido admin */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleAdminLogin}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-slate-300 text-sm text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
            >
              <Zap className="w-4 h-4" />
              Entrar como admin (demo)
            </button>
            <p className="text-center text-xs text-slate-400 mt-2">
              admin@stressia.com · admin123
            </p>
          </div>

          <p className="text-center text-sm text-slate-500 mt-4">
            Não tem conta?{" "}
            <Link href="/register" className="text-blue-600 font-medium hover:underline">
              Criar conta grátis
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
