import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, ChevronLeft, ChevronRight, Eye, EyeOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { ProtectedPage, useSchool } from "./views";
import { parseTajwid, tajwidPlainText } from "./tajwid";
import { tajwidGroups } from "./constants";

type Ayat = Database["public"]["Tables"]["quran_ayat"]["Row"];
type Hukum = Database["public"]["Tables"]["hukum_tajwid"]["Row"];
type Mode = "surah" | "juz" | "halaman";

const groupLabels: Record<(typeof tajwidGroups)[number], string> = {
  mad: "Mad",
  nun_mim_sukun: "Nun & mim sukun",
  ghunnah: "Ghunnah",
  qalqalah: "Qalqalah",
  lam: "Lam",
  lainnya: "Lainnya",
};

/**
 * Teks Al-Qur'an bertajwid. Markup diurai dengan whitelist (parseTajwid) dan dirender sebagai elemen
 * React — tanpa dangerouslySetInnerHTML. Bila huruf hasil urai tidak identik dengan teks Utsmani,
 * teks Utsmani polos yang ditampilkan.
 */
export function TeksTajwid({
  ayat,
  tajwid,
  hukum,
  onPick,
}: {
  ayat: Ayat;
  tajwid: boolean;
  hukum: Map<string, Hukum>;
  onPick?: (h: Hukum) => void;
}) {
  const segments = useMemo(
    () =>
      tajwid && ayat.teks_tajwid && tajwidPlainText(ayat.teks_tajwid) === ayat.teks_utsmani.trim()
        ? parseTajwid(ayat.teks_tajwid).filter((s) => !s.end)
        : null,
    [ayat, tajwid],
  );
  if (!segments) return <>{ayat.teks_utsmani}</>;
  return (
    <>
      {segments.map((s, i) => {
        const h = s.kode ? hukum.get(s.kode) : undefined;
        return h ? (
          <span
            key={i}
            className="tajwid-mark"
            style={{ color: h.warna_hex }}
            role="button"
            tabIndex={0}
            title={h.nama}
            onClick={() => onPick?.(h)}
            onKeyDown={(e) => e.key === "Enter" && onPick?.(h)}
          >
            {s.text}
          </span>
        ) : (
          <span key={i}>{s.text}</span>
        );
      })}
    </>
  );
}

const arabicDigits = (n: number) => n.toLocaleString("ar-EG", { useGrouping: false });

