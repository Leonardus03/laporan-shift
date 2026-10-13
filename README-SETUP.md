# Laporan Shift — Tahap 1 (fondasi)

Isi tahap ini: struktur project, skema database Prisma, seed data awal
(2 shift, form Cuci Pallet, form Upload Foto Repacking, 1 akun admin).

## Cara jalanin

1. Ekstrak zip, masuk ke foldernya, lalu install:

       npm install

2. Salin `.env.example` jadi `.env`, isi `DATABASE_URL` dan `DIRECT_URL`
   dengan koneksi PostgreSQL (Neon / Supabase), isi juga email dan password admin awal.
   Kalau provider cuma kasih satu URL, isi keduanya sama.

3. Buat tabel dan isi data awal:

       npx prisma migrate dev --name init
       npx prisma db seed

4. Jalankan:

       npm run dev

## Catatan
- Folder yang berisi `.gitkeep` masih kosong, diisi di tahap berikutnya.
- Di Next.js 16, file `middleware.ts` bernama `proxy.ts`. Nanti kita pakai nama yang sesuai.
- Jangan commit file `.env`.
