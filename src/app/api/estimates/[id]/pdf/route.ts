import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized, jsonError } from "@/lib/auth";
import { buildEstimatePdf } from "@/lib/pdf";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return unauthorized();
  const { id } = await params;
  const estimate = await prisma.estimate.findUnique({
    where: { id },
    include: {
      client: true,
      vehicle: true,
      estimator: true,
      lineItems: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!estimate) return jsonError("Devis introuvable", 404);
  const [settings, photos, lookups] = await Promise.all([
    prisma.companySettings.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default", name: "DMK Services" },
    }),
    estimate.includePhotos
      ? prisma.vehiclePhoto.findMany({ where: { vehicleId: estimate.vehicleId } })
      : Promise.resolve([]),
    prisma.lookupValue.findMany({ where: { category: "PANEL", active: true } }),
  ]);
  const pdf = await buildEstimatePdf(estimate, settings, photos, lookups);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${estimate.number}.pdf"`,
    },
  });
}
