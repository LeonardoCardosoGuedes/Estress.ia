/**
 * Cria o usuário admin e registros de exemplo no PostgreSQL.
 *
 * Uso:
 *   node scripts/createAdmin.mjs
 *
 * Pré-requisito: Docker rodando (docker compose up -d) e migrations aplicadas.
 *   npx prisma migrate deploy
 */

import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_EMAIL = "admin@stressia.com";
const ADMIN_PASSWORD = "admin123";

async function main() {
  console.log("Criando usuário admin...");

  const hashed = hashSync(ADMIN_PASSWORD, 12);

  const user = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      name: "Admin Stressia",
      email: ADMIN_EMAIL,
      password: hashed,
      course: "Engenharia de Software",
      institution: "Universidade Federal",
      semester: "5º semestre",
    },
  });

  console.log(`✅ Usuário: ${user.email} (id: ${user.id})`);

  // Registros de exemplo dos últimos 7 dias
  const today = new Date();
  const samples = [
    { daysAgo: 0, sleepHours: 5.5, sleepQuality: 2, screenTime: 9,  studyTime: 8, leisureTime: 0.5, mood: 2, tiredness: 4, stress: 4, notes: "Dia pesado, muitas provas." },
    { daysAgo: 1, sleepHours: 6,   sleepQuality: 3, screenTime: 8,  studyTime: 7, leisureTime: 1,   mood: 3, tiredness: 3, stress: 3, notes: "" },
    { daysAgo: 2, sleepHours: 4.5, sleepQuality: 1, screenTime: 10, studyTime: 9, leisureTime: 0,   mood: 2, tiredness: 5, stress: 5, notes: "Insônia, muita pressão acadêmica." },
    { daysAgo: 3, sleepHours: 7,   sleepQuality: 3, screenTime: 6,  studyTime: 6, leisureTime: 2,   mood: 3, tiredness: 2, stress: 2, notes: "" },
    { daysAgo: 4, sleepHours: 6.5, sleepQuality: 3, screenTime: 7,  studyTime: 7, leisureTime: 1,   mood: 3, tiredness: 3, stress: 3, notes: "" },
    { daysAgo: 5, sleepHours: 8,   sleepQuality: 4, screenTime: 5,  studyTime: 5, leisureTime: 3,   mood: 4, tiredness: 1, stress: 2, notes: "Dia mais tranquilo." },
    { daysAgo: 6, sleepHours: 7.5, sleepQuality: 4, screenTime: 4,  studyTime: 4, leisureTime: 3,   mood: 4, tiredness: 2, stress: 2, notes: "" },
  ];

  for (const s of samples) {
    const d = new Date(today);
    d.setDate(d.getDate() - s.daysAgo);
    const date = d.toISOString().split("T")[0];

    await prisma.dailyRecord.upsert({
      where: { userId_date: { userId: user.id, date } },
      update: {},
      create: {
        userId: user.id,
        date,
        sleepHours: s.sleepHours,
        sleepQuality: s.sleepQuality,
        screenTime: s.screenTime,
        studyTime: s.studyTime,
        leisureTime: s.leisureTime,
        mood: s.mood,
        tiredness: s.tiredness,
        stress: s.stress,
        notes: s.notes,
      },
    });
  }

  console.log("✅ 7 registros de exemplo inseridos.");
  console.log("\n  E-mail:  admin@stressia.com");
  console.log("  Senha:   admin123\n");
}

main()
  .catch((e) => { console.error("❌ Erro:", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
