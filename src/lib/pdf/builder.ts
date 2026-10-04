import PDFDocument from "pdfkit";
import { PassThrough } from "stream";
import path from "path";

// PDFKit font metrics path — must be set before any PDFDocument is created
// because the package may resolve to a wrong root in bundled environments.
const PDFKIT_DATA_DIR = path.join(process.cwd(), "node_modules", "pdfkit", "js", "data");
process.env.PDFKIT_DATA_DIR = PDFKIT_DATA_DIR;

export interface PdfReportOptions {
  title: string;
  subtitle?: string;
  organization?: string;
  author?: string;
  locale?: "en" | "sw";
}

export interface PdfTableColumn {
  header: string;
  key: string;
  align?: "left" | "center" | "right";
  width?: number;
  formatter?: (value: unknown, row: unknown) => string;
}

export interface PdfKpiCard {
  label: string;
  value: string | number;
  subtext?: string;
}

const BRAND_PRIMARY: [number, number, number] = [15, 118, 110]; // emerald-700
const BRAND_ACCENT: [number, number, number] = [217, 119, 6]; // amber-600
const TEXT_DARK: [number, number, number] = [30, 41, 59]; // slate-800
const TEXT_MUTED: [number, number, number] = [100, 116, 139]; // slate-500
const BORDER_LIGHT: [number, number, number] = [226, 232, 240]; // slate-200
const BG_LIGHT: [number, number, number] = [248, 250, 252]; // slate-50
const HEADER_BG: [number, number, number] = [15, 118, 110];

const PAGE_WIDTH = 595.28; // A4 width in points
const PAGE_HEIGHT = 841.89; // A4 height in points
const MARGIN_X = 50;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN_X;

/**
 * High-level PDF report generator with cover page, exec summary,
 * tables, KPI cards, headers, footers, page numbers.
 */
export class PdfReportBuilder {
  private doc: PDFKit.PDFDocument;
  private options: PdfReportOptions;
  private currentPage = 1;
  private totalPagesPlaceholder: { y: number; x: number } | null = null;

  constructor(options: PdfReportOptions) {
    this.options = {
      organization: "CASFETA — CUD Chapter",
      ...options,
    };
    this.doc = new PDFDocument({
      size: "A4",
      margins: { top: 80, bottom: 70, left: MARGIN_X, right: MARGIN_X },
      bufferPages: true,
      info: {
        Title: options.title,
        Author: options.author ?? this.options.organization ?? "CUD Management System",
        Subject: options.subtitle ?? "",
        Creator: "CUD Management System",
        Producer: "CUD Management System",
      },
    });
    // Note: header/footer drawn manually per page (not via pageAdded) to avoid recursion.
  }

  /** Returns a Node Readable stream that can be piped to a Response. */
  getStream(): PassThrough {
    const stream = new PassThrough();
    this.doc.pipe(stream);
    return stream;
  }

  /** Finalise the document and resolve the buffer. */
  async end(): Promise<Buffer> {
    // Apply header/footer/page numbers on all pages EXCEPT cover (page 0)
    const total = this.doc.bufferedPageCount;
    for (let i = 1; i < total; i++) {
      this.doc.switchToPage(i);
      this.drawHeader();
      this.drawFooter();
      this.drawPageNumber(i + 1, total);
    }
    return new Promise<Buffer>((resolve) => {
      const chunks: Buffer[] = [];
      this.doc.on("data", (c: Buffer) => chunks.push(c));
      this.doc.on("end", () => resolve(Buffer.concat(chunks)));
      this.doc.end();
    });
  }

  // ─────────────────────────────── Header & Footer ───────────────────────────────

  private drawHeader() {
    const doc = this.doc;
    doc.save();
    // Header bar
    doc.fillColor(...HEADER_BG).rect(0, 0, PAGE_WIDTH, 4).fill();
    doc.fillColor(...TEXT_MUTED).fontSize(8).font("Helvetica");
    doc.text(this.options.organization ?? "CUD Management System", MARGIN_X, 28, {
      align: "left",
      width: CONTENT_WIDTH * 0.5,
    });
    doc.text(this.options.title, MARGIN_X + CONTENT_WIDTH * 0.5, 28, {
      align: "right",
      width: CONTENT_WIDTH * 0.5,
    });
    // Thin divider
    doc
      .strokeColor(...BORDER_LIGHT)
      .lineWidth(0.5)
      .moveTo(MARGIN_X, 48)
      .lineTo(PAGE_WIDTH - MARGIN_X, 48)
      .stroke();
    doc.restore();
  }

