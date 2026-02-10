// src/lib/pdf.ts
import jsPDF from "jspdf";
import autoTable, { type RowInput } from "jspdf-autotable";

export type Item = {
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuentoPct?: number;
};

export type PresupuestoPDF = {
  numero?: number;
  codigo?: string; // P-YYYY-####
  cliente: string;
  fecha: string; // yyyy-mm-dd
  notas?: string;
  items: Item[];
  subtotal?: number;
  bonificacionPct?: number;
  total: number;
  moneda?: "ARS" | "USD";

  // Branding (opcionales)
  logoDataUrl?: string; // si no lo pasás, no imprime logo
  sub?: string;
  address?: string;
  phone?: string;
  email?: string;
  footerText?: string;
};

export type OrdenPDF = {
  codigoSolicitud?: string; // P-YYYY-####
  codigoOrden?: string;      // OT-YYYY-####
  cliente: string;
  fecha: string;
  equipo: {
    marca?: string;
    modelo?: string;
    imeiSerie?: string;
  };
  diagnostico?: string;
  trabajos: { descripcion: string; horas?: number; precio?: number }[];
  repuestos: { descripcion: string; cantidad: number; precio: number }[];
  totalFinal: number;
  pagado: number;
  saldo: number;
  moneda?: "ARS" | "USD";
  notasEntrega?: string;

  logoDataUrl?: string;
  sub?: string;
  address?: string;
  phone?: string;
  email?: string;
  footerText?: string;
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
    } catch { }
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
  const hasAnyDiscount = p.items.some(it => it.descuentoPct && it.descuentoPct > 0);

  const head = [["Descripción", "Cant.", "P. Unitario"]];
  if (hasAnyDiscount) head[0].push("Desc.");
  head[0].push("Subtotal");

  const body: RowInput[] = (
    p.items.length
      ? p.items
      : [{ descripcion: "(sin ítems)", cantidad: 0, precioUnitario: 0 }]
  ).map((it) => {
    const unitPriceRecalculated = it.precioUnitario;
    const row = [
      it.descripcion || "-",
      String(it.cantidad),
      fmtMoney(unitPriceRecalculated, currency),
    ];

    if (hasAnyDiscount) {
      row.push(it.descuentoPct ? `${it.descuentoPct}%` : "-");
    }

    const priceAfterDesc = it.descuentoPct
      ? unitPriceRecalculated * (1 - it.descuentoPct / 100)
      : unitPriceRecalculated;

    row.push(fmtMoney(it.cantidad * priceAfterDesc, currency));
    return row;
  });

  const colStyles: any = {
    0: { halign: "left" },
    1: { halign: "center", cellWidth: 50 },
    2: { halign: "right", cellWidth: 90 },
  };

  if (hasAnyDiscount) {
    colStyles[3] = { halign: "center", cellWidth: 50 };
    colStyles[4] = { halign: "right", cellWidth: 90 };
  } else {
    colStyles[3] = { halign: "right", cellWidth: 90 };
  }

  autoTable(doc, {
    theme: "grid",
    startY: topInfoY + 20,
    head,
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
    columnStyles: colStyles,
    margin: { left: M, right: M },
    didDrawPage: () => {
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(p.footerText || "Gracias por su consulta", M, H - 20);
    },
  });

  // ==== Total + Notas ====
  const afterTableY = (doc as any).lastAutoTable.finalY + 12;
  doc.setTextColor(0);

  // Total box
  const boxW = 240;
  const boxX = W - M - boxW;
  const boxY = afterTableY;

  const showGlobalDiscount = p.bonificacionPct && p.bonificacionPct > 0;
  const boxH = showGlobalDiscount ? 64 : 44;

  doc.setDrawColor(0);
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(boxX, boxY, boxW, boxH, 4, 4, "FD");

  let textY = boxY + 26;

  if (showGlobalDiscount && p.subtotal != null) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Subtotal", boxX + 12, textY - 10);
    doc.text(fmtMoney(p.subtotal, currency), boxX + boxW - 12, textY - 10, { align: "right" });

    doc.text(`Bonificación (${p.bonificacionPct}%)`, boxX + 12, textY + 4);
    const bonifAmt = (p.subtotal * (p.bonificacionPct || 0)) / 100;
    doc.text(`- ${fmtMoney(bonifAmt, currency)}`, boxX + boxW - 12, textY + 4, { align: "right" });

    textY += 22;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total", boxX + 12, textY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(fmtMoney(p.total, currency), boxX + boxW - 12, textY, { align: "right" });

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

export async function generarOrdenPDF(o: OrdenPDF) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 40;

  // ==== Header ====
  const headerY = M;
  if (o.logoDataUrl) {
    try {
      doc.addImage(o.logoDataUrl, "PNG", M, headerY - 5, 140, 40, undefined, "FAST");
    } catch { }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(`Informe de Servicio Técnico`, W - M, headerY + 4, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  let infoY = headerY + 22;
  const rightBlock = [
    o.sub ?? "",
    o.address ?? "",
    o.phone ?? "",
    o.email ?? "",
  ].filter(Boolean);
  rightBlock.forEach((line) => {
    doc.text(line, W - M, infoY, { align: "right" });
    infoY += 14;
  });

  // ==== Datos de Orden / Cliente ====
  let y = Math.max(headerY + 70, infoY + 20);
  doc.setDrawColor(200);
  doc.line(M, y, W - M, y);
  y += 20;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Cliente:", M, y);
  doc.setFont("helvetica", "normal");
  doc.text(o.cliente, M + 60, y);

  doc.setFont("helvetica", "bold");
  doc.text("Fecha:", W - M - 150, y);
  doc.setFont("helvetica", "normal");
  doc.text(o.fecha, W - M - 100, y);
  y += 18;

  doc.setFont("helvetica", "bold");
  doc.text("Equipo:", M, y);
  doc.setFont("helvetica", "normal");
  doc.text(`${o.equipo.marca || ""} ${o.equipo.modelo || ""}`.trim() || "-", M + 60, y);

  doc.setFont("helvetica", "bold");
  doc.text("Orden:", W - M - 150, y);
  doc.setFont("helvetica", "normal");
  doc.text(o.codigoOrden || "-", W - M - 100, y);
  y += 18;

  if (o.equipo.imeiSerie) {
    doc.setFont("helvetica", "bold");
    doc.text("IMEI/Serie:", M, y);
    doc.setFont("helvetica", "normal");
    doc.text(o.equipo.imeiSerie, M + 80, y);
    y += 18;
  }

  y += 10;
  // ==== Diagnóstico ====
  if (o.diagnostico) {
    doc.setFont("helvetica", "bold");
    doc.text("Diagnóstico / Informe Técnico:", M, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const splitDiag = doc.splitTextToSize(o.diagnostico, W - M * 2);
    doc.text(splitDiag, M, y);
    y += splitDiag.length * 12 + 20;
  }

  // ==== Notas de Entrega ====
  if (o.notasEntrega) {
    doc.setFont("helvetica", "bold");
    doc.text("Notas de Entrega (Para el Cliente):", M, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const splitNotas = doc.splitTextToSize(o.notasEntrega, W - M * 2);
    doc.text(splitNotas, M, y);
    y += splitNotas.length * 12 + 20;
  }

  y += 10;

  // ==== Footer ====
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(o.footerText || "Sontech - Servicio Técnico Profesional", M, H - 30);

  return doc;
}
