export interface DailyRecord {
  id?: string;
  userId: string;
  date: string; // YYYY-MM-DD
  sleepHours: number;
  sleepQuality: number; // 1-5
  screenTime: number;
  studyTime: number;
  leisureTime: number;
  mood: number; // 1-5
  tiredness: number; // 1-5
  stress: number; // 1-5
  notes: string;
  createdAt: string;
}

export type RiskLevel = "low" | "moderate" | "high" | "critical";

export interface FatigueAnalysis {
  score: number;
  level: RiskLevel;
  factors: string[];
  recommendations: string[];
}
