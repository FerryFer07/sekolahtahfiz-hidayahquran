import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/features/school/views", () => ({ ProtectedPage: () => null, useSchool: () => ({}) }));

import { TeksTajwid } from "@/features/school/quran";

const hukum = new Map([
  [
    "ham_wasl",
    {
      kode: "ham_wasl",
      nama: "Hamzah washl",
      kelompok: "lainnya",
      warna_hex: "#AAAAAA",
      penjelasan: "",
      bait_matan: "",
      contoh: "",
      rujukan_id: null,
    },
  ],
]);
const ayat = (teks_utsmani: string, teks_tajwid: string) =>
  ({ id: 1, surah: 1, ayat: 1, teks_utsmani, teks_tajwid }) as never;

describe("TeksTajwid", () => {
  it("colours whitelisted classes from hukum_tajwid", () => {
    const { container } = render(
      <TeksTajwid
        ayat={ayat("بٱل", "ب<tajweed class=ham_wasl>ٱ</tajweed>ل")}
        tajwid
        hukum={hukum}
      />,
    );
    const mark = container.querySelector(".tajwid-mark") as HTMLElement;
    expect(mark.textContent).toBe("ٱ");
    expect(mark.style.color).toBe("rgb(170, 170, 170)");
    expect(container.textContent).toBe("بٱل");
  });

  it("never turns markup into elements", () => {
    const { container } = render(
      <TeksTajwid
        ayat={ayat("بxل", 'ب<img src=x onerror="alert(1)">x<script>ل')}
        tajwid
        hukum={hukum}
      />,
    );
    expect(container.querySelector("img, script")).toBeNull();
  });

  it("falls back to the official Uthmani text when the markup letters differ", () => {
    const { container } = render(
      <TeksTajwid
        ayat={ayat("بٱل", "ب<tajweed class=ham_wasl>ا</tajweed>ل")}
        tajwid
        hukum={hukum}
      />,
    );
    expect(container.textContent).toBe("بٱل");
    expect(container.querySelector(".tajwid-mark")).toBeNull();
  });

  it("shows plain Uthmani text when tajwid colours are switched off", () => {
    const { container } = render(
      <TeksTajwid
        ayat={ayat("بٱل", "ب<tajweed class=ham_wasl>ٱ</tajweed>ل")}
        tajwid={false}
        hukum={hukum}
      />,
    );
    expect(container.querySelector(".tajwid-mark")).toBeNull();
    expect(container.textContent).toBe("بٱل");
  });
});
