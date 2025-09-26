// src/lib/pdf.ts
import jsPDF from "jspdf";
import autoTable, { type RowInput } from "jspdf-autotable";

export type Item = {
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
};

export type PresupuestoPDF = {
  numero?: number;
  codigo?: string; // P-YYYY-####
  cliente: string;
  fecha: string; // yyyy-mm-dd
  notas?: string;
  items: Item[];
  total: number;
  moneda?: "ARS" | "USD";

  // Branding (opcionales)
  logoDataUrl?: string; // si no lo pasás, no imprime logo
  sub?: string;
  address?: string;
  phone?: string;
  email?: string;
};

function fmtMoney(n: number, currency: "ARS" | "USD" = "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(n);
}

export async function toDataURL(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: "force-cache" });
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generarPresupuestoPDF(p: PresupuestoPDF) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 40;

  // ==== Header ====
  const headerY = M;
  if (p.logoDataUrl) {
    try {
      doc.addImage(
        p.logoDataUrl,
        "PNG",
        M,
        headerY - 5,
        140,
        40,
        undefined,
        "FAST"
      );
    } catch {}
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  const nro =
    p.codigo ??
    (p.numero != null ? `#${String(p.numero).padStart(4, "0")}` : "");
  doc.text(`Presupuesto ${nro}`, W - M, headerY + 4, { align: "right" });

  // Subtítulo + contacto
  const rightBlock = [
    p.sub ?? "",
    p.address ?? "",
    p.phone ?? "",
    p.email ?? "",
  ].filter(Boolean);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  let infoY = headerY + 22;
  rightBlock.forEach((line) => {
    doc.text(line, W - M, infoY, { align: "right" });
    infoY += 14;
  });

  // ==== Datos del cliente/fecha ====
  const topInfoY = Math.max(headerY + 60, infoY + 6);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Cliente:", M, topInfoY);
  doc.setFont("helvetica", "normal");
  doc.text(p.cliente || "-", M + 60, topInfoY);

  doc.setFont("helvetica", "bold");
  doc.text("Fecha:", W / 2, topInfoY);
  doc.setFont("helvetica", "normal");
  doc.text(p.fecha, W / 2 + 48, topInfoY);

  // ==== Tabla ====
  const currency = p.moneda ?? "ARS";
  const body: RowInput[] = (
    p.items.length
      ? p.items
      : [{ descripcion: "(sin ítems)", cantidad: 0, precioUnitario: 0 }]
  ).map((it) => [
    it.descripcion || "-",
    String(it.cantidad),
    fmtMoney(it.precioUnitario, currency),
    fmtMoney(it.cantidad * it.precioUnitario, currency),
  ]);

  autoTable(doc, {
    theme: "grid",
    startY: topInfoY + 20,
    head: [["Descripción", "Cant.", "P. Unitario", "Subtotal"]],
    body,
    styles: {
      font: "helvetica",
      fontSize: 10,
      cellPadding: 6,
      overflow: "linebreak",
      halign: "center",
      valign: "middle",
    },
    headStyles: { fillColor: [235, 235, 235], textColor: 20, lineWidth: 0.2 },
    bodyStyles: { lineWidth: 0.15 },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: {
      0: { halign: "left", cellWidth: W - M * 2 - (70 + 110 + 110) },
      1: { halign: "center", cellWidth: 70 },
      2: { halign: "right", cellWidth: 110 },
      3: { halign: "right", cellWidth: 110 },
    },
    margin: { left: M, right: M },
    didDrawPage: () => {
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text("Gracias por su consulta", M, H - 20);
    },
  });

  // ==== Total + Notas ====
  const afterTableY = (doc as any).lastAutoTable.finalY + 12;
  doc.setTextColor(0);

  // Total box
  const boxW = 240;
  const boxX = W - M - boxW;
  const boxY = afterTableY;

  doc.setDrawColor(0);
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(boxX, boxY, boxW, 44, 4, 4, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total", boxX + 12, boxY + 26);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(fmtMoney(p.total, currency), boxX + boxW - 12, boxY + 26, {
    align: "right",
  });

  if (p.notas?.trim()) {
    const y2 = boxY + 60;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Notas", M, y2);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const split = doc.splitTextToSize(p.notas, W - M * 2);
    doc.text(split, M, y2 + 16);
  }

  return doc;
}
