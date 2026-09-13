import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  canAdmin,
  getSession,
  hashPassword,
  unauthorized,
  forbidden,
  jsonError,
  setSessionCookie,
} from "@/lib/auth";
import { profileSchema, userSchema } from "@/lib/validations";
import { writeAudit } from "@/lib/audit";

function stripEmptyPassword(body: Record<string, unknown>) {
  if (typeof body.password === "string" && body.password.trim() === "") {
    delete body.password;
  }
  if (typeof body.email === "string") {
    body.email = body.email.trim().toLowerCase();
  }
  return body;
}

async function guardLastAdmin(id: string, next: { role?: string; active?: boolean }) {
  const demoting = next.role !== undefined && next.role !== "ADMIN";
  const deactivating = next.active === false;
  if (!demoting && !deactivating) return null;
  const target = await prisma.user.findUnique({ where: { id }, select: { role: true, active: true } });
  if (!target || target.role !== "ADMIN" || !target.active) return null;
  const otherAdmins = await prisma.user.count({
    where: { role: "ADMIN", active: true, id: { not: id } },
  });
  if (otherAdmins === 0) {
    return "Impossible de retirer le dernier administrateur";
  }
  return null;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return unauthorized();
  const { id } = await params;
  const admin = canAdmin(session.role);
  const isSelf = session.id === id;
  if (!admin && !isSelf) return forbidden();

  const raw = await req.json().catch(() => null);
  if (!raw || typeof raw !== "object") return jsonError("Données invalides");
  const body = stripEmptyPassword({ ...(raw as Record<string, unknown>) });

  const parsed = admin
    ? userSchema.partial().safeParse(body)
    : profileSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Données invalides");

  const payload = parsed.data as {
    email?: string;
    firstName?: string;
    lastName?: string;
    role?: "ADMIN" | "ESTIMATOR" | "VIEWER";
    password?: string;
    active?: boolean;
  };

  if (!admin) {
    delete payload.role;
    delete payload.active;
  }

  const lastAdminError = admin ? await guardLastAdmin(id, payload) : null;
  if (lastAdminError) return jsonError(lastAdminError);

  const data: Prisma.UserUpdateInput = {};
  if (payload.email !== undefined) data.email = payload.email;
  if (payload.firstName !== undefined) data.firstName = payload.firstName;
  if (payload.lastName !== undefined) data.lastName = payload.lastName;
  if (admin && payload.role !== undefined) data.role = payload.role;
  if (admin && payload.active !== undefined) data.active = payload.active;
  if (payload.password) data.passwordHash = await hashPassword(payload.password);

  if (Object.keys(data).length === 0) return jsonError("Aucune modification");

  try {
    const user = await prisma.user.update({ where: { id }, data });
    await writeAudit(session, "User", id, "UPDATE");
    if (isSelf) {
      await setSessionCookie({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      });
    }
    return NextResponse.json({ id: user.id });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError("Cet email est déjà utilisé");
    }
    throw error;
  }
}
