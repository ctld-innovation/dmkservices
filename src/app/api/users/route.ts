import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canAdmin, getSession, hashPassword, unauthorized, forbidden, jsonError } from "@/lib/auth";
import { userSchema } from "@/lib/validations";
import { writeAudit } from "@/lib/audit";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!canAdmin(session.role)) return forbidden();
  const users = await prisma.user.findMany({
    orderBy: { lastName: "asc" },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });
  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!canAdmin(session.role)) return forbidden();
  const body = await req.json().catch(() => null);
  const parsed = userSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Données invalides");
  if (!parsed.data.password) return jsonError("Mot de passe requis (8 caractères min.)");
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email.toLowerCase(),
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      role: parsed.data.role,
      passwordHash: await hashPassword(parsed.data.password),
    },
  });
  await writeAudit(session, "User", user.id, "CREATE");
  return NextResponse.json({ id: user.id }, { status: 201 });
}
