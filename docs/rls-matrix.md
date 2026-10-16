# Matriks RLS — Mutaba'ah Tahfidz STHQ

Status per migrasi `0003_rls_hardening` (Oktober 2026). Sumber kebenaran: `drizzle/migrations/` (salinan identik di `supabase/migrations/`).
Bukti otomatis: `supabase/tests/rls_test.sql`, dijalankan oleh `npm test` (`src/test/rls-sql.test.ts`, PGlite + tiruan auth Supabase).

## Ringkasan

- Semua 13 tabel di `public` memakai RLS. Semua policy ditujukan ke `authenticated`; tidak ada policy untuk `anon`.
- **anon**: tidak punya hak tabel, sequence, atau fungsi apa pun di `public`. Hak bawaan Supabase dicabut di 0003, termasuk default privileges untuk objek baru.
- Peran dibaca dari `user_roles` lewat `has_role()`, yang hanya menjawab untuk `auth.uid()` sendiri. Satu akun memegang satu peran (`set_user_role` mengganti, tidak menambah).
- **Wali** baru bisa membaca data anak setelah `profiles.persetujuan_data_pada` terisi (`consent_ready`), dan hanya untuk anak di `wali_santri`.
- **Badal** hanya berwenang pada halaqah di `penugasan_badal` selama `mulai ≤ hari ini (Asia/Jakarta) ≤ selesai`. Sehari setelah `selesai`, aksesnya hilang.
- **Pengawas** hanya membaca halaqah dengan `halaqah.pengawas_id = dirinya`, beserta santri dan catatannya; tidak bisa menulis.

## Keterangan sel

| Simbol | Arti                                     |
| ------ | ---------------------------------------- |
| ✅     | semua baris                              |
| 🔸     | sebagian baris (syarat di kolom catatan) |
| —      | ditolak                                  |

"Halaqah sendiri": ustadz = `halaqah.ustadz_id`; badal = penugasan aktif; pengawas = `halaqah.pengawas_id`.

## Matriks per tabel

S = select, I = insert, U = update, D = delete.

| Tabel                                       | Admin      | Ustadz     | Badal      | Pengawas | Wali     | Anon | Catatan                                                                                                                                               |
| ------------------------------------------- | ---------- | ---------- | ---------- | -------- | -------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `profiles`                                  | S U ✅     | S U 🔸     | S U 🔸     | S U 🔸   | S U 🔸   | —    | Selain admin: hanya profil sendiri. Insert lewat trigger `create_profile` saat user dibuat. Tidak ada delete (ikut cascade `auth.users`).             |
| `user_roles`                                | S I U D ✅ | S 🔸       | S 🔸       | S 🔸     | S 🔸     | —    | Selain admin: hanya peran sendiri. Admin mengatur lewat `set_user_role` (tidak bisa menurunkan diri sendiri).                                         |
| `pengaturan_sekolah`                        | S I U D ✅ | S ✅       | S ✅       | S ✅     | S ✅     | —    | Policy `USING(true)` sengaja: identitas sekolah, bukan data pribadi.                                                                                  |
| `periode`                                   | S I U D ✅ | S ✅       | S ✅       | S ✅     | S ✅     | —    | `USING(true)` sengaja: kalender akademik.                                                                                                             |
| `quran_surah`                               | S I U D ✅ | S ✅       | S ✅       | S ✅     | S ✅     | —    | `USING(true)` sengaja: referensi mushaf. Hanya admin yang mengimpor.                                                                                  |
| `quran_ayat`                                | S I U D ✅ | S ✅       | S ✅       | S ✅     | S ✅     | —    | Sama seperti `quran_surah`.                                                                                                                           |
| `halaqah`                                   | S I U D ✅ | S 🔸       | S 🔸       | S 🔸     | S 🔸     | —    | Ustadz/badal/pengawas: halaqah sendiri. Wali: halaqah tempat anaknya (setelah persetujuan).                                                           |
| `penugasan_badal`                           | S I U D ✅ | S 🔸       | S 🔸       | S 🔸     | S 🔸     | —    | Selain admin: hanya baris dengan `ustadz_id` = dirinya (praktisnya hanya badal).                                                                      |
| `santri`                                    | S I U D ✅ | S U 🔸     | S U 🔸     | S 🔸     | S 🔸     | —    | Ustadz/badal: santri halaqah sendiri; **update hanya `posisi_hafalan_ayat_id` dan `catatan`** (trigger `guard_santri_update`). Wali: anaknya sendiri. |
| `wali_santri`                               | S I U D ✅ | —          | —          | —        | S 🔸     | —    | Wali: relasi miliknya sendiri.                                                                                                                        |
| `setoran`                                   | S I U D ✅ | S I U 🔸   | S I U 🔸   | S 🔸     | S I U 🔸 | —    | Lihat aturan setoran di bawah.                                                                                                                        |
| `setoran_iqro`                              | S I U D ✅ | S I U 🔸   | S I U 🔸   | S 🔸     | S I U 🔸 | —    | Aturannya sama dengan `setoran`.                                                                                                                      |
| `kehadiran`                                 | S I U D ✅ | S I U D 🔸 | S I U D 🔸 | S 🔸     | S 🔸     | —    | Tulis: santri halaqah sendiri, `dicatat_oleh` wajib = dirinya. Wali: hanya membaca kehadiran anaknya.                                                 |
| `storage.objects` (bucket `school-private`) | S I U D ✅ | —          | —          | —        | —        | —    | Bucket privat, khusus admin.                                                                                                                          |

