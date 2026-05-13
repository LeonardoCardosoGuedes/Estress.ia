import type { DailyRecord } from "@/types/dailyRecord";

export function getWellbeingScore(record: DailyRecord): number {
  const sleepScore = Math.min((record.sleepHours / 8) * 30, 30);
  const qualityScore = (record.sleepQuality / 10) * 20;
  const stressScore = Math.max(((10 - record.stress) / 10) * 30, 0);
  const screenScore = Math.max(20 - Math.max(record.screenTime - 4, 0) * 3, 0);
  return Math.round(sleepScore + qualityScore + stressScore + screenScore);
}

export function getRiskColor(level: string): string {
  switch (level) {
    case "low": return "#22c55e";
    case "moderate": return "#f59e0b";
    case "high": return "#ef4444";
    case "critical": return "#7c3aed";
    default: return "#94a3b8";
  }
}

export function getRiskLabel(level: string): string {
  switch (level) {
    case "low": return "Baixo risco";
    case "moderate": return "Risco moderado";
    case "high": return "Risco alto";
    case "critical": return "Risco crítico";
    default: return "Sem dados";
  }
}

export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

export function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}
