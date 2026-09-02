import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import fs from "fs";
import path from "path";
import type { Estimate, EstimateLineItem, Client, Vehicle, User, CompanySettings, VehiclePhoto } from "@prisma/client";
import { computeEstimateTotals, isMethodFixed, serviceTotalRows } from "./calculations";
import { formatDate, clientLabel, fullName } from "./utils";
import { DAMAGE_TYPES, REPAIR_METHODS, SEVERITIES, labelOf } from "./constants";
import {
  EXPLODED_PANEL_SHAPES,
  EXPLODED_VIEW,
  panelZoneId,
  resolveDiagramPanelMap,
} from "./diagram";

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

function publicFile(filePath: string | null | undefined) {
  if (!filePath) return null;
  const abs = path.join(process.cwd(), "public", filePath.replace(/^\//, ""));
  return fs.existsSync(abs) ? abs : null;
}

type JpegImage = { data: Uint8Array; width: number; height: number };

async function loadJpeg(
  filePath: string | null | undefined,
  maxEdge: number,
  quality: number,
  crop?: { left: number; top: number; width: number; height: number },
): Promise<JpegImage | null> {
  const abs = publicFile(filePath);
  if (!abs) return null;
  try {
    const sharp = (await import("sharp")).default;
    let pipeline = sharp(abs).rotate();
    if (crop) pipeline = pipeline.extract(crop);
    const { data, info } = await pipeline
      .resize({ width: maxEdge, height: maxEdge, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality, mozjpeg: true, chromaSubsampling: "4:2:0" })
      .toBuffer({ resolveWithObject: true });
    return { data: new Uint8Array(data), width: info.width ?? 1, height: info.height ?? 1 };
  } catch {
    return null;
  }
}

function fitBox(imgW: number, imgH: number, maxW: number, maxH: number) {
  const ratio = imgW / Math.max(imgH, 1);
  let w = maxW;
  let h = w / ratio;
  if (h > maxH) {
    h = maxH;
    w = h * ratio;
  }
  return { w, h };
}

function addJpeg(
  doc: jsPDF,
  image: JpegImage,
  x: number,
  y: number,
  w: number,
  h: number,
  alias: string,
) {
  doc.addImage(image.data, "JPEG", x, y, w, h, alias, "NONE");
}

function svgPathToPoints(d: string) {
  return d
    .replace(/Z/gi, "")
    .split(/[ML]/i)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [x, y] = chunk.split(/[\s,]+/).map(Number);
      return { x, y };
    })
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
}

function fillPolygon(
  doc: jsPDF,
  points: Array<{ x: number; y: number }>,
  originX: number,
  originY: number,
  scale: number,
  style: "F" | "S" | "FD" = "F",
) {
  if (points.length < 3) return;
  const lines = points.slice(1).map((point, i) => [
    (point.x - points[i].x) * scale,
    (point.y - points[i].y) * scale,
  ]);
  doc.lines(lines, originX + points[0].x * scale, originY + points[0].y * scale, [1, 1], style, true);
}

