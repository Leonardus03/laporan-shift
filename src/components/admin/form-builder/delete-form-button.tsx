"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteForm } from "@/actions/form-builder";
import { InlineMessage } from "@/components/ui/inline-message";
import { Spinner } from "@/components/ui/spinner";
import { useActionRunner } from "./use-action-runner";

export function DeleteFormButton({ id, name, reportCount }: { id: string; name: string; reportCount: number }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const { pending, message, run } = useActionRunner();
  const busy = pending || leaving;

  return (
    <section className="space-y-3 rounded-2xl border border-red-200 bg-red-50/40 p-5">
      <h2 className="text-lg font-bold text-red-700">Hapus Jenis Laporan</h2>
      {reportCount > 0 ? (
        <p className="text-sm text-slate-600">
          &quot;{name}&quot; sudah punya <strong>{reportCount} laporan</strong>, jadi nggak bisa dihapus. Matikan
          saklar <strong>Aktif</strong> di atas kalau mau menyembunyikannya dari pelapor.
        </p>
      ) : (
        <>
          <p className="text-sm text-slate-600">
            Belum ada laporan untuk jenis ini, jadi aman dihapus. Semua kolomnya ikut terhapus dan nggak bisa
            dikembalikan.
          </p>
          {confirm ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  run(
                    "delete",
                    () => deleteForm({ id }),
                    () => {
                      setLeaving(true);
                      router.push("/admin/form-builder");
                      return "Dihapus. Kembali ke daftar...";
                    }
                  )
                }
                className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {busy && <Spinner />}
                {busy ? "Menghapus..." : `Ya, hapus "${name}"`}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirm(false)}
                className="px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-700"
              >
                Batal
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirm(true)}
              className="rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              Hapus jenis laporan ini
            </button>
          )}
        </>
      )}
      {message && <InlineMessage ok={message.ok}>{message.text}</InlineMessage>}
    </section>
  );
}
