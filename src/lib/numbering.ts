import { prisma } from "./prisma";

export async function nextEstimateNumber() {
  const year = new Date().getFullYear();
  const settings = await prisma.companySettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", name: "DMK Services" },
  });

  let seq = settings.lastEstimateSeq;
  let seqYear = settings.lastEstimateYear;
  if (seqYear !== year) {
    seq = 0;
    seqYear = year;
  }
  seq += 1;

  await prisma.companySettings.update({
    where: { id: "default" },
    data: { lastEstimateSeq: seq, lastEstimateYear: seqYear },
  });

  const pad = settings.estimateSeqPad || 4;
  const prefix = settings.estimatePrefix || "EST";
  return `${prefix}-${year}-${String(seq).padStart(pad, "0")}`;
}
