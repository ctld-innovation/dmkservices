import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import fs from "fs";
import path from "path";
import type { Estimate, EstimateLineItem, Client, Vehicle, User, CompanySettings, VehiclePhoto } from "@prisma/client";
import { computeTotals } from "./calculations";
import { formatDate, clientLabel, fullName } from "./utils";
import { DAMAGE_TYPES, REPAIR_METHODS, SEVERITIES, labelOf } from "./constants";

/** Helvetica (WinAnsi) ignore NBSP / espaces fins : les montants se décalent ou disparaissent. */
function formatPdfCurrency(value: number) {
  const n = Number(value) || 0;
  const sign = n < 0 ? "-" : "";
  const [intRaw, dec] = Math.abs(n).toFixed(2).split(".");
  const int = intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${sign}${int},${dec} €`;
}

function lastTableY(doc: jsPDF, fallback: number) {
  return (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? fallback;
}

type EstimatePdf = Estimate & {
  client: Client;
  vehicle: Vehicle;
  estimator: User;
  lineItems: EstimateLineItem[];
};

function loadImage(filePath: string | null | undefined): { data: string; ext: string } | null {
  if (!filePath) return null;
  const abs = path.join(process.cwd(), "public", filePath.replace(/^\//, ""));
  if (!fs.existsSync(abs)) return null;
  const buf = fs.readFileSync(abs);
  const ext = path.extname(abs).toLowerCase().replace(".", "");
  const mime = ext === "jpg" ? "jpeg" : ext;
  if (!["png", "jpeg", "webp"].includes(mime === "jpg" ? "jpeg" : mime)) {
    if (ext === "svg") return null;
  }
  return { data: `data:image/${mime};base64,${buf.toString("base64")}`, ext: mime === "jpg" ? "JPEG" : mime.toUpperCase() };
}

export async function buildEstimatePdf(
  estimate: EstimatePdf,
  settings: CompanySettings,
  photos: VehiclePhoto[] = [],
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 16;
  let y = 16;

  const logo = loadImage(settings.logoPath) ?? loadImage("/branding/logo.png");
  if (logo) {
    try {
      doc.addImage(logo.data, logo.ext, margin, y, 26, 26);
    } catch {
      /* ignore invalid logo */
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(12, 25, 41);
  doc.text(settings.name || "DMK Services", logo ? margin + 30 : margin, y + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 90, 100);
  const companyLines = [
    [settings.street, `${settings.postalCode ?? ""} ${settings.city ?? ""}`.trim(), settings.country]
      .filter(Boolean)
      .join(" · "),
    [settings.phone, settings.email].filter(Boolean).join(" · "),
    settings.taxId ? `TVA : ${settings.taxId}` : "",
  ].filter(Boolean);
  companyLines.forEach((line, i) => doc.text(line, logo ? margin + 30 : margin, y + 14 + i * 4));

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(12, 25, 41);
  doc.text("DEVIS", pageW - margin, y + 6, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(0, 184, 212);
  doc.text(estimate.number, pageW - margin, y + 12, { align: "right" });
  doc.setTextColor(80, 90, 100);
  doc.text(`Date : ${formatDate(estimate.date)}`, pageW - margin, y + 17, { align: "right" });
  if (estimate.damageDate) {
    doc.text(`Sinistre : ${formatDate(estimate.damageDate)}`, pageW - margin, y + 22, { align: "right" });
  }

  y = 48;
  doc.setDrawColor(0, 229, 255);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  const colW = (pageW - margin * 2 - 8) / 2;
  drawBox(doc, margin, y, colW, 32, "Client", [
    clientLabel(estimate.client),
    estimate.client.street || "",
    `${estimate.client.postalCode ?? ""} ${estimate.client.city ?? ""}`.trim(),
    estimate.client.email || "",
    estimate.client.phone || estimate.client.mobile || "",
    estimate.client.taxId ? `TVA : ${estimate.client.taxId}` : "",
  ]);
  drawBox(doc, margin + colW + 8, y, colW, 32, "Véhicule", [
    `${estimate.vehicle.brand} ${estimate.vehicle.model}`,
    `Immat. : ${estimate.vehicle.licensePlate}`,
    `VIN : ${estimate.vehicle.vin}`,
    estimate.vehicle.year ? `Année : ${estimate.vehicle.year}` : "",
    estimate.vehicle.color ? `Couleur : ${estimate.vehicle.color}` : "",
    estimate.vehicle.mileage != null ? `Km : ${estimate.vehicle.mileage.toLocaleString("fr-FR")}` : "",
  ]);

  y += 40;
  doc.setFontSize(9);
  doc.setTextColor(80, 90, 100);
  doc.text(`Estimateur : ${fullName(estimate.estimator.firstName, estimate.estimator.lastName)}`, margin, y);

  const body = estimate.lineItems
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((line) => [
      line.panel,
      labelOf(DAMAGE_TYPES, line.damageType),
      labelOf(REPAIR_METHODS, line.repairMethod),
      labelOf(SEVERITIES, line.severity),
      String(line.dentCount || ""),
      line.laborHours.toFixed(1),
      formatPdfCurrency(line.laborRate),
      formatPdfCurrency(line.partsCost),
      formatPdfCurrency(line.paintCost),
      formatPdfCurrency(line.lineTotal),
    ]);

  autoTable(doc, {
    startY: y + 4,
    head: [[
      "Pièce",
      "Dommage",
      "Méthode",
      "Sévérité",
      "Bosses",
      "Heures",
      "Taux",
      "Pièces",
      "Peinture",
      "Total",
    ]],
    body,
    styles: { fontSize: 7.5, cellPadding: 1.6, textColor: [30, 40, 50] },
    headStyles: {
      fillColor: [0, 217, 245],
      textColor: [10, 61, 72],
      fontStyle: "bold",
      fontSize: 7.5,
    },
    alternateRowStyles: { fillColor: [244, 252, 254] },
    margin: { left: margin, right: margin },
    columnStyles: {
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right" },
      7: { halign: "right" },
      8: { halign: "right" },
      9: { halign: "right", fontStyle: "bold" },
    },
  });

  const totals = computeTotals(
    estimate.lineItems,
    estimate.discountType,
    estimate.discountValue,
    estimate.taxRate,
  );

  const totalsW = 78;
  const totalsX = pageW - margin - totalsW;
  let ty = lastTableY(doc, y) + 8;
  if (ty > 250) {
    doc.addPage();
    ty = 20;
  }

  const discountLabel =
    estimate.discountType === "PERCENT"
      ? `Remise (${Number(estimate.discountValue) || 0} %)`
      : "Remise";

  const totalRows: Array<[string, string, boolean?]> = [
    ["Sous-total", formatPdfCurrency(totals.subtotal)],
    [discountLabel, formatPdfCurrency(-Math.abs(totals.discount))],
    [`TVA (${Number(estimate.taxRate) || 0} %)`, formatPdfCurrency(totals.tax)],
    ["Total TTC", formatPdfCurrency(totals.grandTotal), true],
  ];

  const rowH = 7.2;
  const boxH = rowH * totalRows.length + 3;
  doc.setFillColor(244, 252, 254);
  doc.setDrawColor(200, 238, 245);
  doc.setLineWidth(0.3);
  doc.roundedRect(totalsX, ty - 2, totalsW, boxH, 1.5, 1.5, "FD");

  totalRows.forEach(([label, value, strong], i) => {
    const rowY = ty + i * rowH;
    if (strong) {
      doc.setFillColor(0, 217, 245);
      doc.roundedRect(totalsX + 0.6, rowY - 1.2, totalsW - 1.2, rowH, 1, 1, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
    }
    doc.setTextColor(10, 61, 72);
    doc.text(label, totalsX + 3.5, rowY + 4);
    doc.text(value, totalsX + totalsW - 3.5, rowY + 4, { align: "right" });
  });

  let notesY = ty + boxH + 8;
  if (estimate.clientNotes) {
    doc.setTextColor(12, 25, 41);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Notes & conditions", margin, notesY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(70, 80, 90);
    const split = doc.splitTextToSize(estimate.clientNotes, pageW - margin * 2);
    doc.text(split, margin, notesY + 5);
    notesY += 8 + split.length * 3.5;
  }

  if (settings.termsAndConditions) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(12, 25, 41);
    doc.text("Conditions générales", margin, notesY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(90, 100, 110);
    const split = doc.splitTextToSize(settings.termsAndConditions, pageW - margin * 2);
    doc.text(split, margin, notesY + 4);
    notesY += 6 + split.length * 3.2;
  }

  notesY += 10;
  doc.setDrawColor(180, 190, 200);
  doc.rect(margin, notesY, 70, 28);
  doc.setFontSize(8);
  doc.setTextColor(120, 130, 140);
  doc.text("Signature client", margin + 3, notesY + 5);
  doc.rect(pageW - margin - 70, notesY, 70, 28);
  doc.text("Cachet / signature DMK", pageW - margin - 67, notesY + 5);

  if (estimate.includePhotos && photos.length) {
    doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(12, 25, 41);
    doc.text("Photos des dommages", margin, 20);
    let px = margin;
    let py = 28;
    const imgW = 86;
    const imgH = 58;
    for (const photo of photos) {
      const img = loadImage(photo.path);
      if (!img) continue;
      if (py + imgH > 280) {
        doc.addPage();
        px = margin;
        py = 20;
      }
      try {
        doc.addImage(img.data, img.ext, px, py, imgW, imgH);
        doc.setFontSize(8);
        doc.setTextColor(90, 100, 110);
        doc.text(photo.caption || photo.filename, px, py + imgH + 4);
      } catch {
        /* skip */
      }
      if (px === margin) {
        px = margin + imgW + 6;
      } else {
        px = margin;
        py += imgH + 12;
      }
    }
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140, 150, 160);
    doc.text(
      `${settings.name ?? "DMK Services"} — ${estimate.number} — page ${i}/${pages}`,
      pageW / 2,
      290,
      { align: "center" },
    );
  }

  return Buffer.from(doc.output("arraybuffer"));
}

function drawBox(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  lines: string[],
) {
  doc.setFillColor(244, 252, 254);
  doc.setDrawColor(200, 238, 245);
  doc.roundedRect(x, y, w, h, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(0, 184, 212);
  doc.text(title.toUpperCase(), x + 4, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 40, 50);
  doc.setFontSize(8.5);
  lines
    .filter(Boolean)
    .slice(0, 5)
    .forEach((line, i) => doc.text(line, x + 4, y + 11 + i * 4));
}
