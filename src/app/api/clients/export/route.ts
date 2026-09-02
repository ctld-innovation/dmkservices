import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized } from "@/lib/auth";
import { csvEscape } from "@/lib/utils";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  const clients = await prisma.client.findMany({ orderBy: { lastName: "asc" } });
  const header = [
    "type",
    "companyName",
    "firstName",
    "lastName",
    "email",
    "phone",
    "mobile",
    "street",
    "city",
    "postalCode",
    "country",
    "taxId",
    "notes",
    "status",
  ];
  const rows = clients.map((c) =>
    [
      c.type,
      c.companyName,
      c.firstName,
      c.lastName,
      c.email,
      c.phone,
      c.mobile,
      c.street,
      c.city,
      c.postalCode,
      c.country,
      c.taxId,
      c.notes,
      c.status,
    ]
      .map(csvEscape)
      .join(","),
  );
  const csv = [header.join(","), ...rows].join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="clients-dmk.csv"',
    },
  });
}
