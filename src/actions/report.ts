"use server";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/ip";
import { logAudit } from "@/lib/audit";
import {
  DEFAULT_MAX_FILES,
  UPLOAD_PREFIX,
  type SubmitPayload,
  type SubmitResult,
  type UploadedFile,
} from "@/lib/report-config";

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const RATE_LIMIT = 20;
const RATE_WINDOW_MINUTES = 10;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function addDays(key: string, n: number) {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function isValidDateKey(s: string) {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function normalizeName(raw: string) {
  return raw
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function isUploadedFile(x: unknown): x is UploadedFile {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (typeof o.url !== "string" || typeof o.pathname !== "string") return false;
  try {
    const u = new URL(o.url);
    if (u.protocol !== "https:" || !u.hostname.endsWith(".blob.vercel-storage.com")) {
      return false;
    }
  } catch {
    return false;
  }
  return o.pathname.startsWith(UPLOAD_PREFIX) && o.pathname.length < 300;
}

export async function submitReport(payload: SubmitPayload): Promise<SubmitResult> {
  if (
    !payload ||
    typeof payload.slug !== "string" ||
    typeof payload.reporterName !== "string" ||
    typeof payload.reportDate !== "string" ||
    typeof payload.shiftId !== "string" ||
    typeof payload.values !== "object" ||
    payload.values === null
  ) {
    return { ok: false, error: "Data laporan tidak valid." };
  }

  const name = normalizeName(payload.reporterName);
  if (name.length < 2 || name.length > 60) {
    return { ok: false, error: "Nama harus 2 sampai 60 karakter." };
  }

  const todayKey = new Date(Date.now() + WIB_OFFSET_MS).toISOString().slice(0, 10);
  if (!isValidDateKey(payload.reportDate)) {
    return { ok: false, error: "Tanggal tidak valid." };
  }
  if (payload.reportDate > addDays(todayKey, 1)) {
    return { ok: false, error: "Tanggal tidak boleh lebih dari besok." };
  }
  if (payload.reportDate < addDays(todayKey, -31)) {
    return { ok: false, error: "Tanggal laporan terlalu lama (maksimal 31 hari ke belakang)." };
  }

  const ip = await getClientIp();
  if (ip) {
    const since = new Date(Date.now() - RATE_WINDOW_MINUTES * 60 * 1000);
    const recent = await prisma.auditLog.count({
      where: { action: "REPORT_SUBMITTED", ipAddress: ip, createdAt: { gte: since } },
    });
    if (recent >= RATE_LIMIT) {
      return { ok: false, error: "Terlalu banyak laporan dikirim dalam waktu singkat. Coba lagi sebentar." };
    }
  }

  const form = await prisma.reportForm.findFirst({
    where: { slug: payload.slug, isActive: true },
    include: { fields: { where: { isActive: true }, orderBy: { order: "asc" } } },
  });
  if (!form) return { ok: false, error: "Jenis laporan tidak ditemukan." };

  const shift = await prisma.shift.findUnique({ where: { id: payload.shiftId } });
  if (!shift) return { ok: false, error: "Shift tidak valid." };

  const answers: Prisma.ReportAnswerCreateWithoutReportInput[] = [];
  const files: Prisma.ReportFileCreateWithoutReportInput[] = [];

  for (const f of form.fields) {
    const raw = payload.values[f.key];
    const options = Array.isArray(f.options)
      ? f.options.filter((o): o is string => typeof o === "string")
      : [];
    const fail = (msg: string): SubmitResult => ({ ok: false, error: `${f.label}: ${msg}` });
    const field = { connect: { id: f.id } };

    if (f.type === "TEXT") {
      const s = typeof raw === "string" ? raw.trim() : "";
      if (!s) {
        if (f.required) return fail("wajib diisi.");
        continue;
      }
      if (s.length > 1000) return fail("terlalu panjang (maksimal 1000 karakter).");
      answers.push({ field, valueText: s });
    } else if (f.type === "NUMBER") {
      const s = typeof raw === "string" ? raw.trim().replace(",", ".") : "";
      if (!s) {
        if (f.required) return fail("wajib diisi.");
        continue;
      }
      const n = Number(s);
      if (!Number.isFinite(n) || Math.abs(n) > 1e9) return fail("harus berupa angka.");
      answers.push({ field, valueNumber: n });
    } else if (f.type === "DATE") {
      const s = typeof raw === "string" ? raw.trim() : "";
      if (!s) {
        if (f.required) return fail("wajib diisi.");
        continue;
      }
      if (!isValidDateKey(s)) return fail("tanggal tidak valid.");
      answers.push({ field, valueDate: new Date(`${s}T00:00:00Z`) });
    } else if (f.type === "DROPDOWN") {
      const s = typeof raw === "string" ? raw.trim() : "";
      if (!s) {
        if (f.required) return fail("wajib dipilih.");
        continue;
      }
      if (options.length > 0 && !options.includes(s)) return fail("pilihan tidak valid.");
      if (s.length > 200) return fail("terlalu panjang.");
      answers.push({ field, valueText: s });
    } else if (f.type === "CHECKBOX") {
      if (options.length > 0) {
        const arr = Array.isArray(raw)
          ? [...new Set(raw.filter((x): x is string => typeof x === "string"))]
          : [];
        if (arr.some((x) => !options.includes(x))) return fail("pilihan tidak valid.");
        if (arr.length === 0) {
          if (f.required) return fail("pilih minimal satu.");
          continue;
        }
        answers.push({ field, valueJson: arr });
      } else {
        if (raw !== true) {
          if (f.required) return fail("wajib dicentang.");
          continue;
        }
        answers.push({ field, valueJson: true });
      }
    } else if (f.type === "PHOTO") {
      const arr = Array.isArray(raw) ? raw : [];
      if (!arr.every(isUploadedFile)) return fail("file foto tidak valid.");
      const unique = [...new Map((arr as UploadedFile[]).map((x) => [x.url, x])).values()];
      const max = f.maxFiles ?? DEFAULT_MAX_FILES;
      if (unique.length > max) return fail(`maksimal ${max} foto.`);
      if (unique.length === 0) {
        if (f.required) return fail("wajib upload minimal 1 foto.");
        continue;
      }
      for (const file of unique) {
        files.push({
          field,
          url: file.url,
          pathname: file.pathname,
          mimeType: typeof file.mimeType === "string" ? file.mimeType.slice(0, 100) : null,
          sizeBytes:
            typeof file.sizeBytes === "number" && Number.isFinite(file.sizeBytes)
              ? Math.round(file.sizeBytes)
              : null,
        });
      }
    }
  }

  let reportId: string;
  try {
    const report = await prisma.report.create({
      data: {
        formId: form.id,
        reporterName: name,
        reportDate: new Date(`${payload.reportDate}T00:00:00Z`),
        shiftId: shift.id,
        ipAddress: ip,
        answers: { create: answers },
        files: { create: files },
      },
      select: { id: true },
    });
    reportId = report.id;
  } catch (error) {
    console.error("Gagal menyimpan laporan:", error);
    return { ok: false, error: "Laporan gagal disimpan. Coba lagi beberapa saat." };
  }

  await logAudit({
    actorType: "REPORTER",
    actorName: name,
    action: "REPORT_SUBMITTED",
    entity: "Report",
    entityId: reportId,
    changes: { form: form.slug, shift: shift.name, jumlahFoto: files.length },
  });

  return { ok: true, shortId: `#${reportId.slice(-6).toUpperCase()}` };
}
