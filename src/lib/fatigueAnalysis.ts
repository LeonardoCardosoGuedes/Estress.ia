import type { DailyRecord, FatigueAnalysis, RiskLevel } from "@/types/dailyRecord";

export function analyzeFatigue(records: DailyRecord[]): FatigueAnalysis {
  if (records.length === 0) {
    return { score: 0, level: "low", factors: [], recommendations: [] };
  }

  const recent = records.slice(0, 7);
  const latest = recent[0];
  const factors: string[] = [];
  let score = 0;

  const avgSleep = avg(recent.map((r) => r.sleepHours));
  if (avgSleep < 5) { score += 20; factors.push("Sono muito insuficiente (media < 5h)"); }
  else if (avgSleep < 6) { score += 12; factors.push("Sono insuficiente (media < 6h)"); }
  else if (avgSleep < 7) { score += 5; }

  const avgSleepQuality = avg(recent.map((r) => r.sleepQuality));
  if (avgSleepQuality <= 4) { score += 15; factors.push("Qualidade do sono muito baixa"); }
  else if (avgSleepQuality <= 6) { score += 7; factors.push("Qualidade do sono abaixo do ideal"); }

  const avgScreen = avg(recent.map((r) => r.screenTime));
  if (avgScreen >= 10) { score += 12; factors.push("Tempo de tela excessivo (>= 10h/dia)"); }
  else if (avgScreen >= 8) { score += 6; factors.push("Tempo de tela elevado"); }

  const avgSocial = avg(recent.map((r) => r.socialMediaHours));
  if (avgSocial >= 5) { score += 10; factors.push("Uso alto de redes sociais"); }
  else if (avgSocial >= 3) { score += 5; factors.push("Uso moderado de redes sociais"); }

  const avgGaming = avg(recent.map((r) => r.gamingHours));
  if (avgGaming >= 5) { score += 8; factors.push("Tempo de jogos elevado"); }

  const avgCaffeine = avg(recent.map((r) => r.caffeineIntakeMgPerDay));
  if (avgCaffeine >= 400) { score += 10; factors.push("Consumo de cafeina elevado"); }
  else if (avgCaffeine >= 250) { score += 5; factors.push("Consumo de cafeina acima do ideal"); }

  const avgStress = avg(recent.map((r) => r.stress));
  if (avgStress >= 8) { score += 12; factors.push("Nivel de estresse previsto critico"); }
  else if (avgStress >= 6) { score += 7; factors.push("Nivel de estresse previsto elevado"); }

  const last3 = recent.slice(0, 3);
  if (last3.length === 3) {
    const sleepBelow6 = last3.filter((r) => r.sleepHours < 6).length;
    if (sleepBelow6 === 3) { score += 10; factors.push("3 dias seguidos com sono < 6h"); }

    const highStress = last3.filter((r) => r.stress >= 7).length;
    if (highStress >= 2) { score += 8; factors.push("Estresse alto por 2+ dias consecutivos"); }

    const highScreen = last3.filter((r) => r.screenTime >= 8 && r.sleepQuality <= 4).length;
    if (highScreen >= 2) { score += 8; factors.push("Tela alta + sono ruim combinados"); }
  }

  const cappedScore = Math.min(score, 100);

  return {
    score: cappedScore,
    level: classifyRisk(cappedScore),
    factors,
    recommendations: generateRecommendations(
      cappedScore,
      latest,
      avgSleep,
      avgStress,
      avgScreen,
      avgSocial,
      avgGaming,
      avgCaffeine
    ),
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
  latest: DailyRecord,
  avgSleep: number,
  avgStress: number,
  avgScreen: number,
  avgSocial: number,
  avgGaming: number,
  avgCaffeine: number
): string[] {
  const recs: string[] = [];

  if (avgSleep < 7) {
    recs.push("Voce teve pouco tempo de descanso nos ultimos dias. Considere reduzir o tempo de tela antes de dormir.");
  }
  if (avgScreen >= 8) {
    recs.push("Seu tempo de tela esta elevado. Pausas de 5 minutos a cada hora podem ajudar a reduzir a fadiga visual.");
  }
  if (avgSocial >= 3) {
    recs.push("Seu tempo em redes sociais esta relevante. Experimente definir blocos sem notificacoes ao longo do dia.");
  }
  if (avgGaming >= 5) {
    recs.push("O tempo de jogos esta alto. Vale alternar com pausas longe da tela para reduzir sobrecarga digital.");
  }
  if (avgCaffeine >= 250 && latest.sleepHours < 7) {
    recs.push("Cafeina alta combinada com pouco sono pode piorar descanso e ansiedade. Tente evitar cafeina no fim do dia.");
  }
  if (avgStress >= 6) {
    recs.push("O modelo indicou estresse elevado nos ultimos registros. Uma pausa curta ou exercicio leve pode ajudar a recuperar o foco.");
  }
  if (score <= 30) {
    recs.push("Seus indicadores estao equilibrados. Continue mantendo essa rotina saudavel!");
  }
  if (score >= 81) {
    recs.push("Recomenda-se observar seus sinais de fadiga com atencao. Considere reorganizar sua rotina e buscar apoio se necessario.");
  }

  return recs.length > 0 ? recs : ["Continue registrando sua rotina para receber insights personalizados."];
}

export function detectAlerts(records: DailyRecord[]): string[] {
  const alerts: string[] = [];
  if (records.length < 2) return alerts;

  const recent = records.slice(0, 7);
  const last3 = recent.slice(0, 3);
  if (last3.length === 3 && last3.every((r) => r.sleepHours < 6)) {
    alerts.push("Sono abaixo de 6 horas por 3 dias seguidos.");
  }

  const last2 = recent.slice(0, 2);
  if (last2.length === 2 && last2.every((r) => r.stress >= 7)) {
    alerts.push("Estresse previsto elevado por 2 dias consecutivos.");
  }

  if (last2.length === 2 && last2.every((r) => r.screenTime >= 8 && r.sleepQuality <= 4)) {
    alerts.push("Tempo de tela alto combinado com qualidade de sono ruim.");
  }

  if (last2.length === 2 && last2.every((r) => r.caffeineIntakeMgPerDay >= 400)) {
    alerts.push("Consumo de cafeina elevado por 2 dias consecutivos.");
  }

  return alerts;
}
