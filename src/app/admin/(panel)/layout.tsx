import { requireAdmin } from "@/lib/dal";
import { AdminShell } from "@/components/admin/admin-shell";

// Panel admin selalu baca sesi login saat request, jadi tidak di-prerender.
export const instant = false;

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  return <AdminShell adminName={admin.name}>{children}</AdminShell>;
}
