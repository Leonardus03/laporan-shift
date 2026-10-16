"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ReportStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/dal";
import { logAudit } from "@/lib/audit";

const VALID_STATUS: ReportStatus[] = ["SUBMITTED", "REVIEWED", "REJECTED"];

export async function updateReportStatus(formData: FormData): Promise<void> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const id = String(formData.get("reportId") ?? "");
  const status = String(formData.get("status") ?? "") as ReportStatus;
  if (!id || !VALID_STATUS.includes(status)) return;

  const report = await prisma.report.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!report || report.status === status) return;

  await prisma.report.update({ where: { id }, data: { status } });

  await logAudit({
    actorType: "ADMIN",
    actorId: admin.id,
    actorName: admin.name,
    action: "REPORT_STATUS_CHANGED",
    entity: "Report",
    entityId: id,
    changes: { dari: report.status, ke: status },
  });

  revalidatePath(`/admin/laporan/${id}`);
  revalidatePath("/admin/laporan");
  revalidatePath("/admin/dashboard");
}
