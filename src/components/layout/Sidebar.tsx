"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  ClipboardList,
  History,
  User,
  LogOut,
  Brain,
} from "lucide-react";
import { clsx } from "clsx";

const navItems = [
  { href: "/dashboard", label: "Dashboard", shortLabel: "Início", icon: LayoutDashboard },
  { href: "/registro", label: "Registro Diário", shortLabel: "Registro", icon: ClipboardList },
  { href: "/historico", label: "Histórico", shortLabel: "Histórico", icon: History },
  { href: "/perfil", label: "Perfil", shortLabel: "Perfil", icon: User },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  async function handleSignOut() {
    await logout();
    router.push("/login");
  }

  return (
    <>
      <aside className="fixed left-0 top-0 z-30 hidden min-h-screen w-64 flex-col border-r border-slate-100 bg-white lg:flex">
        <div className="border-b border-slate-100 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold leading-none text-slate-900">Stressia</h1>
              <p className="mt-0.5 text-xs text-slate-400">Saúde Mental Acadêmica</p>
            </div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-4">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
                pathname === href
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition-all hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-5 w-5" />
            Sair
          </button>
        </div>
      </aside>

      <div className="lg:hidden">
        <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-slate-100 bg-white/95 px-4 backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-bold leading-none text-slate-900">Stressia</p>
              <p className="mt-0.5 truncate text-xs text-slate-400">Saúde Mental Acadêmica</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            aria-label="Sair da conta"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-slate-500 transition-all hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </header>

        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-100 bg-white/95 px-2 pb-2 pt-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="mx-auto flex max-w-md items-center justify-between gap-1">
            {navItems.map(({ href, shortLabel, icon: Icon }) => {
              const active = pathname === href;

              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition-all",
                    active
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="max-w-full truncate">{shortLabel}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </>
  );
}
