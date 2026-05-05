import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, SESSION_COOKIE } from "@/lib/session";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "Credenciais inválidas." }, { status: 401 });
  }

  const valid = await compare(password, user.password);
  if (!valid) {
    return NextResponse.json({ error: "Credenciais inválidas." }, { status: 401 });
  }

  const token = signToken({ uid: user.id, email: user.email });
  const res = NextResponse.json({ uid: user.id, email: user.email, name: user.name });
  res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 7 });
  return res;
}
