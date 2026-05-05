import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json(null);

  const user = await prisma.user.findUnique({
    where: { id: session.uid },
    select: { id: true, name: true, email: true, course: true, institution: true, semester: true, createdAt: true },
  });

  if (!user) return NextResponse.json(null);

  return NextResponse.json({
    uid: user.id,
    name: user.name,
    email: user.email,
    course: user.course,
    institution: user.institution,
    semester: user.semester,
    createdAt: user.createdAt.toISOString(),
  });
}
