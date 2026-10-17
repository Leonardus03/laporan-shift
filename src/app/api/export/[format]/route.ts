import { getCurrentAdmin } from "@/lib/dal";
import { logAudit } from "@/lib/audit";
import {
  EXPORT_FORMATS,
  ExportTooLargeError,
  getExportData,
  parseExportFilters,
  type ExportFormat,
} from "@/lib/export";
import { buildCsv, buildPdf, buildXlsx } from "@/lib/export-files";

const CONTENT_TYPE: Record<ExportFormat, string> = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv; charset=utf-8",
  pdf: "application/pdf",
};

function json(error: string, status: number) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ format: string }> }
) {
  const admin = await getCurrentAdmin();
  if (!admin) return json("Sesi login berakhir. Silakan login ulang.", 401);

  const { format } = await params;
  if (!EXPORT_FORMATS.includes(format as ExportFormat)) {
    return json("Format tidak dikenal. Pakai xlsx, pdf, atau csv.", 404);
  }
  const fmt = format as ExportFormat;

  const filters = parseExportFilters(new URL(request.url).searchParams);

  let data;
  try {
    data = await getExportData(filters);
  } catch (error) {
    if (error instanceof ExportTooLargeError) return json(error.message, 413);
    console.error("Gagal mengambil data export:", error);
    return json("Gagal mengambil data. Coba lagi beberapa saat.", 500);
  }

  let body: BlobPart;
  try {
    if (fmt === "xlsx") body = new Uint8Array(await buildXlsx(data));
    else if (fmt === "pdf") body = new Uint8Array(await buildPdf(data));
    else body = buildCsv(data);
  } catch (error) {
    console.error("Gagal membuat file export:", error);
    return json("Gagal membuat file. Coba lagi beberapa saat.", 500);
  }

  await logAudit({
    actorType: "ADMIN",
    actorId: admin.id,
    actorName: admin.name,
    action: "REPORT_EXPORTED",
    entity: "Report",
    changes: {
      format: fmt,
      jumlahLaporan: data.total,
      periode: data.periodLabel,
      filter: data.filterLines,
    },
  });

  const stamp =
    filters.from && filters.to
      ? `${filters.from}_sd_${filters.to}`
      : new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return new Response(new Blob([body], { type: CONTENT_TYPE[fmt] }), {
    headers: {
      "Content-Type": CONTENT_TYPE[fmt],
      "Content-Disposition": `attachment; filename="laporan-shift_${stamp}.${fmt}"`,
      "Cache-Control": "no-store",
    },
  });
}
