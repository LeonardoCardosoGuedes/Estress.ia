"use client";

import { useState, useEffect } from "react";
import type { DailyRecord } from "@/types/dailyRecord";

export function useDailyRecords(userId: string | undefined) {
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch("/api/records")
      .then((r) => {
        if (!r.ok) throw new Error("Falha ao buscar registros");
        return r.json();
      })
      .then((data) => setRecords(Array.isArray(data) ? data : []))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [userId]); // re-executa toda vez que userId muda (undefined → uid real)

  async function addRecord(record: Omit<DailyRecord, "id" | "createdAt">) {
    const res = await fetch("/api/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });
    if (!res.ok) throw new Error("Falha ao salvar registro");

    // Recarrega registros após inserção
    const updated = await fetch("/api/records").then((r) => r.json());
    setRecords(Array.isArray(updated) ? updated : []);
  }

  return { records, loading, addRecord };
}
