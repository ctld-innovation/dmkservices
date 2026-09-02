import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canAdmin, getSession, hashPassword, unauthorized, forbidden, jsonError } from "@/lib/auth";
import { userSchema } from "@/lib/validations";
import { writeAudit } from "@/lib/audit";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!canAdmin(session.role)) return forbidden();
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = userSchema.partial().safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Données invalides");
  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.password) {
    data.passwordHash = await hashPassword(parsed.data.password);
  }
  delete data.password;
  const user = await prisma.user.update({ where: { id }, data });
  await writeAudit(session, "User", id, "UPDATE");
  return NextResponse.json({ id: user.id });
}
