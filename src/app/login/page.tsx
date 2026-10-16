import { redirect } from "next/navigation";

// Alamat pendek: /login langsung ke halaman login admin.
export default function LoginAliasPage() {
  redirect("/admin/login");
}
