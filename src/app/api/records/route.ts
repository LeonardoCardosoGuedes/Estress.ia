import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

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
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await req.json();

  const record = await prisma.dailyRecord.upsert({
    where: { userId_date: { userId: session.uid, date: body.date } },
    update: {
      sleepHours: body.sleepHours,
      sleepQuality: body.sleepQuality,
      screenTime: body.screenTime,
      studyTime: body.studyTime,
      leisureTime: body.leisureTime,
      mood: body.mood,
      tiredness: body.tiredness,
      stress: body.stress,
      notes: body.notes ?? "",
    },
    create: {
      userId: session.uid,
      date: body.date,
      sleepHours: body.sleepHours,
      sleepQuality: body.sleepQuality,
      screenTime: body.screenTime,
      studyTime: body.studyTime,
      leisureTime: body.leisureTime,
      mood: body.mood,
      tiredness: body.tiredness,
      stress: body.stress,
      notes: body.notes ?? "",
    },
  });

  return NextResponse.json({ id: record.id });
}
