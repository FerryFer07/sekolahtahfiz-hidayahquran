/** Segmen hasil penguraian markup tajwid. kode = kelas hukum (null = tanpa warna); end = nomor ayat. */
export type TajwidSegment = { text: string; kode: string | null; end?: true };

const TAG = /<(\/?)(tajweed|span)(?:\s+class=["']?([a-z_]+)["']?)?\s*>/y;

/**
 * Mengurai markup tajwid tanpa HTML parser (aman di server maupun browser).
 * Whitelist: hanya `<tajweed class=…>` dan `<span class=end>`; tag lain dibuang,
 * karakter `<`/`>` sisa markup rusak dibuang, dan teks selalu dirender sebagai teks React.
 */
export function parseTajwid(markup: string): TajwidSegment[] {
  const out: TajwidSegment[] = [];
  const stack: (string | null)[] = [];
  const push = (ch: string) => {
    const top = stack.length ? stack[stack.length - 1]! : null;
    const end = top === "end";
    const kode = end ? null : top;
    const last = out[out.length - 1];
    if (last && last.kode === kode && !!last.end === end) last.text += ch;
    else out.push(end ? { text: ch, kode: null, end: true } : { text: ch, kode });
  };
  let i = 0;
  while (i < markup.length) {
    const ch = markup[i]!;
    if (ch === "<") {
      TAG.lastIndex = i;
      const m = TAG.exec(markup);
      if (m) {
        if (m[1]) stack.pop();
        else stack.push(m[3] ?? null);
        i = TAG.lastIndex;
      } else {
        const close = markup.indexOf(">", i);
        i = close === -1 ? markup.length : close + 1;
      }
      continue;
    }
    if (ch !== ">") push(ch);
    i++;
  }
  return out;
}

/** Teks ayat (tanpa nomor ayat) dari markup tajwid. */
export function tajwidPlainText(markup: string) {
  return parseTajwid(markup)
    .filter((s) => !s.end)
    .map((s) => s.text)
    .join("")
    .trim();
}

/**
 * Memindahkan warna hukum tajwid dari markup sumber ke teks Utsmani resmi.
 * Huruf hasilnya selalu persis `utsmani`; yang dipindahkan hanya posisi kelas hukum,
 * lewat penyejajaran LCS per karakter (sumber tajwid memakai pengkodean harakat yang berbeda).
 */
export function pindahkanWarnaTajwid(sumber: string, utsmani: string): string {
  const src: { ch: string; kode: string | null }[] = [];
  let endText = "";
  for (const s of parseTajwid(sumber)) {
    if (s.end) endText += s.text;
    else for (const ch of s.text) src.push({ ch, kode: s.kode });
  }
  while (src.length && /\s/.test(src[src.length - 1]!.ch)) src.pop();
  while (src.length && /\s/.test(src[0]!.ch)) src.shift();
  const a = Array.from(utsmani.trim());
  const n = a.length;
  const m = src.length;
  const w = m + 1;
  const dp = new Uint16Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i * w + j] =
        a[i] === src[j]!.ch
          ? dp[(i + 1) * w + j + 1]! + 1
          : Math.max(dp[(i + 1) * w + j]!, dp[i * w + j + 1]!);
  const pairs: [number, number][] = [];
  for (let i = 0, j = 0; i < n && j < m;) {
    if (a[i] === src[j]!.ch) pairs.push([i++, j++]);
    else if (dp[(i + 1) * w + j]! >= dp[i * w + j + 1]!) i++;
    else j++;
  }
  const kode: (string | null)[] = new Array(n).fill(null);
  const bounds: [number, number][] = [[-1, -1], ...pairs, [n, m]];
  for (let k = 0; k < bounds.length - 1; k++) {
    const [pi, pj] = bounds[k]!;
    const [ci, cj] = bounds[k + 1]!;
    if (ci < n) kode[ci] = src[cj]!.kode;
    // Huruf yang tidak cocok di antara dua pasangan: ambil kelas sumber pada posisi proporsional.
    const gapA = ci - pi - 1;
    const gapB = cj - pj - 1;
    for (let x = 0; x < gapA; x++)
      kode[pi + 1 + x] = gapB > 0 ? src[pj + 1 + Math.floor((x * gapB) / gapA)]!.kode : null;
  }
  let out = "";
  for (let i = 0; i < n;) {
    const k = /\s/.test(a[i]!) ? null : kode[i]!;
    let j = i + 1;
    while (j < n && (/\s/.test(a[j]!) ? null : kode[j]) === k) j++;
    const run = a.slice(i, j).join("");
    out += k ? `<tajweed class=${k}>${run}</tajweed>` : run;
    i = j;
  }
  return endText ? `${out} <span class=end>${endText}</span>` : out;
}