  private drawFooter() {
    const doc = this.doc;
    doc.save();
    doc
      .strokeColor(...BORDER_LIGHT)
      .lineWidth(0.5)
      .moveTo(MARGIN_X, PAGE_HEIGHT - 50)
      .lineTo(PAGE_WIDTH - MARGIN_X, PAGE_HEIGHT - 50)
      .stroke();
    doc.fillColor(...TEXT_MUTED).fontSize(8).font("Helvetica");
    doc.text("© " + new Date().getFullYear() + " " + (this.options.organization ?? "CASFETA — CUD Chapter"), MARGIN_X, PAGE_HEIGHT - 42, {
      align: "left",
      width: CONTENT_WIDTH * 0.5,
    });
    const generatedLabel = this.options.locale === "sw" ? "Imeundwa" : "Generated";
    doc.text(`${generatedLabel}: ${new Date().toLocaleString()}`, MARGIN_X + CONTENT_WIDTH * 0.5, PAGE_HEIGHT - 42, {
      align: "right",
      width: CONTENT_WIDTH * 0.5,
    });
    doc.restore();
  }

  private drawPageNumber(current: number, total: number) {
    const doc = this.doc;
    doc.save();
    doc.fillColor(...TEXT_MUTED).fontSize(8).font("Helvetica");
    const label = this.options.locale === "sw" ? "Ukurasa" : "Page";
    doc.text(`${label} ${current} ya ${total}`, MARGIN_X + CONTENT_WIDTH / 2 - 50, PAGE_HEIGHT - 42, {
      align: "center",
      width: 100,
    });
    doc.restore();
  }

  // ─────────────────────────────── Cover Page ───────────────────────────────

  coverPage(stats?: { label: string; value: string | number }[]) {
    const doc = this.doc;
    // Full-bleed header band
    doc.save();
    doc.fillColor(...HEADER_BG).rect(0, 0, PAGE_WIDTH, 320).fill();

    // Decorative accent
    doc.fillColor(...BRAND_ACCENT).rect(0, 320, PAGE_WIDTH, 4).fill();

    // Organization
    doc.fillColor(255, 255, 255).fontSize(11).font("Helvetica-Bold");
    doc.text((this.options.organization ?? "CASFETA — CUD Chapter").toUpperCase(), MARGIN_X, 70, {
      align: "center",
      width: CONTENT_WIDTH,
    });

    // Shield icon (vector shape)
    doc.save();
    doc.translate(PAGE_WIDTH / 2, 140);
    doc.fillColor(255, 255, 255, 30);
    doc.moveTo(0, -25);
    doc.lineTo(25, -15);
    doc.lineTo(25, 10);
    doc.lineTo(0, 30);
    doc.lineTo(-25, 10);
    doc.lineTo(-25, -15);
    doc.closePath();
    doc.fill();
    doc.restore();

    // Title
    doc.fillColor(255, 255, 255).font("Helvetica-Bold").fontSize(28);
    doc.text(this.options.title, MARGIN_X, 200, {
      align: "center",
      width: CONTENT_WIDTH,
      lineGap: 4,
    });

    if (this.options.subtitle) {
      doc.fillColor(255, 255, 255, 220).font("Helvetica").fontSize(12);
      doc.text(this.options.subtitle, MARGIN_X, 260, {
        align: "center",
        width: CONTENT_WIDTH,
      });
    }

    // Generated on date
    doc.fillColor(255, 255, 255, 180).font("Helvetica").fontSize(10);
    const generatedLabel = this.options.locale === "sw" ? "Imeundwa tarehe" : "Generated on";
    doc.text(`${generatedLabel} ${new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}`, MARGIN_X, 285, {
      align: "center",
      width: CONTENT_WIDTH,
    });

    doc.restore();

    // Stats grid on cover (optional)
    if (stats && stats.length > 0) {
      doc.moveDown(8);
      const cols = Math.min(3, stats.length);
      const colWidth = (CONTENT_WIDTH - (cols - 1) * 12) / cols;
      const cardHeight = 70;
      const startY = 400;
      stats.slice(0, 6).forEach((stat, i) => {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const x = MARGIN_X + col * (colWidth + 12);
        const y = startY + row * (cardHeight + 12);

        // Card background
        doc.save();
        doc.fillColor(...BG_LIGHT).roundedRect(x, y, colWidth, cardHeight, 8).fill();
        doc.strokeColor(...BORDER_LIGHT).lineWidth(0.5).roundedRect(x, y, colWidth, cardHeight, 8).stroke();

        // Label
        doc.fillColor(...TEXT_MUTED).font("Helvetica").fontSize(8);
        doc.text(stat.label.toUpperCase(), x + 12, y + 12, { width: colWidth - 24 });

        // Value
        doc.fillColor(...BRAND_PRIMARY).font("Helvetica-Bold").fontSize(22);
        doc.text(String(stat.value), x + 12, y + 28, { width: colWidth - 24 });

        doc.restore();
      });
    }

    // Footer note on cover
    doc.fillColor(...TEXT_MUTED).font("Helvetica-Oblique").fontSize(9);
    const confidentialityNote = this.options.locale === "sw"
      ? "Nyaraka hii ni ya siri na imeundwa kwa matumizi ya ndani ya CASFETA CUD Chapter tu."
      : "This document is confidential and intended for internal CASFETA CUD Chapter use only.";
    doc.text(confidentialityNote, MARGIN_X, PAGE_HEIGHT - 110, {
      align: "center",
      width: CONTENT_WIDTH,
    });

    // Move to new page after cover
    doc.addPage();
  }

