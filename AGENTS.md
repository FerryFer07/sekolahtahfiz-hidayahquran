<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

## Application architecture

- Keep the TanStack Start file router and authenticated pathless layout; the foundation must remain compatible with the hosted Worker runtime.
- Store roles in user_roles and enforce all school access through database RLS and caller-scoped SQL helpers, never UI role checks alone.
- All schema changes go through tracked migrations with explicit grants and RLS; keep generated database types synchronized.
- The hosted migration journal in drizzle/migrations is canonical; keep byte-identical SQL copies in supabase/migrations for the requested external-development handoff, never replay both sets.
- Keep Quran reference data read-only except validated admin imports and compute verse-range line totals in database triggers.
- Use shared school UI and data modules for protected pages; keep privileged account creation in authenticated server functions with an admin check.

# Mutaba'ah Tahfidz — konteks untuk agen AI

Aplikasi web pengganti buku mutaba'ah kertas dan form laporan pekanan halaqah di sekolah tahfidz
bermanhaj salaf (Sekolah Tahfidz Hidayah Qur'an, Jakarta), sekaligus sistem administrasi internal
sekolah (SD kelas 1–6). Bahasa antarmuka: Indonesia. Desain mobile-first. Zona waktu: Asia/Jakarta.
Rencana fitur bertahap ada di `roadmap.md`.

## Stack yang berlaku (menggantikan asumsi React Router / Edge Function di dokumen rencana)

- TanStack Start + React + TypeScript + Tailwind + shadcn/ui, dibangun dan di-hosting di Lovable.
  Halaman di `src/routes/` (file router; halaman terlindungi di `src/routes/_authenticated/`),
  logika dan UI bersama di `src/features/school/`.
- Database dan login: Supabase milik Lovable Cloud. Tipe: `src/integrations/supabase/types.ts`.
- Proses yang butuh hak penuh (buat akun, impor massal, kirim WhatsApp, hapus file) = server function
  TanStack (`createServerFn` + `requireSupabaseAuth`) yang memeriksa peran pemanggil lewat `has_role`
  sebelum memakai `supabaseAdmin`. Service role key tidak pernah ada di kode client.
- Pekerjaan terjadwal: pg_cron di database (jadwal dalam UTC; 05.00 WIB = 22.00 UTC hari sebelumnya).
- Uji: `npm test` menjalankan `supabase/tests/rls_test.sql` di PGlite terhadap seluruh jurnal migrasi.
  Matriks akses: `docs/rls-matrix.md`. Perbarui keduanya setiap ada tabel atau policy baru.

## Istilah (wajib dipakai persis)

- Sabaq = menghafal ayat baru
- Sabaqi = mengulang hafalan baru (di kode: `sabaqi`)
- Manzil = mengulang hafalan lama
- ATM = Acuan Target Muraja'ah (target manzil/sabqi per hari)
- CSS = Capaian Sabaq per Semester
- Ket = status capaian pekanan: A (Terlampaui, ★), B (Tercapai, ✓), C (Tidak tercapai, ✗)
- Jalur santri: `iqro` (pra-tahfidz) atau `tahfidz`
- Badal = Ustadz pengganti sementara

Mushaf acuan: Mushaf Madinah terbitan Mujamma' Malik Fahd, riwayat Hafsh 'an 'Ashim, 15 baris,
604 halaman. Satuan bisa baris atau halaman.

## Rujukan agama (manhaj salaf)

- Semua konten agama (teks & terjemah Al-Qur'an, tafsir, hadits, penjelasan hukum tajwid) HANYA boleh
  berasal dari tabel `rujukan` berstatus `disetujui` (disahkan asatidzah sekolah). Setiap baris konten
  menyimpan `rujukan_id`; trigger `wajib_rujukan_disetujui` menolak rujukan yang belum disetujui.
- DILARANG scraping situs mana pun. Data diambil dari sumber yang lisensinya mengizinkan atau dengan izin
  tertulis, lalu diimpor admin.
- Agen AI DILARANG mengarang atau "melengkapi sendiri" teks ayat, hadits, terjemah, tafsir, atau
  penjelasan hukum syar'i, termasuk untuk data uji (pakai teks penanda seperti `'RLS teks uji'`).
  Bila data belum ada, tampilkan keadaan kosong ("Data belum diimpor").

## Tajwid

- `quran_ayat.teks_tajwid` menyimpan teks Utsmani bermarkup tajwid (kelas hukum per potongan huruf).
  Markup HARUS disanitasi dengan whitelist tag & kelas sebelum dirender; jangan pakai
  `dangerouslySetInnerHTML` tanpa sanitasi.
- `hukum_tajwid` memetakan kode kelas → nama, kelompok, warna, penjelasan, bait matan, contoh.
  Penjelasan, bait matan, dan contoh diisi asatidzah; tidak boleh diisi agen AI.

## Peran

admin, kepsek, tu, bendahara, ustadz, badal, pengawas, wali. Satu user boleh punya beberapa peran
(tabel `user_roles`, dicek dengan `has_role()`; admin mengatur lewat `atur_peran_user()`).
Di UI, `useSchool().has(...)` untuk menu dan `isMyChild()` / `canTeach()` per santri; peran utama
(`role`) hanya untuk tampilan. Wali kelas, pengampu, penguji, piket, pustakawan adalah PENUGASAN, bukan
peran. Wali HANYA boleh melihat/mengisi data anaknya sendiri dan tidak pernah melihat peringkat atau
data santri lain.

## Data pribadi (UU Pelindungan Data Pribadi)

- Data sensitif (NIK, nomor KK, kesehatan, pekerjaan & pendidikan orang tua, data pribadi pegawai)
  disimpan di tabel terpisah berakhiran `_pribadi`, hanya bisa dibaca admin, tu, dan kepsek.
  Pengecualian: catatan kesehatan siswa juga untuk wali kelasnya dan walinya; pegawai membaca data
  pribadinya sendiri.
- Ustadz hanya melihat nama, kelas, foto, kontak wali, dan data tahfidz.
- Data keuangan hanya untuk admin, bendahara, kepsek, dan wali (tagihan anaknya sendiri).
- Siswa/pegawai yang keluar tidak dihapus; statusnya diubah.
- Satu-satunya halaman tanpa login adalah formulir & cek status PSB, keduanya lewat server function;
  tabel tetap tertutup untuk anon.

## Aturan kerja

- Setiap perubahan skema = migrasi baru di `drizzle/migrations/` (plus jurnal & snapshot) dengan salinan
  identik di `supabase/migrations/`, lengkap dengan grant dan RLS. Tidak ada tabel tanpa RLS. Tidak ada
  akses anon. Nilai enum baru ditambahkan di migrasi tersendiri sebelum dipakai.
- Fungsi SQL yang melewati RLS harus SECURITY DEFINER dengan `search_path` diset dan memeriksa peran
  pemanggil.
- Data Al-Qur'an, terjemah, tafsir, hadits, dan hukum tajwid baca-saja bagi semua user; hanya diubah
  lewat impor/pengelolaan admin.
- Jangan menghapus atau mengganti fitur yang sudah ada kecuali diminta.
- Hitungan target/capaian dilakukan di database (fungsi/view SQL) sebagai satu sumber kebenaran.
- Jalankan `npm test`, typecheck (`npx tsc --noEmit`), dan build sebelum menyatakan selesai.