### Aturan `setoran` / `setoran_iqro`

| Aksi   | Ustadz / badal (halaqah sendiri)                                                                                          | Wali (anak sendiri, setelah persetujuan)                                                                                               |
| ------ | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Baca   | semua catatan santri di halaqahnya                                                                                        | semua catatan anaknya (sekolah dan rumah)                                                                                              |
| Insert | hanya `tempat='sekolah'`, `diisi_oleh` = dirinya, belum diparaf                                                           | hanya `tempat='rumah'`, `diisi_oleh` = dirinya, belum diparaf. Nilai opsional, sesuai form "Nilai (opsional)".                         |
| Update | hanya catatan `tempat='sekolah'`. Trigger `validate_entry` mengunci `santri_id`, `diisi_oleh`, `tempat`, dan kolom paraf. | hanya paraf pada catatan `tempat='sekolah'`: `diparaf_oleh` = dirinya, **sekali saja**. Kolom lain, termasuk `nilai`, ditolak trigger. |
| Delete | —                                                                                                                         | —                                                                                                                                      |

Pengawas hanya membaca. Admin bebas, kecuali validasi jalur (`tahfidz`/`iqro`) dan perhitungan `jumlah_baris` di trigger.

## Fungsi SECURITY DEFINER

Semua fungsi di bawah memakai `set search_path=public`, mereferensikan tabel dengan nama schema lengkap, dan tidak bisa dijalankan `anon`.

| Fungsi                                                                                                                                      | Cek peran                                   | Catatan                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------ |
| `has_role(uuid, app_role)`                                                                                                                  | hanya menjawab bila `_user_id = auth.uid()` | Pengguna tidak bisa menanyakan peran orang lain.                   |
| `consent_ready()`, `owns_child(uuid)`, `teaches_halaqah(uuid)`, `can_read_halaqah(uuid)`, `can_read_santri(uuid)`, `can_teach_santri(uuid)` | berbasis `auth.uid()`                       | Predikat untuk policy; hanya mengungkap izin si pemanggil sendiri. |
| `set_user_role(uuid, app_role)`                                                                                                             | wajib admin                                 | Admin tidak bisa menurunkan peran dirinya sendiri.                 |
| `create_profile()`                                                                                                                          | trigger                                     | Hak eksekusi dicabut dari semua role API.                          |

Fungsi `validate_entry()`, `guard_santri_update()`, dan `verse_range_summary()` berjalan sebagai SECURITY INVOKER, sehingga tunduk pada RLS pemanggil.

## Temuan audit dan tindak lanjut

| #   | Temuan                                                                                                                                                                         | Risiko                                                                              | Status                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 1   | Grant bawaan Supabase ke `anon` (SELECT/INSERT/UPDATE/DELETE pada semua tabel `public`, EXECUTE fungsi) masih ada. Saat itu hanya ditahan oleh RLS.                            | Sedang: satu policy yang salah tulis di masa depan bisa langsung terbuka ke publik. | Diperbaiki di 0003: revoke semua hak `anon` beserta default privileges.                                |
| 2   | Policy `santri_teacher_update` membolehkan ustadz/badal mengubah semua kolom santri: nama, NIS, kelas, jalur, status aktif, dan memindahkan santri antar halaqah yang ia ajar. | Sedang: data induk seharusnya hanya diubah admin.                                   | Diperbaiki di 0003: trigger `guard_santri_update` membatasi ke `posisi_hafalan_ayat_id` dan `catatan`. |
| 3   | Wali bisa menimpa paraf yang sudah ada, misalnya wali kedua menimpa paraf wali pertama atau mengubah waktu paraf.                                                              | Rendah.                                                                             | Diperbaiki di 0003: `validate_entry` menolak paraf ulang.                                              |
| 4   | `USING(true)` pada `pengaturan_sekolah`, `periode`, `quran_surah`, `quran_ayat`.                                                                                               | Tidak ada: data referensi non-pribadi, baca saja, khusus `authenticated`.           | Dibiarkan (sengaja). Uji memastikan pola ini tidak muncul di tabel lain.                               |
| 5   | Wali membaca setoran/kehadiran/santri anak lain.                                                                                                                               | —                                                                                   | Tidak ditemukan.                                                                                       |
| 6   | Wali insert `tempat='sekolah'` atau mengubah nilai.                                                                                                                            | —                                                                                   | Tidak ditemukan; kini dibuktikan oleh uji.                                                             |
| 7   | Akses badal tidak berakhir.                                                                                                                                                    | —                                                                                   | Tidak ditemukan: `teaches_halaqah` memeriksa tanggal Jakarta setiap query.                             |
| 8   | SECURITY DEFINER tanpa `search_path` atau tanpa cek peran.                                                                                                                     | —                                                                                   | Tidak ditemukan.                                                                                       |

## Menjalankan uji

```sh
npm test                                                           # lokal, tanpa Docker/DB
psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_test.sql   # terhadap database Supabase nyata (transaksi di-rollback)
```

Uji yang dijalankan `npm test` memutar semua migrasi di PGlite dan mencetak `LULUS: …` untuk setiap skenario. Skenario yang gagal berhenti dengan `GAGAL: …`. Tanpa migrasi 0003, uji ini gagal tepat pada temuan 1–3.
