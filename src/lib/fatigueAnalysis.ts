import type { DailyRecord, FatigueAnalysis, RiskLevel } from "@/types/dailyRecord";

export function analyzeFatigue(records: DailyRecord[]): FatigueAnalysis {
  if (records.length === 0) {
    return { score: 0, level: "low", factors: [], recommendations: [] };
  }

  const recent = records.slice(0, 7); // últimos 7 dias
  const latest = recent[0];
  const factors: string[] = [];
  let score = 0;

  // Sono
  const avgSleep = avg(recent.map((r) => r.sleepHours));
  if (avgSleep < 5) { score += 20; factors.push("Sono muito insuficiente (média < 5h)"); }
  else if (avgSleep < 6) { score += 12; factors.push("Sono insuficiente (média < 6h)"); }
  else if (avgSleep < 7) { score += 5; }

  // Qualidade do sono
  const avgSleepQuality = avg(recent.map((r) => r.sleepQuality));
  if (avgSleepQuality <= 2) { score += 15; factors.push("Qualidade do sono muito baixa"); }
  else if (avgSleepQuality <= 3) { score += 7; factors.push("Qualidade do sono abaixo do ideal"); }

  // Tempo de tela
  const avgScreen = avg(recent.map((r) => r.screenTime));
  if (avgScreen >= 10) { score += 12; factors.push("Tempo de tela excessivo (≥ 10h/dia)"); }
  else if (avgScreen >= 8) { score += 6; factors.push("Tempo de tela elevado"); }

  // Tempo de estudo
  const avgStudy = avg(recent.map((r) => r.studyTime));
  if (avgStudy >= 10) { score += 12; factors.push("Carga de estudo muito alta (≥ 10h/dia)"); }
  else if (avgStudy >= 8) { score += 6; factors.push("Carga de estudo elevada"); }

  // Lazer
  const avgLeisure = avg(recent.map((r) => r.leisureTime));
  if (avgLeisure === 0) { score += 15; factors.push("Nenhum tempo de lazer registrado"); }
  else if (avgLeisure < 1) { score += 8; factors.push("Tempo de lazer insuficiente"); }

  // Humor
  const avgMood = avg(recent.map((r) => r.mood));
  if (avgMood <= 2) { score += 12; factors.push("Humor consistentemente baixo"); }
  else if (avgMood <= 3) { score += 5; factors.push("Humor abaixo do ideal"); }

  // Cansaço
  const avgTiredness = avg(recent.map((r) => r.tiredness));
  if (avgTiredness >= 5) { score += 12; factors.push("Nível de cansaço crítico"); }
  else if (avgTiredness >= 4) { score += 7; factors.push("Nível de cansaço elevado"); }

  // Estresse
  const avgStress = avg(recent.map((r) => r.stress));
  if (avgStress >= 5) { score += 12; factors.push("Nível de estresse crítico"); }
  else if (avgStress >= 4) { score += 7; factors.push("Nível de estresse elevado"); }

  // Padrões repetitivos negativos (últimos 3 dias)
  const last3 = recent.slice(0, 3);
  if (last3.length === 3) {
    const sleepBelow6 = last3.filter((r) => r.sleepHours < 6).length;
    if (sleepBelow6 === 3) { score += 10; factors.push("3 dias seguidos com sono < 6h"); }

    const stressAbove4 = last3.filter((r) => r.stress >= 4).length;
    if (stressAbove4 >= 2) { score += 8; factors.push("Estresse alto por 2+ dias consecutivos"); }

    const noLeisure = last3.filter((r) => r.leisureTime === 0).length;
    if (noLeisure >= 2) { score += 8; factors.push("Sem lazer por 2+ dias consecutivos"); }

    const highScreen = last3.filter((r) => r.screenTime >= 8 && r.sleepQuality <= 2).length;
    if (highScreen >= 2) { score += 8; factors.push("Tela alta + sono ruim combinados"); }
  }

  const cappedScore = Math.min(score, 100);

  return {
    score: cappedScore,
    level: classifyRisk(cappedScore),
    factors,
    recommendations: generateRecommendations(cappedScore, factors, latest, avgSleep, avgStress, avgScreen, avgStudy, avgLeisure, avgMood),
  };
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function classifyRisk(score: number): RiskLevel {
  if (score <= 30) return "low";
  if (score <= 60) return "moderate";
  if (score <= 80) return "high";
  return "critical";
}

function generateRecommendations(
  score: number,
  factors: string[],
  latest: DailyRecord,
  avgSleep: number,
  avgStress: number,
  avgScreen: number,
  avgStudy: number,
  avgLeisure: number,
  avgMood: number
): string[] {
  const recs: string[] = [];

  if (avgSleep < 7) {
    recs.push("Você teve pouco tempo de descanso nos últimos dias. Considere reduzir o tempo de tela antes de dormir.");
  }
  if (avgScreen >= 8) {
    recs.push("Seu tempo de tela está elevado. Pausas de 5 minutos a cada hora podem ajudar a reduzir a fadiga visual.");
  }
  if (avgStudy >= 8 && avgLeisure < 1) {
    recs.push("Seu tempo de estudo está alto e o lazer está baixo. Tente inserir pequenas pausas e atividades de descanso durante o dia.");
  }
  if (avgStress >= 4) {
    recs.push("Seu nível de estresse subiu nos últimos registros. Uma pausa curta ou exercício leve pode ajudar a recuperar o foco.");
  }
  if (avgMood <= 2) {
    recs.push("Padrão de atenção: seu humor está baixo recentemente. Considere uma conversa com alguém de confiança ou uma atividade que você goste.");
  }
  if (avgLeisure === 0) {
    recs.push("Possível sobrecarga: nenhum tempo de lazer registrado. Reserve pelo menos 30 minutos diários para descanso sem telas.");
  }
  if (score <= 30) {
    recs.push("Seus indicadores estão equilibrados. Continue mantendo essa rotina saudável!");
  }
  if (score >= 81) {
    recs.push("Recomenda-se observar seus sinais de fadiga com atenção. Considere reorganizar sua rotina e buscar apoio se necessário.");
  }

  return recs.length > 0 ? recs : ["Continue registrando sua rotina para receber insights personalizados."];
}

export function detectAlerts(records: DailyRecord[]): string[] {
  const alerts: string[] = [];
  if (records.length < 2) return alerts;

  const recent = records.slice(0, 7);

  // Sono < 6h por 3 dias seguidos
  const last3 = recent.slice(0, 3);
  if (last3.length === 3 && last3.every((r) => r.sleepHours < 6)) {
    alerts.push("Sono abaixo de 6 horas por 3 dias seguidos — sinais de fadiga acumulada.");
  }

  // Estresse >= 4 por 2 dias seguidos
  const last2 = recent.slice(0, 2);
  if (last2.length === 2 && last2.every((r) => r.stress >= 4)) {
    alerts.push("Estresse elevado (≥ 4) por 2 dias consecutivos — padrão de atenção.");
  }

  // Sem lazer por 2+ dias
  if (last2.length === 2 && last2.every((r) => r.leisureTime === 0)) {
    alerts.push("Sem tempo de lazer por 2 ou mais dias — possível sobrecarga.");
  }

  // Tela alta + sono ruim
  if (last2.length === 2 && last2.every((r) => r.screenTime >= 8 && r.sleepQuality <= 2)) {
    alerts.push("Tempo de tela alto combinado com qualidade de sono ruim — recomenda-se pausas digitais.");
  }

  // Cansaço alto + humor baixo
  if (last2.length === 2 && last2.every((r) => r.tiredness >= 4 && r.mood <= 2)) {
    alerts.push("Cansaço alto combinado com humor baixo — sinais de esgotamento.");
  }

  return alerts;
}
