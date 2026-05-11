import { NextResponse } from "next/server";
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";

import { queryRows } from "@/lib/db";
import {
  calculateProjectReport,
  ensureProjectTables,
  listProjectCosts,
  listProjectRevenues,
  listOfficeExpensesBySequence,
  type LandProject,
  type ProjectFinancialReport,
} from "@/lib/projects";
import { getCurrentSession } from "@/lib/session-server";

type RouteParams = {
  params: Promise<{ id: string }>;
};

const fmtTZS = (n: number) =>
  `TZS ${new Intl.NumberFormat("en-TZ", { maximumFractionDigits: 0 }).format(Math.round(n))}`;

const fmtDate = (s: string) => {
  const d = new Date(s);
  return Number.isNaN(d.getTime())
    ? s
    : new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(d);
};

function safeFilename(s: string) {
  return s
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

// pdf-lib StandardFonts use WinAnsi encoding; sanitize anything outside its range.
function wa(s: string | null | undefined): string {
  if (s == null) return "";
  return String(s)
    .replace(/\r\n?/g, "\n")
    .replace(/[—–]/g, "-") // em/en dash
    .replace(/[‘’]/g, "'") // smart single quotes
    .replace(/[“”]/g, '"') // smart double quotes
    .replace(/→/g, "->")
    .replace(/←/g, "<-")
    .replace(/↑/g, "^")
    .replace(/↓/g, "v")
    .replace(/[•●]/g, "*") // bullets
    .replace(/×/g, "x") // multiplication sign (also covered by WinAnsi but normalize)
    .replace(/[^\x20-\x7E\xA0-\xFF\n]/g, "?");
}

export async function GET(_req: Request, { params }: RouteParams) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "admin" && session.role !== "director") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const projectId = Number(id);
  if (!projectId) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  await ensureProjectTables();

  const [project] = await queryRows<LandProject & { sequenceId: number }>(
    `SELECT id, sequence_id AS sequenceId, name, description,
      land_cost AS landCost, capital_before AS capitalBefore,
      project_number AS projectNumber, status,
      starts_at AS startsAt, ends_at AS endsAt,
      snap_total_revenue AS snapshotTotalRevenue,
      snap_project_costs AS snapshotProjectCosts,
      snap_office_expenses AS snapshotOfficeExpenses,
      snap_gross_profit AS snapshotGrossProfit,
      snap_office_allocation AS snapshotOfficeAllocation,
      snap_net_profit AS snapshotNetProfit,
      snap_tithe AS snapshotTithe,
      snap_debt_payment AS snapshotDebtPayment,
      snap_retained_earnings AS snapshotRetainedEarnings,
      snap_capital_after AS snapshotRunningCapitalAfter,
      completed_at AS completedAt,
      created_by AS createdBy, created_at AS createdAt
     FROM land_projects WHERE id = ? LIMIT 1`,
    [projectId],
  );
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const [seqRow] = await queryRows<{ name: string; totalProjects: number }>(
    `SELECT name, total_projects AS totalProjects
     FROM land_project_sequences WHERE id = ? LIMIT 1`,
    [project.sequenceId],
  );

  const N = Math.max(1, Number(seqRow?.totalProjects ?? 4));
  const [revenues, costs, seqOe] = await Promise.all([
    listProjectRevenues(projectId),
    listProjectCosts(projectId),
    listOfficeExpensesBySequence(project.sequenceId),
  ]);

  const seqOeTotal = seqOe.reduce((s, e) => s + Number(e.amount), 0);
  const officeForCalc =
    project.status === "completed" ? [] : [{ amount: seqOeTotal }];
  const report = calculateProjectReport(project, revenues, costs, officeForCalc, {
    sequenceTotalProjects: N,
  });

  const pdfBytes = await buildLandProjectPdf({
    project,
    sequenceName: seqRow?.name ?? "-",
    sequenceTotalProjects: N,
    revenues,
    costs,
    seqOfficeExpenses: seqOe,
    seqOfficeTotal: seqOeTotal,
    report,
  });

  const filename = `land-project-${project.projectNumber}-${safeFilename(project.name)}.pdf`;
  const body = new Uint8Array(pdfBytes);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

type BuildArgs = {
  project: LandProject;
  sequenceName: string;
  sequenceTotalProjects: number;
  revenues: { description: string; amount: number; revenueDate: string }[];
  costs: { category: string; description: string; amount: number; costDate: string }[];
  seqOfficeExpenses: {
    itemName: string;
    amount: number;
    expenseDate: string;
    note: string | null;
  }[];
  seqOfficeTotal: number;
  report: ProjectFinancialReport;
};

