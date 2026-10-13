import "server-only";
import { headers } from "next/headers";

export async function getClientIp(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip");
}

export async function getUserAgent(): Promise<string | null> {
  const h = await headers();
  return h.get("user-agent");
}
