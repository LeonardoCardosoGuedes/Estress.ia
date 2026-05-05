import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

// ─── Usuários ────────────────────────────────────────────────────────────────
const users = [
  {
    name: "Admin Stressia",
    email: "admin@stressia.com",
    password: "admin123",
    course: "Engenharia de Software",
    institution: "UFMG",
    semester: "5º semestre",
  },
  {
    name: "Ana Beatriz Costa",
    email: "ana@stressia.com",
    password: "ana123456",
    course: "Medicina",
    institution: "USP",
    semester: "8º semestre",
  },
  {
    name: "Carlos Henrique",
    email: "carlos@stressia.com",
    password: "carlos123",
    course: "Direito",
    institution: "PUC-MG",
    semester: "3º semestre",
  },
];

// ─── Gerador de registros diários ────────────────────────────────────────────

function dateStr(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function jitter(base, range) {
  return Math.round((base + (Math.random() * range * 2 - range)) * 2) / 2;
}

/**
 * Gera 30 dias de dados simulando um ciclo realista de estudante:
 *
 * Dias 30-22 → semana tranquila (início do semestre)
 * Dias 21-15 → pressão crescendo (trabalhos acumulando)
 * Dias 14-8  → semana de provas (alto estresse)
 * Dias 7-4   → pós-prova pesada (exaustão)
 * Dias 3-0   → recuperação lenta
 */
function generateRecords(userId, profile = "default") {
  const records = [];

  for (let ago = 29; ago >= 0; ago--) {
    let base;

    if (ago >= 22) {
      // Semana tranquila
      base = { sleep: 7.5, sleepQ: 4, screen: 5, study: 5, leisure: 2.5, mood: 4, tired: 2, stress: 2 };
    } else if (ago >= 15) {
      // Pressão crescendo
      base = { sleep: 6.5, sleepQ: 3, screen: 7, study: 7, leisure: 1, mood: 3, tired: 3, stress: 3 };
    } else if (ago >= 8) {
      // Semana de provas
      base = { sleep: 5, sleepQ: 2, screen: 9, study: 9, leisure: 0, mood: 2, tired: 5, stress: 5 };
    } else if (ago >= 4) {
      // Pós-prova / exaustão
      base = { sleep: 6, sleepQ: 2, screen: 8, study: 6, leisure: 0.5, mood: 2, tired: 4, stress: 4 };
    } else {
      // Recuperação
      base = { sleep: 7, sleepQ: 3, screen: 6, study: 5, leisure: 2, mood: 3, tired: 3, stress: 3 };
    }

    // Variação por perfil de usuário
    if (profile === "medicine") {
      base.study += 1.5;
      base.leisure -= 0.5;
      base.stress += 1;
      base.tired += 0.5;
    } else if (profile === "relaxed") {
      base.sleep += 0.5;
      base.leisure += 1;
      base.stress -= 0.5;
      base.study -= 1;
    }

    const notes = {
      22: "Início animador do semestre!",
      15: "Trabalhos começando a acumular.",
      8: "Semana de provas, muito estresse.",
      7: "Prova de cálculo hoje, mal dormi.",
      4: "Provas acabaram mas ainda me sinto esgotado.",
      0: "Tentando recuperar a rotina.",
    }[ago] ?? "";

    records.push({
      userId,
      date: dateStr(ago),
      sleepHours: clamp(jitter(base.sleep, 0.5), 3, 12),
      sleepQuality: clamp(Math.round(jitter(base.sleepQ, 0.5)), 1, 5),
      screenTime: clamp(jitter(base.screen, 1), 1, 16),
      studyTime: clamp(jitter(base.study, 1), 0, 16),
      leisureTime: clamp(jitter(base.leisure, 0.5), 0, 8),
      mood: clamp(Math.round(jitter(base.mood, 0.5)), 1, 5),
      tiredness: clamp(Math.round(jitter(base.tired, 0.5)), 1, 5),
      stress: clamp(Math.round(jitter(base.stress, 0.5)), 1, 5),
      notes,
    });
  }

  return records;
}

// ─── Seed principal ───────────────────────────────────────────────────────────
async function main() {
  console.log("🌱 Iniciando seed...\n");

  const profiles = ["default", "medicine", "relaxed"];

  for (let i = 0; i < users.length; i++) {
    const u = users[i];

    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        name: u.name,
        email: u.email,
        password: hashSync(u.password, 10),
        course: u.course,
        institution: u.institution,
        semester: u.semester,
      },
    });

    console.log(`👤 Usuário: ${user.email}`);

    const records = generateRecords(user.id, profiles[i]);

    for (const r of records) {
      await prisma.dailyRecord.upsert({
        where: { userId_date: { userId: r.userId, date: r.date } },
        update: r,
        create: r,
      });
    }

    console.log(`   ✅ ${records.length} registros inseridos (${records[0].date} → ${records.at(-1).date})`);
  }

  console.log("\n✅ Seed concluído!\n");
  console.log("  Credenciais:");
  console.log("  ┌──────────────────────────────┬──────────────┐");
  console.log("  │ admin@stressia.com            │ admin123     │");
  console.log("  │ ana@stressia.com              │ ana123456    │");
  console.log("  │ carlos@stressia.com           │ carlos123    │");
  console.log("  └──────────────────────────────┴──────────────┘");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