async function buildLandProjectPdf(args: BuildArgs): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([595.28, 841.89]); // A4 portrait
  const pageHeight = page.getHeight();
  const margin = 40;
  const right = page.getWidth() - margin;
  let y = page.getHeight() - margin;

  const accent = rgb(0.83, 0.64, 0.25);
  const textC = rgb(0.12, 0.13, 0.18);
  const muted = rgb(0.4, 0.42, 0.48);
  const negC = rgb(0.85, 0.25, 0.25);
  const posC = rgb(0.18, 0.55, 0.45);
  const headerBg = rgb(0.96, 0.97, 1);
  const rowAlt = rgb(0.98, 0.99, 1);
  const totalBoxBg = rgb(0.1, 0.12, 0.18);

  // Company header
  page.drawText("OWERU INTERNATIONAL LTD", {
    x: margin,
    y: pageHeight - 50,
    size: 16.5,
    font: helvBold,
    color: muted,
  });
  page.drawText("Land Project Financial Report", {
    x: margin,
    y: pageHeight - 72,
    size: 14,
    font: helvBold,
    color: textC,
  });

  // Right side info box - calculate max width and wrap/truncate properly
  const maxInfoX = right - 10;
  const infoBoxStartX = 380; // Move left to give more room
  const availableWidth = maxInfoX - infoBoxStartX;

  page.drawText(`Project P${args.project.projectNumber}`, {
    x: infoBoxStartX,
    y: pageHeight - 50,
    size: 14,
    font: helvBold,
    color: accent,
  });
  // Calculate available space for sequence name
  const seqPrefix = "Seq: ";
  const maxSeqChars = Math.floor(availableWidth / 6.5);
  const truncSeqName = wa(args.sequenceName).slice(0, Math.max(15, maxSeqChars)) + (args.sequenceName.length > maxSeqChars ? "..." : "");
  page.drawText(`${seqPrefix}${truncSeqName}`, {
    x: infoBoxStartX,
    y: pageHeight - 70,
    size: 10,
    font: helv,
    color: muted,
  });
  page.drawText(`Status: ${args.project.status}`, {
    x: infoBoxStartX,
    y: pageHeight - 86,
    size: 10,
    font: helv,
    color: textC,
  });
  page.drawText(`Period: ${fmtDate(args.project.startsAt)} - ${fmtDate(args.project.endsAt)}`, {
    x: infoBoxStartX,
    y: pageHeight - 102,
    size: 10,
    font: helv,
    color: muted,
  });

  y = pageHeight - 130;
  page.drawLine({ start: { x: margin, y }, end: { x: right, y }, thickness: 1, color: headerBg });
  y -= 15;

  const newPageIfNeeded = (need = 60) => {
    if (y - need < margin) {
      page = pdf.addPage([595.28, 841.89]);
      y = page.getHeight() - margin;
    }
  };

  // Table helper functions
  const tableLeftX = margin;
  const tableFullWidth = right - margin;
  const colDateX = tableLeftX + 10;
  const colDescX = tableLeftX + 90;
  const colAmountX = right - 80;

  const tableHeader = (title: string) => {
    newPageIfNeeded(50);
    // Header background
    page.drawRectangle({
      x: tableLeftX,
      y: y - 5,
      width: tableFullWidth,
      height: 22,
      color: headerBg,
    });
    page.drawText(title, {
      x: tableLeftX + 10,
      y: y + 2,
      size: 11.5,
      font: helvBold,
      color: textC,
    });
    y -= 25;
  };

  const tableRow = (date: string, description: string, amount: string, amountColor = textC, isAlt = false) => {
    newPageIfNeeded(28);
    if (isAlt) {
      page.drawRectangle({
        x: tableLeftX,
        y: y - 10,
        width: tableFullWidth,
        height: 26,
        color: rowAlt,
      });
    }
    page.drawText(date, { x: colDateX, y, size: 9.5, font: helv, color: muted });
    const descText = wa(description).slice(0, 55);
    page.drawText(descText, { x: colDescX, y, size: 9.5, font: helv, color: textC });
    const amtWidth = helv.widthOfTextAtSize(amount, 9.5);
    page.drawText(amount, { x: right - amtWidth, y, size: 9.5, font: helvBold, color: amountColor });
    y -= 26;
  };

  const totalRow = (label: string, value: string, valueColor = textC, isHighlight = false) => {
    newPageIfNeeded(35);
    if (isHighlight) {
      const boxWidth = 200;
      const boxX = right - boxWidth;
      // Truncate label if too long for the box
      const truncLabel = helv.widthOfTextAtSize(label, 9.5) > boxWidth - 90
        ? label.slice(0, 20) + (label.length > 20 ? "..." : "")
        : label;
      page.drawRectangle({
        x: boxX,
        y: y - 8,
        width: boxWidth,
        height: 24,
        color: totalBoxBg,
      });
      page.drawText(truncLabel, {
        x: boxX + 8,
        y: y + 2,
        size: 9.5,
        font: helv,
        color: rgb(0.7, 0.7, 0.75),
      });
      const valWidth = helvBold.widthOfTextAtSize(value, 10);
      page.drawText(value, {
        x: right - valWidth - 8,
        y: y + 2,
        size: 10,
        font: helvBold,
        color: rgb(1, 1, 1),
      });
    } else {
      // Truncate label if it would overlap with value
      const maxLabelWidth = right - tableLeftX - 10 - helvBold.widthOfTextAtSize(value, 10.5) - 15;
      const truncLabel = helv.widthOfTextAtSize(label, 10) > maxLabelWidth
        ? label.slice(0, Math.floor(maxLabelWidth / 7)) + (label.length > Math.floor(maxLabelWidth / 7) ? "..." : "")
        : label;
      page.drawText(wa(truncLabel), { x: tableLeftX + 10, y, size: 10, font: helv, color: muted });
      const valWidth = helvBold.widthOfTextAtSize(value, 10.5);
      page.drawText(value, {
        x: right - valWidth,
        y,
        size: 10.5,
        font: helvBold,
        color: valueColor,
      });
    }
    y -= 28;
  };

  // Project summary section
  tableHeader("Project Details");
  totalRow("Land Cost", fmtTZS(Number(args.project.landCost)));
  totalRow("Capital Before", fmtTZS(Number(args.project.capitalBefore)));
  if (args.project.description) {
    page.drawText(wa(args.project.description), {
      x: tableLeftX + 10,
      y,
      size: 9.5,
      font: helv,
      color: muted,
    });
    y -= 18;
  }
  y -= 10;

  // Financial summary
  const shareLabel = `(share = 1/${args.sequenceTotalProjects})`;
  tableHeader(`Financial Flow ${shareLabel}`);
  totalRow("Total Revenue", fmtTZS(args.report.totalRevenue), posC);
  totalRow("Land Cost", `- ${fmtTZS(args.report.landCost)}`, negC);
  totalRow("Project Costs", `- ${fmtTZS(args.report.projectCosts)}`, negC);
  totalRow("Gross Profit", fmtTZS(args.report.grossProfit));
  totalRow("Office Expenses (seq)", `- ${fmtTZS(args.report.officeAllocation)}`, negC);
  totalRow("Net Profit", fmtTZS(Math.max(0, args.report.netProfit)));
  totalRow("Tithe (10%)", `- ${fmtTZS(args.report.tithe)}`, negC);
  totalRow("Debt Payment (20%)", `- ${fmtTZS(args.report.debtPayment)}`, negC);
  y -= 8;

  // Highlighted final totals
  totalRow("Retained Earnings", fmtTZS(args.report.retainedEarnings), posC, true);
  totalRow("Running Capital After", fmtTZS(args.report.runningCapitalAfter), accent, true);
  y -= 15;

  // Revenues table
  tableHeader(`Revenue Entries (${args.revenues.length})`);
  if (args.revenues.length === 0) {
    page.drawText("No revenue entries recorded.", {
      x: tableLeftX + 10,
      y,
      size: 10,
      font: helv,
      color: muted,
    });
    y -= 20;
  } else {
    args.revenues.forEach((r, i) => {
      tableRow(
        fmtDate(r.revenueDate),
        r.description,
        fmtTZS(Number(r.amount)),
        posC,
        i % 2 === 1,
      );
    });
  }
  y -= 10;

  // Costs table
  tableHeader(`Project Costs (${args.costs.length})`);
  if (args.costs.length === 0) {
    page.drawText("No cost entries recorded.", {
      x: tableLeftX + 10,
      y,
      size: 10,
      font: helv,
      color: muted,
    });
    y -= 20;
  } else {
    args.costs.forEach((c, i) => {
      tableRow(
        fmtDate(c.costDate),
        `[${c.category}] ${c.description}`,
        fmtTZS(Number(c.amount)),
        negC,
        i % 2 === 1,
      );
    });
  }
  y -= 10;

  // Office expenses table
  tableHeader(`Sequence Office Expenses (${args.seqOfficeExpenses.length}) · Total: ${fmtTZS(args.seqOfficeTotal)}`);
  if (args.seqOfficeExpenses.length === 0) {
    page.drawText("No office expenses recorded for this sequence.", {
      x: tableLeftX + 10,
      y,
      size: 10,
      font: helv,
      color: muted,
    });
    y -= 20;
  } else {
    args.seqOfficeExpenses.forEach((e, i) => {
      const noteText = e.note ? ` - ${e.note}` : "";
      const shareAmt = fmtTZS(Number(e.amount) / args.sequenceTotalProjects);
      tableRow(
        fmtDate(e.expenseDate),
        `${e.itemName}${noteText} (share: ${shareAmt})`,
        fmtTZS(Number(e.amount)),
        textC,
        i % 2 === 1,
      );
    });
  }

  // Footer
  newPageIfNeeded(40);
  y -= 10;
  page.drawLine({ start: { x: margin, y }, end: { x: right, y }, thickness: 0.5, color: headerBg });
  y -= 15;
  page.drawText(
    wa(`Generated ${fmtDate(new Date().toISOString())} | OWERU Management System`),
    { x: margin, y, size: 8.5, font: helv, color: muted },
  );

  return await pdf.save();
}
