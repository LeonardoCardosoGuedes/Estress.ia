import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, SESSION_COOKIE } from "@/lib/session";

export async function POST(req: NextRequest) {
  const { name, email, password, course, institution, semester } = await req.json();

  if (!name || !email || !password || !course || !institution || !semester) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "E-mail já está em uso." }, { status: 409 });
  }

  const hashed = await hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, password: hashed, course, institution, semester },
  });

  const token = signToken({ uid: user.id, email: user.email });
  const res = NextResponse.json({ uid: user.id, email: user.email, name: user.name });
  res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 7 });
  return res;
}
