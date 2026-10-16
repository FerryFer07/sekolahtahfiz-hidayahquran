/**
 * Menyiapkan data referensi Al-Qur'an (sekali jalan, bukan dipanggil live oleh aplikasi).
 *
 * Sumber: Quran.com API v4 (Quran Foundation), endpoint publik https://api.quran.com/api/v4.
 * Mushaf: Madinah 15 baris, 604 halaman (layout bawaan endpoint by_page).
 * Teks diambil apa adanya; skrip ini hanya memetakan kolom dan menghitung baris awal/akhir ayat.
 *
 * Jalankan: bun scripts/siapkan-data-quran.ts
 * Hasil:    data/quran/surah.json, data/quran/ayat.json, data/quran/SUMBER.md
 *           (format yang diterima menu Admin → Impor Al-Qur'an)
 */
import { mkdirSync, writeFileSync } from "node:fs";

const API = "https://api.quran.com/api/v4";
const OUT = "data/quran";
const PAGES = 604;
const LINES = 15;

type Word = { char_type_name: string; line_number: number; page_number: number };
type PageVerse = { verse_key: string; juz_number: number; words: Word[] };

async function get<T>(path: string): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(API + path, { headers: { accept: "application/json" } });
    if (res.ok) return (await res.json()) as T;
    if (attempt >= 4) throw new Error(`${res.status} ${path}`);
    await new Promise((r) => setTimeout(r, 1000 * attempt));
  }
}

function fail(msg: string): never {
  throw new Error(`Validasi gagal: ${msg}`);
}

const { chapters } = await get<{
  chapters: { id: number; name_simple: string; name_arabic: string; verses_count: number }[];
}>("/chapters?language=id");
if (chapters.length !== 114) fail(`jumlah surah ${chapters.length}, seharusnya 114`);

const { verses: plain } = await get<{ verses: { verse_key: string; text_uthmani: string }[] }>(
  "/quran/verses/uthmani",
);
const { verses: tajweed } = await get<{
  verses: { verse_key: string; text_uthmani_tajweed: string }[];
}>("/quran/verses/uthmani_tajweed");
const text = new Map(plain.map((v) => [v.verse_key, v.text_uthmani]));
const tajwid = new Map(tajweed.map((v) => [v.verse_key, v.text_uthmani_tajweed]));

const layout = new Map<string, { juz: number; page: number; first: number; last: number }>();
for (let page = 1; page <= PAGES; page++) {
  const { verses } = await get<{ verses: PageVerse[] }>(
    `/verses/by_page/${page}?words=true&word_fields=line_number,page_number&per_page=50`,
  );
  for (const v of verses) {
    const lines = v.words.map((w) => w.line_number);
    if (v.words.some((w) => w.page_number !== page))
      fail(`${v.verse_key} melintasi halaman (mushaf Madinah selalu berakhir di batas ayat)`);
    if (lines.some((l) => l < 1 || l > LINES)) fail(`${v.verse_key} punya baris di luar 1–15`);
    layout.set(v.verse_key, {
      juz: v.juz_number,
      page,
      first: Math.min(...lines),
      last: Math.max(...lines),
    });
  }
  if (page % 50 === 0) console.log(`halaman ${page}/${PAGES}`);
  await new Promise((r) => setTimeout(r, 120));
}

type Ayat = {
  id: number;
  surah: number;
  ayat: number;
  juz: number;
  halaman: number;
  baris_awal: number;
  baris_akhir: number;
  teks_utsmani: string;
  teks_tajwid: string;
};
const ayat: Ayat[] = [];
let id = 0;
for (const c of chapters) {
  for (let n = 1; n <= c.verses_count; n++) {
    const key = `${c.id}:${n}`;
    const l = layout.get(key) ?? fail(`${key} tidak ada di layout halaman`);
    const t = text.get(key) ?? fail(`${key} tidak punya teks Utsmani`);
    ayat.push({
      id: ++id,
      surah: c.id,
      ayat: n,
      juz: l.juz,
      halaman: l.page,
      baris_awal: l.first,
      baris_akhir: l.last,
      teks_utsmani: t,
      teks_tajwid: tajwid.get(key) ?? "",
    });
  }
}
if (id !== 6236) fail(`jumlah ayat ${id}, seharusnya 6236`);
if (layout.size !== 6236) fail(`layout memuat ${layout.size} ayat`);
const pages = new Set(ayat.map((a) => a.halaman));
if (pages.size !== PAGES) fail(`halaman terisi ${pages.size}, seharusnya ${PAGES}`);
for (let i = 1; i < ayat.length; i++) {
  if (ayat[i]!.halaman < ayat[i - 1]!.halaman) fail(`urutan halaman mundur di ayat id ${i + 1}`);
}
const juz = new Set(ayat.map((a) => a.juz));
if (juz.size !== 30) fail(`juz terisi ${juz.size}, seharusnya 30`);
const missingTajwid = ayat.filter((a) => !a.teks_tajwid).length;

mkdirSync(OUT, { recursive: true });
const surah = chapters.map((c) => ({
  id: c.id,
  nama_latin: c.name_simple,
  nama_arab: c.name_arabic,
  jumlah_ayat: c.verses_count,
}));
writeFileSync(`${OUT}/surah.json`, JSON.stringify(surah, null, 1) + "\n");
// Satu ayat per baris: diff tetap terbaca dan file bisa di-stream.
writeFileSync(`${OUT}/ayat.json`, "[\n" + ayat.map((a) => JSON.stringify(a)).join(",\n") + "\n]\n");
const today = new Date().toISOString().slice(0, 10);
writeFileSync(
  `${OUT}/SUMBER.md`,
  `# Sumber data Al-Qur'an

- Sumber: Quran.com API v4 (Quran Foundation), ${API}
  - \`/chapters?language=id\` — nama surah dan jumlah ayat
  - \`/quran/verses/uthmani\` — teks Utsmani per ayat
  - \`/quran/verses/uthmani_tajweed\` — teks Utsmani bermarkup tajwid (\`<tajweed class=…>\`)
  - \`/verses/by_page/{1..604}\` — halaman, juz, dan nomor baris setiap kata (mushaf Madinah 15 baris)
- Tanggal ambil: ${today}
- Dibuat oleh: \`bun scripts/siapkan-data-quran.ts\`
- Validasi lulus: 114 surah, 6236 ayat, 604 halaman, 30 juz, semua baris 1–15, tidak ada ayat
  melintasi halaman. Ayat tanpa markup tajwid: ${missingTajwid}.
- baris_awal/baris_akhir = baris kata pertama/terakhir ayat (termasuk penanda nomor ayat) di halaman itu.

## Status

**DEMO.** Data ini belum diverifikasi terhadap mushaf fisik sekolah dan rujukannya belum disahkan
asatidzah. Sebelum dipakai resmi: periksa ketentuan penggunaan API/teks, sahkan rujukan di menu
Admin → Rujukan, dan cocokkan halaman sampel (mis. 1, 2, 300, 604) dengan mushaf fisik.
`,
);
console.log(`Selesai: ${chapters.length} surah, ${id} ayat, ${pages.size} halaman → ${OUT}/`);
