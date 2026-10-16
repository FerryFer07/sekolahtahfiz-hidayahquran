# Sumber data Al-Qur'an

- Sumber: Quran.com API v4 (Quran Foundation), https://api.quran.com/api/v4
  - `/chapters?language=id` — nama surah dan jumlah ayat
  - `/quran/verses/uthmani` — teks Utsmani per ayat
  - `/quran/verses/uthmani_tajweed` — teks Utsmani bermarkup tajwid (`<tajweed class=…>`)
  - `/verses/by_page/{1..604}` — halaman, juz, dan nomor baris setiap kata (mushaf Madinah 15 baris)
- Tanggal ambil: 2026-10-16
- Dibuat oleh: `bun scripts/siapkan-data-quran.ts`
- Validasi lulus: 114 surah, 6236 ayat, 604 halaman, 30 juz, semua baris 1–15, tidak ada ayat
  melintasi halaman. Ayat tanpa markup tajwid: 0.
- baris_awal/baris_akhir = baris kata pertama/terakhir ayat (termasuk penanda nomor ayat) di halaman itu.

## Status

**DEMO.** Data ini belum diverifikasi terhadap mushaf fisik sekolah dan rujukannya belum disahkan
asatidzah. Sebelum dipakai resmi: periksa ketentuan penggunaan API/teks, sahkan rujukan di menu
Admin → Rujukan, dan cocokkan halaman sampel (mis. 1, 2, 300, 604) dengan mushaf fisik.