function drawExplodedDiagram(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  jpeg: JpegImage | null,
  selected: string[],
  dentCounts: Record<string, number>,
  panelMap: Record<string, string>,
) {
  const box = EXPLODED_VIEW.content;
  const height = (width * box.height) / box.width;
  const scale = width / box.width;
  if (jpeg) {
    addJpeg(doc, jpeg, x, y, width, height, "exploded-view");
  }
  const selectedSet = new Set(selected);
  for (const panel of EXPLODED_PANEL_SHAPES) {
    const piece = panelMap[panelZoneId(panel.label)] ?? panel.label;
    if (!selectedSet.has(piece)) continue;
    const points = svgPathToPoints(panel.d).map((point) => ({
      x: point.x - box.x,
      y: point.y - box.y,
    }));
    doc.setFillColor(0, 217, 245);
    doc.setDrawColor(10, 61, 72);
    doc.setLineWidth(0.25);
    fillPolygon(doc, points, x, y, scale, "FD");
    const dents = dentCounts[piece] ?? 0;
    if (dents > 0) {
      const cx = x + (panel.badge.x - box.x) * scale;
      const cy = y + (panel.badge.y - box.y) * scale;
      doc.setFillColor(10, 61, 72);
      doc.circle(cx, cy, Math.max(2.8, width * 0.016), "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text(String(dents), cx, cy + 0.9, { align: "center" });
    }
  }
  return height;
}

export async function buildEstimatePdf(
  estimate: EstimatePdf,
  settings: CompanySettings,
  photos: VehiclePhoto[] = [],
  lookups: Array<{ id: string; label: string }> = [],
) {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 16;
  let y = 16;

  const [logo, explodedJpeg] = await Promise.all([
    loadJpeg(settings.logoPath, 360, 72).then((img) => img ?? loadJpeg("/branding/logo.png", 360, 72)),
    loadJpeg(EXPLODED_VIEW.image, 1100, 68, {
      left: EXPLODED_VIEW.content.x,
      top: EXPLODED_VIEW.content.y,
      width: EXPLODED_VIEW.content.width,
      height: EXPLODED_VIEW.content.height,
    }),
  ]);
  const logoBox = logo ? fitBox(logo.width, logo.height, 48, 18) : null;
  if (logo && logoBox) {
    try {
      addJpeg(doc, logo, margin, y, logoBox.w, logoBox.h, "company-logo");
    } catch {
      /* ignore invalid logo */
    }
  }
  const headerX = logoBox ? margin + logoBox.w + 4 : margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(12, 25, 41);
  doc.text(settings.name || "DMK Services", headerX, y + 6);

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
  companyLines.forEach((line, i) => doc.text(line, headerX, y + 12 + i * 4));

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
      Number(line.laborHours).toFixed(1),
      formatPdfCurrency(line.laborRate),
      formatPdfCurrency(line.partsCost),
      formatPdfCurrency(line.paintCost),
      isMethodFixed(estimate.servicePricing, line.repairMethod) ? "—" : formatPdfCurrency(line.lineTotal),
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

  const pageBottom = 284;
  let ty = lastTableY(doc, y) + 6;

  const totals = computeEstimateTotals(estimate);
  const gap = 4;
  const innerW = pageW - margin * 2;
  const boxW = (innerW - gap) / 2;
  const leftX = margin;
  const rightX = margin + boxW + gap;
  const rowH = 7;
  const titleH = 7;
  const repairRows = serviceTotalRows(totals, true).map((row): [string, string, boolean?] => [
    row.label,
    formatPdfCurrency(row.value),
  ]);
  const priceRows: Array<[string, string, boolean?]> = [
    ["Sous-total", formatPdfCurrency(totals.subtotal)],
    [`TVA (${Number(estimate.taxRate) || 0} %)`, formatPdfCurrency(totals.tax)],
    ["Total TTC", formatPdfCurrency(totals.grandTotal), true],
  ];
  const boxH = titleH + Math.max(repairRows.length, priceRows.length) * rowH + 4;
  if (ty + boxH > pageBottom) {
    doc.addPage();
    ty = 18;
  }

  function drawTotalsBox(
    x: number,
    title: string,
    rows: Array<[string, string, boolean?]>,
  ) {
    doc.setFillColor(244, 252, 254);
    doc.setDrawColor(200, 238, 245);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, ty - 2, boxW, boxH, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(10, 61, 72);
    doc.text(title, x + 3.5, ty + 3);
    rows.forEach(([label, value, strong], i) => {
      const rowY = ty + titleH + i * rowH;
      if (strong) {
        doc.setFillColor(0, 217, 245);
        doc.roundedRect(x + 0.6, rowY - 1.4, boxW - 1.2, rowH, 1, 1, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
      } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
      }
      doc.setTextColor(10, 61, 72);
      doc.text(label, x + 3.5, rowY + 3.6);
      doc.text(value, x + boxW - 3.5, rowY + 3.6, { align: "right" });
    });
  }

  drawTotalsBox(leftX, "Total réparation", repairRows);
  drawTotalsBox(rightX, "Prix total", priceRows);

  const dentCounts: Record<string, number> = {};
  for (const line of estimate.lineItems) {
    if (!line.panel) continue;
    dentCounts[line.panel] = (dentCounts[line.panel] ?? 0) + (Number(line.dentCount) || 0);
  }
  const selectedPanels = [
    ...new Set(
      estimate.lineItems
        .map((line) => line.panel)
        .filter((panel): panel is string => Boolean(panel)),
    ),
  ];
  const panelMap = resolveDiagramPanelMap(settings.carDiagramMaps, "exploded", lookups);
  const fullW = pageW - margin * 2;
  const diagramW = fullW * 0.7;
  const diagramX = margin + (fullW - diagramW) / 2;
  const diagramH = (diagramW * EXPLODED_VIEW.content.height) / EXPLODED_VIEW.content.width;
  let diagramY = ty + boxH + 4;
  if (diagramY + 5 + diagramH > pageBottom) {
    doc.addPage();
    diagramY = 16;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(12, 25, 41);
  doc.text("Éclaté des dommages", pageW / 2, diagramY, { align: "center" });
  const usedH = drawExplodedDiagram(
    doc,
    diagramX,
    diagramY + 2,
    diagramW,
    explodedJpeg,
    selectedPanels,
    dentCounts,
    panelMap,
  );

  let notesY = diagramY + 2 + usedH + 6;
  if (notesY > pageBottom - 24) {
    doc.addPage();
    notesY = 18;
  }
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

  const signH = 16;
  notesY += 8;
  if (notesY + signH > pageBottom) {
    doc.addPage();
    notesY = 18;
  }
  doc.setDrawColor(180, 190, 200);
  doc.setLineWidth(0.3);
  doc.rect(margin, notesY, 70, signH);
  doc.setFontSize(7.5);
  doc.setTextColor(120, 130, 140);
  doc.text("Signature client", margin + 3, notesY + 4);
  doc.rect(pageW - margin - 70, notesY, 70, signH);
  doc.text("Cachet / signature DMK", pageW - margin - 67, notesY + 4);

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
      const img = await loadJpeg(photo.path, 420, 48);
      if (!img) continue;
      if (py + imgH > 280) {
        doc.addPage();
        px = margin;
        py = 20;
      }
      try {
        addJpeg(doc, img, px, py, imgW, imgH, `photo-${photo.id}`);
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