export function QuranView() {
  const { data, me } = useSchool();
  const [mode, setMode] = useState<Mode>("surah");
  const [surah, setSurah] = useState(1);
  const [juz, setJuz] = useState(1);
  const [page, setPage] = useState(1);
  const [tajwid, setTajwid] = useState(me?.tampilkan_tajwid ?? true);
  const [hafalan, setHafalan] = useState(false);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [picked, setPicked] = useState<Hukum | null>(null);
  const touch = useRef<number | null>(null);
  const hukum = useMemo(() => new Map(data.tajwid.map((h) => [h.kode, h])), [data.tajwid]);
  const value = mode === "surah" ? surah : mode === "juz" ? juz : page;
  const ayat = useQuery({
    queryKey: ["quran_ayat", mode, value],
    staleTime: Infinity,
    queryFn: async () => {
      const r = await supabase.from("quran_ayat").select("*").eq(mode, value).order("id");
      if (r.error) throw r.error;
      return r.data;
    },
  });
  const rows = ayat.data ?? [];
  const reference = data.references.find((r) => r.id === rows[0]?.rujukan_id);
  const max = mode === "surah" ? 114 : mode === "juz" ? 30 : 604;
  const go = (delta: number) => {
    const next = Math.min(max, Math.max(1, value + delta));
    (mode === "surah" ? setSurah : mode === "juz" ? setJuz : setPage)(next);
    setRevealed(new Set());
    window.scrollTo({ top: 0 });
  };
  const usedGroups = tajwidGroups.filter((g) => data.tajwid.some((h) => h.kelompok === g));
  const size = me?.ukuran_huruf_quran || "sedang";

  if (!data.surahs.length)
    return (
      <ProtectedPage title="Al-Qur’an" subtitle="Mushaf Madinah · 15 baris · 604 halaman">
        <div className="empty-state">
          <BookOpen />
          <h2>Data belum diimpor</h2>
          <p>Admin sekolah dapat mengimpor referensi Al-Qur’an dari menu Administrasi.</p>
        </div>
      </ProtectedPage>
    );

  return (
    <ProtectedPage title="Al-Qur’an" subtitle="Mushaf Madinah · 15 baris · 604 halaman">
      {reference && (
        <p
          className={`feedback-note ${reference.disahkan_oleh_nama.startsWith("DEMO") ? "is-warning" : ""}`}
        >
          Rujukan: {reference.judul}
          {reference.disahkan_oleh_nama && ` · disahkan: ${reference.disahkan_oleh_nama}`}
        </p>
      )}
      <div className="quran-toolbar">
        <div className="segment" role="tablist" aria-label="Navigasi">
          {(["surah", "juz", "halaman"] as const).map((m) => (
            <Button
              key={m}
              size="sm"
              variant={mode === m ? "default" : "ghost"}
              role="tab"
              aria-selected={mode === m}
              onClick={() => {
                setMode(m);
                setRevealed(new Set());
              }}
            >
              {m === "surah" ? "Surah" : m === "juz" ? "Juz" : "Halaman"}
            </Button>
          ))}
        </div>
        <label>
          {mode === "surah" ? "Surah" : mode === "juz" ? "Juz" : "Halaman"}
          {mode === "surah" ? (
            <select value={surah} onChange={(e) => setSurah(Number(e.target.value))}>
              {data.surahs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id}. {s.nama_latin} · {s.nama_arab}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="number"
              min={1}
              max={max}
              value={value}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 1 && v <= max) (mode === "juz" ? setJuz : setPage)(v);
              }}
            />
          )}
        </label>
        <label className="check-label">
          <input type="checkbox" checked={tajwid} onChange={(e) => setTajwid(e.target.checked)} />
          Warna tajwid
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={hafalan}
            onChange={(e) => {
              setHafalan(e.target.checked);
              setRevealed(new Set());
            }}
          />
          Mode hafalan
        </label>
      </div>

      <div
        className="mushaf"
        onTouchStart={(e) => (touch.current = e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          const start = touch.current;
          const end = e.changedTouches[0]?.clientX;
          touch.current = null;
          // Arah mushaf: geser ke kanan = halaman berikutnya (yang berada di kiri).
          if (start != null && end != null && Math.abs(end - start) > 60) go(end > start ? 1 : -1);
        }}
      >
        {ayat.isLoading ? (
          <p className="muted-note">Memuat ayat…</p>
        ) : ayat.error ? (
          <p className="feedback-note">{(ayat.error as Error).message}</p>
        ) : (
          rows.map((a, i) => {
            const s = data.surahs.find((x) => x.id === a.surah);
            const newPage = i === 0 || rows[i - 1]!.halaman !== a.halaman;
            const hidden = hafalan && !revealed.has(a.id);
            return (
              <div key={a.id}>
                {newPage && mode !== "halaman" && (
                  <div className="mushaf-page-mark">
                    Halaman {a.halaman} · Juz {a.juz}
                  </div>
                )}
                {a.ayat === 1 && (
                  <h2 className="surah-header" dir="rtl">
                    <span>{s?.nama_arab}</span>
                    <small>
                      {s?.nama_latin} · {s?.jumlah_ayat} ayat
                    </small>
                  </h2>
                )}
                <p
                  dir="rtl"
                  lang="ar"
                  className={`quran-text quran-${size} mushaf-ayah ${hidden ? "is-hidden" : ""}`}
                  onClick={hidden ? () => setRevealed(new Set(revealed).add(a.id)) : undefined}
                >
                  {hidden ? (
                    <span className="hidden-hint">
                      <Eye size={16} /> Ketuk untuk membuka {a.surah}:{a.ayat}
                    </span>
                  ) : (
                    <TeksTajwid ayat={a} tajwid={tajwid} hukum={hukum} onPick={setPicked} />
                  )}{" "}
                  <span className="ayah-number" aria-label={`ayat ${a.ayat}`}>
                    ﴿{arabicDigits(a.ayat)}﴾
                  </span>
                </p>
              </div>
            );
          })
        )}
      </div>

      <div className="quran-nav">
        {/* Halaman berikutnya di kiri, seperti mushaf. */}
        <Button variant="outline" onClick={() => go(1)} disabled={value >= max}>
          <ChevronLeft /> Berikutnya
        </Button>
        <span>
          {mode === "surah" ? "Surah" : mode === "juz" ? "Juz" : "Halaman"} {value} / {max}
        </span>
        <Button variant="outline" onClick={() => go(-1)} disabled={value <= 1}>
          Sebelumnya <ChevronRight />
        </Button>
      </div>
      {hafalan && revealed.size > 0 && (
        <Button variant="ghost" onClick={() => setRevealed(new Set())}>
          <EyeOff /> Sembunyikan lagi
        </Button>
      )}

      {tajwid && usedGroups.length > 0 && (
        <section className="tajwid-legend" aria-label="Legenda warna tajwid">
          {usedGroups.map((g) => (
            <div key={g}>
              <h3>{groupLabels[g]}</h3>
              <ul>
                {data.tajwid
                  .filter((h) => h.kelompok === g)
                  .map((h) => (
                    <li key={h.kode}>
                      <button type="button" onClick={() => setPicked(h)}>
                        <i style={{ background: h.warna_hex }} />
                        {h.nama}
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {picked && (
        <aside className="tajwid-panel" role="dialog" aria-label={picked.nama}>
          <header>
            <span className="color-chip">
              <i style={{ background: picked.warna_hex }} />
              <strong>{picked.nama}</strong>
            </span>
            <Button variant="ghost" size="icon" aria-label="Tutup" onClick={() => setPicked(null)}>
              <X />
            </Button>
          </header>
          <p className="muted-note">{groupLabels[picked.kelompok as keyof typeof groupLabels]}</p>
          {picked.penjelasan ? (
            <p>{picked.penjelasan}</p>
          ) : (
            <p className="muted-note">Penjelasan belum diisi.</p>
          )}
          {picked.bait_matan && (
            <p dir="rtl" lang="ar" className="quran-text quran-kecil">
              {picked.bait_matan}
            </p>
          )}
          {picked.contoh && <p>Contoh: {picked.contoh}</p>}
          {picked.rujukan_id && (
            <p className="muted-note">
              Rujukan: {data.references.find((r) => r.id === picked.rujukan_id)?.judul}
            </p>
          )}
        </aside>
      )}
    </ProtectedPage>
  );
}
