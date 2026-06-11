import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const MLFLOW_MODEL_URL =
  process.env.MLFLOW_MODEL_URL ?? process.env.ML_SERVICE_URL ?? "http://localhost:8001";

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toInt(value: unknown, fallback = 0): number {
  return Math.round(toNumber(value, fallback));
}

async function predictStressLevel(body: Record<string, unknown>): Promise<number> {
  const payload = {
    daily_screen_time_hours: toNumber(body.screenTime),
    social_media_hours: toNumber(body.socialMediaHours),
    gaming_hours: toNumber(body.gamingHours),
    sleep_duration_hours: toNumber(body.sleepHours),
    sleep_quality: toInt(body.sleepQuality),
    caffeine_intake_mg_per_day: toNumber(body.caffeineIntakeMgPerDay),
    location_type: String(body.locationType ?? "unknown"),
  };

  const response = await fetch(`${MLFLOW_MODEL_URL}/invocations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataframe_records: [payload] }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`MLflow model serving failed (${response.status}): ${message}`);
  }

  const prediction = (await response.json()) as unknown;
  const stressLevel = extractMlflowPrediction(prediction);
  if (!Number.isFinite(stressLevel)) {
    throw new Error("MLflow returned an invalid prediction.");
  }

  return Number(stressLevel.toFixed(2));
}

function extractMlflowPrediction(response: unknown): number {
  const predictions =
    isRecord(response) && "predictions" in response ? response.predictions : response;
  const firstPrediction = Array.isArray(predictions) ? predictions[0] : predictions;
  const value = Array.isArray(firstPrediction) ? firstPrediction[0] : firstPrediction;

  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  if (isRecord(value)) {
    const [firstValue] = Object.values(value);
    if (typeof firstValue === "number") return firstValue;
    if (typeof firstValue === "string") return Number(firstValue);
  }
  return Number.NaN;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });

  const records = await prisma.dailyRecord.findMany({
    where: { userId: session.uid },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(
    records.map((r) => ({
      id: r.id,
      userId: r.userId,
      date: r.date,
      sleepHours: r.sleepHours,
      sleepQuality: r.sleepQuality,
      screenTime: r.screenTime,
      socialMediaHours: r.socialMediaHours,
      gamingHours: r.gamingHours,
      caffeineIntakeMgPerDay: r.caffeineIntakeMgPerDay,
      locationType: r.locationType,
      studyTime: r.studyTime,
      leisureTime: r.leisureTime,
      mood: r.mood,
      tiredness: r.tiredness,
      stress: r.stress,
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });

  const body = await req.json();
  const date = String(body.date ?? "");
  const notes = String(body.notes ?? "");

  if (!date) {
    return NextResponse.json({ error: "Informe a data do registro." }, { status: 400 });
  }

  let stress: number;
  try {
    stress = await predictStressLevel(body);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Nao foi possivel prever o nivel de estresse. Verifique se o MLflow esta rodando na porta 8001." },
      { status: 503 }
    );
  }

  const baseRecord = {
    sleepHours: toNumber(body.sleepHours),
    sleepQuality: toInt(body.sleepQuality),
    screenTime: toNumber(body.screenTime),
    socialMediaHours: toNumber(body.socialMediaHours),
    gamingHours: toNumber(body.gamingHours),
    caffeineIntakeMgPerDay: toNumber(body.caffeineIntakeMgPerDay),
    locationType: String(body.locationType ?? "unknown"),
    studyTime: 0,
    leisureTime: 0,
    mood: 3,
    tiredness: 3,
    stress,
    notes,
  };

  const record = await prisma.dailyRecord.upsert({
    where: { userId_date: { userId: session.uid, date } },
    update: baseRecord,
    create: {
      userId: session.uid,
      date,
      ...baseRecord,
    },
  });

  return NextResponse.json({ id: record.id, predictedStressLevel: stress });
}
