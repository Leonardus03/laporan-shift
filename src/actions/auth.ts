"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, deleteSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/ip";
import { getCurrentAdmin } from "@/lib/dal";

export type LoginState = { error?: string } | undefined;

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_WINDOW_MINUTES = 15;

// Hash palsu supaya waktu proses sama, baik email ada maupun tidak.
const DUMMY_HASH = bcrypt.hashSync("password-palsu", 10);

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const remember = formData.get("remember") === "on";

  if (!email || !password) {
    return { error: "Email dan password wajib diisi." };
  }

  const ip = await getClientIp();
  if (ip) {
    const since = new Date(Date.now() - LOCK_WINDOW_MINUTES * 60 * 1000);
    const failed = await prisma.auditLog.count({
      where: {
        action: "LOGIN_FAILED",
        ipAddress: ip,
        createdAt: { gte: since },
      },
    });
    if (failed >= MAX_FAILED_ATTEMPTS) {
      return {
        error: `Terlalu banyak percobaan gagal. Coba lagi dalam ${LOCK_WINDOW_MINUTES} menit.`,
      };
    }
  }

  const admin = await prisma.admin.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  const passwordOk = await bcrypt.compare(
    password,
    admin?.passwordHash ?? DUMMY_HASH,
  );

  if (!admin || !admin.isActive || !passwordOk) {
    await logAudit({
      actorType: "SYSTEM",
      actorName: email,
      action: "LOGIN_FAILED",
      entity: "Admin",
      entityId: admin?.id,
    });
    return { error: "Email atau password salah." };
  }

  await createSession({ adminId: admin.id, name: admin.name }, remember);
  await logAudit({
    actorType: "ADMIN",
    actorId: admin.id,
    actorName: admin.name,
    action: "LOGIN_SUCCESS",
    entity: "Admin",
    entityId: admin.id,
  });

  redirect("/admin/dashboard");
}

export async function logout() {
  const admin = await getCurrentAdmin();
  await deleteSession();
  if (admin) {
    await logAudit({
      actorType: "ADMIN",
      actorId: admin.id,
      actorName: admin.name,
      action: "LOGOUT",
      entity: "Admin",
      entityId: admin.id,
    });
  }
  redirect("/admin/login");
}