  // ─────────────────────────────── Section Heading ───────────────────────────────

  sectionHeading(title: string, subtitle?: string) {
    const doc = this.doc;
    const currentY = doc.y;
    if (currentY > PAGE_HEIGHT - 200) {
      doc.addPage();
    }
    // Left accent bar
    doc.save();
    doc.fillColor(...BRAND_PRIMARY).roundedRect(MARGIN_X, currentY, 3, 18, 1).fill();
    doc.restore();
    // Title
    doc.fillColor(...TEXT_DARK).font("Helvetica-Bold").fontSize(14);
    doc.text(title, MARGIN_X + 10, currentY, { width: CONTENT_WIDTH - 10 });
    if (subtitle) {
      doc.fillColor(...TEXT_MUTED).font("Helvetica").fontSize(9);
      doc.text(subtitle, MARGIN_X + 10, doc.y + 2, { width: CONTENT_WIDTH - 10 });
    }
    doc.moveDown(0.5);
    doc.y += 4;
  }

  // ─────────────────────────────── Paragraph ───────────────────────────────

  paragraph(text: string) {
    const doc = this.doc;
    doc.fillColor(...TEXT_DARK).font("Helvetica").fontSize(10).lineGap(2);
    doc.text(text, MARGIN_X, doc.y, { width: CONTENT_WIDTH, align: "justify" });
    doc.moveDown(0.5);
  }

  // ─────────────────────────────── KPI Grid ───────────────────────────────

  kpiGrid(kpis: PdfKpiCard[]) {
    const doc = this.doc;
    const cols = Math.min(4, kpis.length);
    const colWidth = (CONTENT_WIDTH - (cols - 1) * 8) / cols;
    const cardHeight = 60;
    const startY = doc.y;
    kpis.slice(0, 8).forEach((kpi, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = MARGIN_X + col * (colWidth + 8);
      const y = startY + row * (cardHeight + 8);

      // Card
      doc.save();
      doc.fillColor(...BG_LIGHT).roundedRect(x, y, colWidth, cardHeight, 6).fill();
      doc.strokeColor(...BORDER_LIGHT).lineWidth(0.5).roundedRect(x, y, colWidth, cardHeight, 6).stroke();

      doc.fillColor(...TEXT_MUTED).font("Helvetica").fontSize(7);
      doc.text(kpi.label.toUpperCase(), x + 8, y + 8, { width: colWidth - 16 });

      doc.fillColor(...BRAND_PRIMARY).font("Helvetica-Bold").fontSize(18);
      doc.text(String(kpi.value), x + 8, y + 22, { width: colWidth - 16 });

      if (kpi.subtext) {
        doc.fillColor(...TEXT_MUTED).font("Helvetica").fontSize(7);
        doc.text(kpi.subtext, x + 8, y + 44, { width: colWidth - 16 });
      }
      doc.restore();
    });
    doc.y = startY + Math.ceil(kpis.length / cols) * (cardHeight + 8) + 8;
  }

  // ─────────────────────────────── Table ───────────────────────────────

