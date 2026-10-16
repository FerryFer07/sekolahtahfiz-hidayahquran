import { describe, it, expect } from "vitest";
import { parseTajwid, pindahkanWarnaTajwid, tajwidPlainText } from "@/features/school/tajwid";

describe("parseTajwid", () => {
  it("keeps only whitelisted tajweed classes and the ayah-number marker", () => {
    expect(parseTajwid("ب<tajweed class=ham_wasl>ٱ</tajweed>ل <span class=end>١</span>")).toEqual([
      { text: "ب", kode: null },
      { text: "ٱ", kode: "ham_wasl" },
      { text: "ل ", kode: null },
      { text: "١", kode: null, end: true },
    ]);
  });

  it("drops unknown tags and stray markup characters instead of rendering them", () => {
    const segs = parseTajwid('أ<script>x</script>ب<img src=x onerror="y">فْتَرَ>ٮٰ</tajweed>ج');
    expect(segs.map((s) => s.text).join("")).toBe("أxبفْتَرَٮٰج");
    expect(segs.every((s) => s.kode === null)).toBe(true);
  });
});

describe("pindahkanWarnaTajwid", () => {
  it("always yields the official Uthmani letters, carrying colours across encoding differences", () => {
    // Sumber memakai U+0672 dan U+200C; teks resmi memakai U+0670 dan spasi.
    const sumber = "ذَ<tajweed class=madda_normal>ٲ</tajweed>لِكَ‌ٱ <span class=end>٢</span>";
    const utsmani = "ذَٰلِكَ ٱ";
    const out = pindahkanWarnaTajwid(sumber, utsmani);
    expect(tajwidPlainText(out)).toBe(utsmani);
    expect(parseTajwid(out)).toContainEqual({ text: "ٰ", kode: "madda_normal" });
    expect(parseTajwid(out).at(-1)).toEqual({ text: "٢", kode: null, end: true });
  });

  it("survives malformed source markup without leaking characters", () => {
    const out = pindahkanWarnaTajwid("فْتَرَ>ٮٰ</tajweed>هُ", "فْتَرَىٰهُ");
    expect(tajwidPlainText(out)).toBe("فْتَرَىٰهُ");
  });
});
