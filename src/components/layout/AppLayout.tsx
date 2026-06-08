"use client";

import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="w-full min-w-0 flex-1 px-4 pb-24 pt-20 sm:px-6 lg:ml-64 lg:p-8">
        {children}
      </main>
    </div>
  );
}