  table(columns: PdfTableColumn[], rows: Record<string, unknown>[]) {
    const doc = this.doc;
    if (rows.length === 0) {
      doc.fillColor(...TEXT_MUTED).font("Helvetica-Oblique").fontSize(10);
      doc.text(this.options.locale === "sw" ? "Hakuna data ya kuonyesha." : "No data to display.", MARGIN_X, doc.y, { width: CONTENT_WIDTH });
      doc.moveDown(1);
      return;
    }

    // Calculate column widths
    const totalFlex = columns.reduce((sum, c) => sum + (c.width ?? 1), 0);
    const colWidths = columns.map((c) => (CONTENT_WIDTH / totalFlex) * (c.width ?? 1));

    const rowHeight = 22;
    const headerHeight = 26;

    // Check space, add page if needed
    if (doc.y + headerHeight + rowHeight * Math.min(rows.length, 5) > PAGE_HEIGHT - 100) {
      doc.addPage();
    }

    const tableStartY = doc.y;

    // Header
    doc.save();
    doc.fillColor(...HEADER_BG).roundedRect(MARGIN_X, tableStartY, CONTENT_WIDTH, headerHeight, 4).fill();
    doc.fillColor(255, 255, 255).font("Helvetica-Bold").fontSize(9);
    let x = MARGIN_X;
    columns.forEach((col, i) => {
      const align = col.align ?? "left";
      doc.text(col.header, x + 6, tableStartY + 8, {
        width: colWidths[i] - 12,
        align: align === "right" ? "right" : align === "center" ? "center" : "left",
      });
      x += colWidths[i];
    });
    doc.restore();

    // Body rows
    let y = tableStartY + headerHeight;
    rows.forEach((row, idx) => {
      // Page break
      if (y + rowHeight > PAGE_HEIGHT - 70) {
        doc.addPage();
        y = doc.y;
        // Repeat header
        doc.save();
        doc.fillColor(...HEADER_BG).roundedRect(MARGIN_X, y, CONTENT_WIDTH, headerHeight, 4).fill();
        doc.fillColor(255, 255, 255).font("Helvetica-Bold").fontSize(9);
        x = MARGIN_X;
        columns.forEach((col, i) => {
          const align = col.align ?? "left";
          doc.text(col.header, x + 6, y + 8, {
            width: colWidths[i] - 12,
            align: align === "right" ? "right" : align === "center" ? "center" : "left",
          });
          x += colWidths[i];
        });
        doc.restore();
        y += headerHeight;
      }

      // Zebra striping
      if (idx % 2 === 0) {
        doc.save();
        doc.fillColor(...BG_LIGHT).rect(MARGIN_X, y, CONTENT_WIDTH, rowHeight).fill();
        doc.restore();
      }

      doc.fillColor(...TEXT_DARK).font("Helvetica").fontSize(9);
      x = MARGIN_X;
      columns.forEach((col, i) => {
        const raw = row[col.key];
        const value = col.formatter ? col.formatter(raw, row) : (raw ?? "").toString();
        const align = col.align ?? "left";
        doc.text(value, x + 6, y + 6, {
          width: colWidths[i] - 12,
          align: align === "right" ? "right" : align === "center" ? "center" : "left",
          ellipsis: true,
        });
        x += colWidths[i];
      });

      y += rowHeight;
    });

    // Bottom border
    doc.save();
    doc.strokeColor(...BORDER_LIGHT).lineWidth(0.5).moveTo(MARGIN_X, y).lineTo(MARGIN_X + CONTENT_WIDTH, y).stroke();
    doc.restore();

    doc.y = y + 12;
  }

  // ─────────────────────────────── Chart (embedded PNG) ───────────────────────────────

  chart(imageBuffer: Buffer, caption?: string) {
    const doc = this.doc;
    if (doc.y + 250 > PAGE_HEIGHT - 100) {
      doc.addPage();
    }
    const maxWidth = CONTENT_WIDTH;
    const maxHeight = 240;
    doc.image(imageBuffer, MARGIN_X, doc.y, { fit: [maxWidth, maxHeight], align: "center" });
    doc.y += maxHeight + 4;
    if (caption) {
      doc.fillColor(...TEXT_MUTED).font("Helvetica-Oblique").fontSize(8);
      doc.text(caption, MARGIN_X, doc.y, { width: CONTENT_WIDTH, align: "center" });
      doc.moveDown(0.5);
    }
    doc.y += 8;
  }

  // ─────────────────────────────── Page Break ───────────────────────────────

  pageBreak() {
    this.doc.addPage();
  }

  // ─────────────────────────────── Spacer ───────────────────────────────

  spacer(height = 16) {
    this.doc.y += height;
  }
}
