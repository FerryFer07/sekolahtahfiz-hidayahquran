# Fondasi Mutaba’ah Tahfidz
- [x] Identitas sekolah, desain, login dan persetujuan wali.
- [x] Skema data, akses lima peran dan penyimpanan privat.
- [x] Kelola sekolah, akun/peran, periode, halaqah, santri, relasi wali dan badal.
- [x] Kehadiran, setoran tahfidz/Iqro, riwayat, paraf dan ringkasan pengawas.
- [x] Impor referensi Quran dengan pratinjau dan pengaturan akun.
- [x] Uji akses, alur penyimpanan Iqro, tampilan HP dan metadata.
- [x] Undang ferryferdiansyah2312@gmail.com sebagai admin utama; verifikasi peran admin baru dan pencabutan akses admin ferry@kemika.co.id.
- [ ] Impor referensi mushaf dan verifikasi setoran tahfidz — menunggu CSV/JSON Quran terverifikasi sekolah.

# Rencana bertahap (dokumen PROMPT, 16 Oktober 2026)
Urutan: 0 → 1 → 1A → 1B → 2–9 → 20–22 → 10–14 → 23–26 → 15–19 → 27–31.
- [x] PROMPT 0 — konteks proyek digabung ke AGENTS.md (stack disesuaikan dengan TanStack Start + Lovable).
- [ ] PROMPT 1 — fondasi: sebagian.
  - [x] Multi-peran; peran kepsek, tu, bendahara; akses kepsek (baca-saja) dan TU (data induk santri).
  - [x] Tabel rujukan, hukum_tajwid (kode/nama/kelompok/warna), quran_ayat.teks_tajwid & rujukan_id, profiles.tampilkan_tajwid.
  - [x] Data induk siswa: kolom identitas & status santri, santri_pribadi, kontak wali & kesehatan lewat fungsi sempit, form bertab.
  - [ ] Foto santri (storage privat), mutasi_santri & riwayat mutasi.
  - [ ] Pegawai, pegawai_pribadi, sanad_ustadz, penugasan.
  - [ ] Tahun ajaran, rombel, anggota_rombel; wali kelas membaca kontak & kesehatan rombelnya.
  - [ ] Halaman wali kelas dan ringkasan kepala sekolah; komponen <TeksTajwid>.
- [x] PROMPT 1A — audit RLS (diperluas untuk rujukan, quran_*, hukum_tajwid, kepsek, tu, multi-peran). Butir *_pribadi menyusul bersama data induk.
- [ ] PROMPT 1B — mushaf tajwid: menunggu kredensial Quran Foundation API dan rujukan mushaf yang disahkan asatidzah.
- [x] PROMPT 2 — kalender sekolah & hari efektif.
