import { useState, type ReactNode } from "react";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  BookOpen,
  Users,
  Check,
  Plus,
  ArrowRight,
  Search,
  Clock,
  CheckCircle2,
  ShieldCheck,
  MapPin,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { schoolQuery } from "./queries";
import { SchoolShell } from "./shell";
import { jakartaDate, schoolName, schoolAddress } from "./constants";
import { createAccount } from "./data.functions";
import type { Database } from "@/integrations/supabase/types";
type Ayat = Database["public"]["Tables"]["quran_ayat"]["Row"];
export function useSchool() {
  const { data } = useSuspenseQuery(schoolQuery);
  const qc = useQueryClient();
  const role = data.roles.find((r) => r.user_id === data.userId)?.role;
  const me = data.profiles.find((p) => p.id === data.userId);
  return { data, role, me, refresh: () => qc.invalidateQueries({ queryKey: ["school"] }) };
}
function Notice({ message }: { message: string }) {
  return message ? (
    <p role="status" className="feedback-note">
      {message}
    </p>
  ) : null;
}
export function ProtectedPage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string | undefined;
  children: ReactNode;
}) {
  const { role, me, refresh } = useSchool();
  const [message, setMessage] = useState("");
  const [agree, setAgree] = useState(false);
  if (role === "wali" && !me?.persetujuan_data_pada)
    return (
      <SchoolShell title="Persetujuan penggunaan data">
        <section className="consent-section">
          <ShieldCheck size={40} />
          <h2>Data ananda, amanah bersama.</h2>
          <p>
            STHQ menggunakan identitas, kehadiran, dan catatan hafalan ananda untuk pendampingan
            pembelajaran. Data hanya dapat diakses oleh wali ananda dan petugas sekolah yang
            berwenang, tidak dibagikan secara publik, serta tidak digunakan untuk peringkat antar
            santri.
          </p>
          <p>Hubungi pihak sekolah untuk meminta koreksi atau penjelasan penggunaan data.</p>
          <label className="check-label">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            Saya menyetujui penggunaan data anak untuk pendampingan pembelajaran di STHQ.
          </label>
          <Button
            disabled={!agree}
            onClick={async () => {
              const r = await supabase
                .from("profiles")
                .update({ persetujuan_data_pada: new Date().toISOString() })
                .eq("id", me?.id || "");
              if (r.error) setMessage(r.error.message);
              else await refresh();
            }}
          >
            Setuju dan lanjutkan <ArrowRight />
          </Button>
          <Notice message={message} />
        </section>
      </SchoolShell>
    );
  return (
    <SchoolShell title={title} subtitle={subtitle}>
      {!role ? (
        <div className="empty-state">
          <ShieldCheck />
          <h2>Akun belum mendapat peran</h2>
          <p>Hubungi admin sekolah untuk mengaktifkan akses Anda.</p>
        </div>
      ) : (
        children
      )}
    </SchoolShell>
  );
}
export function HomeView() {
  const { data, role, me, refresh } = useSchool();
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("semua");
  const [date, setDate] = useState(jakartaDate());
  const [message, setMessage] = useState("");
  const students = data.santri.filter(
    (s) =>
      s.aktif &&
      (group === "semua" || s.jalur === group) &&
      s.nama.toLowerCase().includes(search.toLowerCase()),
  );
  const entries = [...data.entries, ...data.iqro].filter((e) => e.tanggal === date);
  const attending = data.attendance.filter((a) => a.tanggal === date && a.status === "hadir");
  const writable = ["admin", "ustadz", "badal"].includes(role || "");
  async function attendance(id: string, status: string) {
    const r = await supabase
      .from("kehadiran")
      .upsert(
        { santri_id: id, tanggal: date, status, dicatat_oleh: data.userId },
        { onConflict: "santri_id,tanggal" },
      );
    if (r.error) setMessage(r.error.message);
    else await refresh();
  }
  return (
    <ProtectedPage
      title={`Assalamu’alaikum, ${me?.nama.split(" ")[0] || "Bapak/Ibu"}.`}
      subtitle={
        role === "wali"
          ? "Semoga setiap ikhtiar ananda menjadi hafalan yang terjaga."
          : "Semoga Allah memberkahi pendampingan hafalan hari ini."
      }
    >
      <div className="welcome-band">
        <div>
          <span className="eyebrow">BERSAMA AL-QUR’AN</span>
          <h2>Satu hari, satu langkah kebaikan.</h2>
          <p>
            {role === "wali"
              ? "Dampingi muraja’ah ananda hari ini."
              : "Dampingi setiap santri dengan perhatian dan keikhlasan."}
          </p>
          <Button asChild>
            <Link to={role === "pengawas" ? "/pengawas" : "/setoran"}>
              {role === "pengawas" ? "Lihat pengawasan" : "Catat setoran"}
              <ArrowRight />
            </Link>
          </Button>
        </div>
        <BookOpen className="welcome-book" strokeWidth={1} />
      </div>
      <div className="stat-grid">
        <div className="stat-item">
          <span>Santri {role === "wali" ? "ananda" : "aktif"}</span>
          <strong>
            {data.santri.filter((s) => s.aktif).length}
            <Users />
          </strong>
          <small>{data.halaqah.length} halaqah</small>
        </div>
        <div className="stat-item">
          <span>Setoran hari ini</span>
          <strong>
            {entries.length}
            <BookOpen />
          </strong>
          <small>Sekolah dan rumah</small>
        </div>
        <div className="stat-item">
          <span>Kehadiran hari ini</span>
          <strong>
            {attending.length}
            <CheckCircle2 />
          </strong>
          <small>Santri hadir</small>
        </div>
        <div className="stat-item">
          <span>Menunggu paraf</span>
          <strong>
            {entries.filter((e) => e.tempat === "sekolah" && !e.diparaf_pada).length}
            <Clock />
          </strong>
          <small>Catatan sekolah</small>
        </div>
      </div>
      <section className="student-section">
        <div className="section-heading">
          <div>
            <h2>{role === "wali" ? "Ananda" : "Santri hari ini"}</h2>
            <p>
              {role === "wali"
                ? "Catatan belajar dan hafalan ananda."
                : "Kehadiran dan setoran dalam satu pandangan."}
            </p>
          </div>
          <input
            type="date"
            aria-label="Tanggal kehadiran"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="table-toolbar">
          <div className="segment">
            {(
              [
                ["semua", "Semua santri"],
                ["tahfidz", "Tahfidz"],
                ["iqro", "Iqro’"],
              ] as const
            ).map(([v, l]) => (
              <Button
                key={v}
                variant={group === v ? "secondary" : "ghost"}
                onClick={() => setGroup(v)}
              >
                {l}
              </Button>
            ))}
          </div>
          <div className="search-input">
            <Search size={17} />
            <input
              aria-label="Cari santri"
              placeholder="Cari nama santri…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <Notice message={message} />
        {!students.length ? (
          <div className="empty-state">
            <Users />
            <h3>Belum ada santri</h3>
            <p>
              {role === "admin"
                ? "Tambahkan halaqah dan santri melalui Administrasi."
                : "Data santri akan tampil setelah ditautkan oleh admin sekolah."}
            </p>
            {role === "admin" && (
              <Button asChild>
                <Link to="/admin">
                  <Plus />
                  Tambah data sekolah
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="student-list">
            {students.map((s) => {
              const h = data.halaqah.find((h) => h.id === s.halaqah_id);
              const a = data.attendance.find((a) => a.santri_id === s.id && a.tanggal === date);
              return (
                <div className="student-row" key={s.id}>
                  <span className="avatar">{s.nama.slice(0, 1)}</span>
                  <div className="student-name">
                    <strong>{s.nama}</strong>
                    <small>
                      Kelas {s.kelas} · {h?.nama || "Belum ada halaqah"}
                    </small>
                  </div>
                  <span className={`path-badge ${s.jalur}`}>
                    {s.jalur === "iqro" ? "Iqro’" : "Tahfidz"}
                  </span>
                  {writable ? (
                    <div className="attendance-buttons">
                      {(
                        [
                          ["hadir", "H"],
                          ["sakit", "S"],
                          ["izin", "I"],
                          ["alpa", "A"],
                        ] as const
                      ).map(([v, l]) => (
                        <Button
                          key={v}
                          variant={a?.status === v ? "default" : "outline"}
                          size="icon"
                          title={v}
                          aria-label={`${v} ${s.nama}`}
                          onClick={() => attendance(s.id, v)}
                        >
                          {l}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <span className="status-text">{a?.status || "Belum dicatat"}</span>
                  )}
                  <span className="entry-status">
                    {entries.some((e) => e.santri_id === s.id) ? (
                      <>
                        <Check size={15} />
                        Sudah setoran
                      </>
                    ) : (
                      "Belum setoran"
                    )}
                  </span>
                  <Button variant="ghost" size="icon" asChild>
                    <Link to="/setoran" search={{ santri: s.id }} aria-label={`Setoran ${s.nama}`}>
                      <ArrowRight />
                    </Link>
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </ProtectedPage>
  );
}
export function EntryView({ initial = "" }: { initial?: string }) {
  const { data, role, me, refresh } = useSchool();
  const [student, setStudent] = useState(initial || data.santri[0]?.id || "");
  const s = data.santri.find((s) => s.id === student);
  const [date, setDate] = useState(jakartaDate());
  const [kind, setKind] = useState("sabaq");
  const [surah, setSurah] = useState("");
  const [verses, setVerses] = useState<Ayat[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [grade, setGrade] = useState("");
  const [note, setNote] = useState("");
  const [repeat, setRepeat] = useState(1);
  const [heard, setHeard] = useState(false);
  const [jilid, setJilid] = useState(1);
  const [pageFrom, setPageFrom] = useState(1);
  const [pageTo, setPageTo] = useState(1);
  const first = verses.find((v) => v.id === Number(from)),
    last = verses.find((v) => v.id === Number(to));
  const home = role === "wali";
  async function loadSurah(id: string) {
    setSurah(id);
    setFrom("");
    setTo("");
    const r = await supabase.from("quran_ayat").select("*").eq("surah", Number(id)).order("ayat");
    if (r.error) setMessage(r.error.message);
    setVerses(r.data || []);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!s) return;
    setBusy(true);
    setMessage("");
    try {
      const common = {
        santri_id: s.id,
        tanggal: date,
        tempat: home ? "rumah" : "sekolah",
        nilai: grade || null,
        catatan: note,
        kali_ulang: repeat,
        disimak: heard,
        diisi_oleh: data.userId,
      };
      const r =
        s.jalur === "iqro"
          ? await supabase
              .from("setoran_iqro")
              .insert({ ...common, jilid, halaman_dari: pageFrom, halaman_sampai: pageTo })
          : await supabase
              .from("setoran")
              .insert({
                ...common,
                jenis: home && kind === "sabaq" ? "sabaq" : kind,
                dari_ayat_id: Number(from),
                sampai_ayat_id: Number(to),
              });
      if (r.error) throw r.error;
      setMessage("Setoran berhasil disimpan.");
      setNote("");
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Setoran belum tersimpan.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <ProtectedPage
      title={home ? "Setoran rumah" : "Input setoran"}
      subtitle="Catat ikhtiar hafalan dan pembelajaran hari ini."
    >
      {role === "pengawas" ? (
        <p>Pengawas memiliki akses baca-saja.</p>
      ) : (
        <div className="entry-layout">
          <form className="entry-form" onSubmit={save}>
            <div className="form-section">
              <h2>
                <span>01</span>Santri & waktu
              </h2>
              <div className="form-grid">
                <label>
                  Santri
                  <select
                    value={student}
                    onChange={(e) => {
                      setStudent(e.target.value);
                      setGrade("");
                    }}
                    required
                  >
                    <option value="" disabled>
                      Pilih santri
                    </option>
                    {data.santri
                      .filter((s) => s.aktif)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nama} · {s.jalur}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Tanggal
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </label>
              </div>
            </div>
            <div className="form-section">
              <h2>
                <span>02</span>
                {s?.jalur === "iqro" ? "Latihan Iqro’" : "Hafalan Al-Qur’an"}
              </h2>
              {s?.jalur === "iqro" ? (
                <div className="form-grid">
                  <label>
                    Jilid
                    <select value={jilid} onChange={(e) => setJilid(Number(e.target.value))}>
                      {[1, 2, 3, 4, 5, 6].map((j) => (
                        <option key={j}>{j}</option>
                      ))}
                    </select>
                  </label>
                  <div />
                  <label>
                    Halaman dari
                    <input
                      type="number"
                      min={1}
                      value={pageFrom}
                      onChange={(e) => setPageFrom(Number(e.target.value))}
                    />
                  </label>
                  <label>
                    Halaman sampai
                    <input
                      type="number"
                      min={pageFrom}
                      value={pageTo}
                      onChange={(e) => setPageTo(Number(e.target.value))}
                    />
                  </label>
                </div>
              ) : (
                <>
                  <div className="segment entry-types">
                    {["sabaq", "sabaqi", "manzil"].map((k) => (
                      <Button
                        type="button"
                        key={k}
                        variant={kind === k ? "default" : "outline"}
                        onClick={() => setKind(k)}
                      >
                        {k === "sabaq" && home
                          ? "Persiapan Sabaq"
                          : k.charAt(0).toUpperCase() + k.slice(1)}
                      </Button>
                    ))}
                  </div>
                  <label>
                    Surah
                    <input
                      list="surah-list"
                      placeholder="Cari nama surah…"
                      onChange={(e) => {
                        const found = data.surahs.find((s) => s.nama_latin === e.target.value);
                        if (found) void loadSurah(String(found.id));
                      }}
                    />
                    <datalist id="surah-list">
                      {data.surahs.map((s) => (
                        <option key={s.id} value={s.nama_latin} />
                      ))}
                    </datalist>
                  </label>
                  {!data.surahs.length && (
                    <p className="muted-note">
                      Referensi Al-Qur’an belum diimpor oleh admin sekolah.
                    </p>
                  )}
                  <div className="form-grid">
                    <label>
                      Ayat dari
                      <select
                        value={from}
                        onChange={(e) => {
                          setFrom(e.target.value);
                          setTo(e.target.value);
                        }}
                        required
                        disabled={!surah}
                      >
                        <option value="">Pilih ayat</option>
                        {verses.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.ayat}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Ayat sampai
                      <select
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        required
                        disabled={!from}
                      >
                        <option value="">Pilih ayat</option>
                        {verses
                          .filter((v) => v.id >= Number(from))
                          .map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.ayat}
                            </option>
                          ))}
                      </select>
                    </label>
                  </div>
                  {first && last && (
                    <div className="verse-preview">
                      <span>
                        Halaman {first.halaman}–{last.halaman} · Jumlah baris dihitung saat disimpan
                      </span>
                      <div dir="rtl" className={`quran-text quran-${me?.ukuran_huruf_quran || 'sedang'}`}>
                        {verses
                          .filter((v) => v.id >= first.id && v.id <= last.id)
                          .map((v) => (
                            <span key={v.id}>
                              {v.teks_utsmani} ﴿{v.ayat}﴾{" "}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="form-section">
              <h2>
                <span>03</span>Penilaian & catatan
              </h2>
              <div className="form-grid">
                <label>
                  Nilai{home ? " (opsional)" : ""}
                  <select value={grade} onChange={(e) => setGrade(e.target.value)} required={!home}>
                    <option value="">Pilih nilai</option>
                    {(s?.jalur === "iqro"
                      ? ["lancar", "kurang_lancar", "ulang"]
                      : ["mumtaz", "jayyid_jiddan", "jayyid", "maqbul", "ulang"]
                    ).map((g) => (
                      <option key={g} value={g}>
                        {g.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Jumlah pengulangan
                  <input
                    type="number"
                    min={1}
                    value={repeat}
                    onChange={(e) => setRepeat(Number(e.target.value))}
                    required
                  />
                </label>
              </div>
              {home && (
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={heard}
                    onChange={(e) => setHeard(e.target.checked)}
                    required
                  />
                  Sudah disimak orang tua
                </label>
              )}
              <label>
                Catatan
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Catatan pendampingan…"
                  rows={3}
                />
              </label>
            </div>
            <Notice message={message} />
            <div className="form-actions">
              <Button
                disabled={busy || !s || (s.jalur === "tahfidz" && (!first || !last))}
                size="lg"
              >
                <Check />
                {busy ? "Menyimpan…" : "Simpan setoran"}
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/riwayat">Lihat riwayat</Link>
              </Button>
            </div>
          </form>
          <aside className="entry-summary">
            <BookOpen size={30} />
            <p className="eyebrow">MUTABA’AH HARIAN</p>
            <h3>{s?.nama || "Pilih santri"}</h3>
            <p>
              {s
                ? `Kelas ${s.kelas} · ${s.jalur === "iqro" ? "Jalur Iqro’" : "Jalur Tahfidz"}`
                : "Belum ada santri"}
            </p>
            <hr />
            <div>
              <span>Tempat setoran</span>
              <strong>{home ? "Rumah" : "Sekolah"}</strong>
            </div>
            <div>
              <span>Tanggal</span>
              <strong>{date}</strong>
            </div>
            <hr />
            <p>
              “Al-Qur’an di hati,
              <br />
              akhlak dalam keseharian.”
            </p>
          </aside>
        </div>
      )}
    </ProtectedPage>
  );
}
export function HistoryView() {
  const { data, role, refresh } = useSchool();
  const [student, setStudent] = useState(data.santri[0]?.id || "");
  const [filter, setFilter] = useState("semua");
  const [message, setMessage] = useState("");
  const entries = [
    ...data.entries.map((e) => ({
      ...e,
      label: e.jenis,
      detail: `Ayat ${e.dari_ayat_id}–${e.sampai_ayat_id} · ${e.jumlah_baris} baris`,
      table: "setoran" as const,
    })),
    ...data.iqro.map((e) => ({
      ...e,
      label: "iqro",
      detail: `Iqro’ ${e.jilid} · Halaman ${e.halaman_dari}–${e.halaman_sampai}`,
      table: "setoran_iqro" as const,
    })),
  ]
    .filter((e) => e.santri_id === student && (filter === "semua" || e.label === filter))
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  const dates = [
    ...new Set([
      ...entries.map((e) => e.tanggal),
      ...data.attendance
        .filter((a) => a.santri_id === student && filter === "semua")
        .map((a) => a.tanggal),
    ]),
  ]
    .sort()
    .reverse();
  return (
    <ProtectedPage title="Riwayat santri" subtitle="Jejak hafalan, latihan, dan kehadiran ananda.">
      <div className="history-filters">
        <label>
          Santri
          <select value={student} onChange={(e) => setStudent(e.target.value)}>
            <option value="">Pilih santri</option>
            {data.santri.map((s) => (
              <option value={s.id} key={s.id}>
                {s.nama}
              </option>
            ))}
          </select>
        </label>
        <label>
          Jenis setoran
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            {["semua", "sabaq", "sabaqi", "manzil", "iqro"].map((k) => (
              <option key={k} value={k}>
                {k.charAt(0).toUpperCase() + k.slice(1)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Notice message={message} />
      {!dates.length ? (
        <div className="empty-state">
          <Clock />
          <h3>Belum ada catatan</h3>
          <p>Setoran dan kehadiran santri akan tampil di sini.</p>
        </div>
      ) : (
        <div className="timeline">
          {dates.map((date) => (
            <section key={date}>
              <h3>
                {new Intl.DateTimeFormat("id-ID", {
                  dateStyle: "full",
                  timeZone: "Asia/Jakarta",
                }).format(new Date(date + "T12:00:00+07:00"))}
              </h3>
              {data.attendance
                .filter((a) => a.santri_id === student && a.tanggal === date)
                .map((a) => (
                  <p className="attendance-record" key={a.id}>
                    <CheckCircle2 size={17} /> Kehadiran: {a.status}
                  </p>
                ))}
              {entries
                .filter((e) => e.tanggal === date)
                .map((e) => (
                  <article className="history-item" key={e.id}>
                    <div className="history-icon">
                      <BookOpen />
                    </div>
                    <div>
                      <span className="eyebrow">
                        {e.tempat === "sekolah" ? "SEKOLAH" : "RUMAH"}
                      </span>
                      <h3>
                        {e.label === "iqro"
                          ? "Iqro’"
                          : e.label.charAt(0).toUpperCase() + e.label.slice(1)}
                      </h3>
                      <p>
                        {e.detail} · {e.kali_ulang} kali ulang
                      </p>
                      {e.catatan && <p className="entry-note">{e.catatan}</p>}
                      <span className="grade-badge">
                        {e.nilai?.replaceAll("_", " ") || "Tanpa penilaian"}
                      </span>
                    </div>
                    <div className="paraf-area">
                      {e.diparaf_pada ? (
                        <span>
                          <CheckCircle2 size={17} />
                          Sudah diparaf
                        </span>
                      ) : role === "wali" && e.tempat === "sekolah" ? (
                        <Button
                          variant="outline"
                          onClick={async () => {
                            const r = await supabase
                              .from(e.table)
                              .update({
                                diparaf_oleh: data.userId,
                                diparaf_pada: new Date().toISOString(),
                              })
                              .eq("id", e.id);
                            if (r.error) setMessage(r.error.message);
                            else await refresh();
                          }}
                        >
                          <Check />
                          Paraf catatan
                        </Button>
                      ) : (
                        <span>Belum diparaf</span>
                      )}
                    </div>
                  </article>
                ))}
            </section>
          ))}
        </div>
      )}
    </ProtectedPage>
  );
}
export function AccountView() {
  const { me, refresh } = useSchool();
  const [name, setName] = useState(me?.nama || "");
  const [phone, setPhone] = useState(me?.no_hp || "");
  const [size, setSize] = useState(me?.ukuran_huruf_quran || "sedang");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  return (
    <ProtectedPage title="Pengaturan akun" subtitle="Identitas dan kenyamanan membaca Al-Qur’an.">
      <form
        className="settings-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await supabase
            .from("profiles")
            .update({ nama: name, no_hp: phone, ukuran_huruf_quran: size })
            .eq("id", me?.id || "");
          setMessage(r.error ? r.error.message : "Pengaturan akun disimpan.");
          if (!r.error) await refresh();
        }}
      >
        <h2>Profil Anda</h2>
        <div className="form-grid">
          <label>
            Nama lengkap
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Nomor HP
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08…"
            />
          </label>
        </div>
        <label>
          Ukuran huruf Al-Qur’an
          <select value={size} onChange={(e) => setSize(e.target.value)}>
            {["kecil", "sedang", "besar"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <Notice message={message} />
        <Button>
          <Check />
          Simpan pengaturan
        </Button>
      </form>
      <form
        className="settings-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await supabase.auth.updateUser({ password });
          setMessage(r.error ? r.error.message : "Kata sandi berhasil diganti.");
          if (!r.error) setPassword("");
        }}
      >
        <h2>Ganti kata sandi</h2>
        <label>
          Kata sandi baru
          <input
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </label>
        <Button variant="outline">Ganti kata sandi</Button>
      </form>
    </ProtectedPage>
  );
}
export function SupervisorView() {
  const { data, role } = useSchool();
  const [start, setStart] = useState(jakartaDate(new Date(Date.now() - 6 * 86400000)));
  const [end, setEnd] = useState(jakartaDate());
  return (
    <ProtectedPage
      title="Pengawasan halaqah"
      subtitle="Ringkasan setoran santri per pekan · Baca-saja"
    >
      {!["admin", "pengawas"].includes(role || "") ? (
        <p>Akses pengawas diperlukan.</p>
      ) : (
        <>
          <div className="history-filters">
            <label>
              Dari tanggal
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </label>
            <label>
              Sampai tanggal
              <input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
            </label>
          </div>
          {data.halaqah.length ? (
            data.halaqah.map((h) => (
              <section className="supervisor-section" key={h.id}>
                <h2>{h.nama}</h2>
                <div className="data-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Santri</th>
                        <th>Jalur</th>
                        <th>Setoran sekolah</th>
                        <th>Setoran rumah</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.santri
                        .filter((s) => s.halaqah_id === h.id)
                        .map((s) => {
                          const es = [...data.entries, ...data.iqro].filter(
                            (e) => e.santri_id === s.id && e.tanggal >= start && e.tanggal <= end,
                          );
                          return (
                            <tr key={s.id}>
                              <td>{s.nama}</td>
                              <td>{s.jalur}</td>
                              <td>{es.filter((e) => e.tempat === "sekolah").length}</td>
                              <td>{es.filter((e) => e.tempat === "rumah").length}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </section>
            ))
          ) : (
            <div className="empty-state">
              <Users />
              <h3>Belum ada halaqah yang ditugaskan</h3>
              <p>Admin sekolah dapat menautkan pengawas pada halaqah.</p>
            </div>
          )}
        </>
      )}
    </ProtectedPage>
  );
}
async function saveAdminRow(t: string, v: Record<string, unknown>) {
  switch (t) {
    case "santri":
      return supabase.from("santri").upsert(v as Database["public"]["Tables"]["santri"]["Insert"]);
    case "halaqah":
      return supabase
        .from("halaqah")
        .upsert(v as Database["public"]["Tables"]["halaqah"]["Insert"]);
    case "periode":
      return supabase
        .from("periode")
        .upsert(v as Database["public"]["Tables"]["periode"]["Insert"]);
    case "wali_santri":
      return supabase
        .from("wali_santri")
        .upsert(v as Database["public"]["Tables"]["wali_santri"]["Insert"]);
    case "penugasan_badal":
      return supabase
        .from("penugasan_badal")
        .upsert(v as Database["public"]["Tables"]["penugasan_badal"]["Insert"]);
    case "pengaturan_sekolah":
      return supabase
        .from("pengaturan_sekolah")
        .upsert(v as Database["public"]["Tables"]["pengaturan_sekolah"]["Insert"]);
    default:
      throw new Error("Table tidak valid");
  }
}
export function AdminView() {
  const { data, role, refresh } = useSchool();
  const [tab, setTab] = useState("santri");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [adding, setAdding] = useState(false);
  const create = useServerFn(createAccount);
  const configs = {
    santri: {
      title: "Santri",
      fields: ["nis", "nama", "kelas", "halaqah_id", "jalur", "catatan"],
      rows: data.santri,
    },
    halaqah: {
      title: "Halaqah",
      fields: ["nama", "ustadz_id", "pengawas_id", "tahun_ajaran"],
      rows: data.halaqah,
    },
    periode: {
      title: "Periode",
      fields: ["nama", "tanggal_mulai", "tanggal_selesai", "semester", "tahun_ajaran"],
      rows: data.periods,
    },
    wali_santri: {
      title: "Relasi wali–santri",
      fields: ["wali_id", "santri_id"],
      rows: data.relations,
    },
    penugasan_badal: {
      title: "Penugasan badal",
      fields: ["halaqah_id", "ustadz_id", "mulai", "selesai"],
      rows: data.badal,
    },
    pengaturan_sekolah: {
      title: "Pengaturan sekolah",
      fields: [
        "nama_sekolah",
        "alamat",
        "kepala_sekolah",
        "satuan_default",
        "putaran_manzil_hari",
        "putaran_sabqi_hari",
        "hari_sekolah",
      ],
      rows: data.settings,
    },
    user: {
      title: "User & peran",
      fields: ["nama", "email", "password", "role"],
      rows: data.profiles,
    },
  };
  type Key = keyof typeof configs;
  const config = configs[tab as Key];
  const labels: Record<string, string> = {
    nis: "NIS",
    nama: "Nama",
    kelas: "Kelas",
    halaqah_id: "Halaqah",
    jalur: "Jalur",
    catatan: "Catatan",
    ustadz_id: "Ustadz",
    pengawas_id: "Pengawas",
    tahun_ajaran: "Tahun ajaran",
    tanggal_mulai: "Tanggal mulai",
    tanggal_selesai: "Tanggal selesai",
    semester: "Semester",
    wali_id: "Wali",
    santri_id: "Santri",
    mulai: "Mulai",
    selesai: "Selesai",
    nama_sekolah: "Nama sekolah",
    alamat: "Alamat",
    kepala_sekolah: "Kepala sekolah",
    satuan_default: "Satuan default",
    putaran_manzil_hari: "Putaran Manzil (hari)",
    putaran_sabqi_hari: "Putaran Sabaqi (hari)",
    hari_sekolah: "Hari sekolah (pisahkan dengan koma)",
    email: "Email",
    password: "Kata sandi awal",
    role: "Peran",
  };
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    const f = new FormData(e.currentTarget);
    const values: Record<string, unknown> = Object.fromEntries(f);
    for (const k of ["semester", "putaran_manzil_hari", "putaran_sabqi_hari"])
      if (k in values) values[k] = Number(values[k]);
    for (const k of ["ustadz_id", "pengawas_id", "halaqah_id"])
      if (values[k] === "") values[k] = null;
    if ("hari_sekolah" in values)
      values["hari_sekolah"] = String(values["hari_sekolah"])
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
    try {
      if (tab === "user") {
        if (editing) {
          const uid = String(editing["id"]);
          const r = await supabase
            .from("user_roles")
            .upsert({
              user_id: uid,
              role: String(values["role"]) as Database["public"]["Enums"]["app_role"],
            });
          if (r.error) throw r.error;
        } else
          await create({
            data: {
              nama: String(values["nama"]),
              email: String(values["email"]),
              password: String(values["password"]),
              role: String(values["role"]) as Database["public"]["Enums"]["app_role"],
            },
          });
      } else {
        const t = tab as Exclude<Key, "user">;
        if (editing) {
          if ("id" in editing) values["id"] = editing["id"];
          else {
            values["wali_id"] = editing["wali_id"];
            values["santri_id"] = editing["santri_id"];
          }
        }
        if (t === "pengaturan_sekolah") values["id"] = 1;
        const result = await saveAdminRow(t, values);
        if (result.error) throw result.error;
      }
      setMessage("Data berhasil disimpan.");
      setAdding(false);
      setEditing(null);
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Data belum tersimpan.");
    }
  }
  function options(k: string) {
    if (k === "jalur") return ["tahfidz", "iqro"].map((v) => ({ id: v, nama: v }));
    if (k === "satuan_default") return ["baris", "halaman"].map((v) => ({ id: v, nama: v }));
    if (k === "semester") return ["1", "2"].map((v) => ({ id: v, nama: v }));
    if (k === "role")
      return ["admin", "ustadz", "badal", "pengawas", "wali"].map((v) => ({ id: v, nama: v }));
    if (k === "halaqah_id") return data.halaqah;
    if (k === "santri_id") return data.santri;
    if (k.endsWith("_id"))
      return data.profiles.filter((p) => {
        const r = data.roles.filter((r) => r.user_id === p.id).map((r) => r["role"]);
        return k === "wali_id"
          ? r.includes("wali")
          : k === "pengawas_id"
            ? r.includes("pengawas")
            : r.includes("ustadz") || r.includes("badal");
      });
    return null;
  }
  return (
    <ProtectedPage
      title="Administrasi sekolah"
      subtitle="Kelola data sekolah dan pendampingan santri."
    >
      {role !== "admin" ? (
        <p>Akses admin diperlukan.</p>
      ) : (
        <>
          <div className="admin-tabs">
            {Object.entries(configs).map(([key, v]) => (
              <Button
                key={key}
                variant={tab === key ? "default" : "ghost"}
                onClick={() => {
                  setTab(key);
                  setAdding(false);
                  setEditing(null);
                  setMessage("");
                }}
              >
                {v.title}
              </Button>
            ))}
            <Button
              variant={tab === "quran" ? "default" : "ghost"}
              onClick={() => {
                setTab("quran");
                setAdding(false);
              }}
            >
              Impor Al-Qur’an
            </Button>
          </div>
          <Notice message={message} />
          {tab === "quran" ? (
            <QuranImport />
          ) : (
            <>
              <div className="section-heading">
                <h2>{config.title}</h2>
                <Button
                  onClick={() => {
                    setEditing(null);
                    setAdding(true);
                  }}
                >
                  <Plus />
                  {tab === "pengaturan_sekolah"
                    ? "Atur sekolah"
                    : "Tambah " + config.title.toLowerCase()}
                </Button>
              </div>
              {(adding || editing) && (
                <form className="admin-form" onSubmit={submit}>
                  <h3>{editing ? "Ubah data" : "Tambah data"}</h3>
                  <div className="form-grid">
                    {config.fields
                      .filter((k) => !editing || tab !== "user" || k === "role")
                      .map((k) => {
                        const opts = options(k);
                        const def =
                          editing?.[k] ??
                          (k === "nama_sekolah"
                            ? schoolName
                            : k === "alamat"
                              ? schoolAddress
                              : k === "hari_sekolah"
                                ? "Senin, Selasa, Rabu, Kamis, Jumat"
                                : k === "putaran_manzil_hari"
                                  ? 15
                                  : k === "putaran_sabqi_hari"
                                    ? 5
                                    : "");
                        return (
                          <label key={k}>
                            {labels[k]}
                            {opts ? (
                              <select
                                name={k}
                                defaultValue={String(def)}
                                required={!["ustadz_id", "pengawas_id"].includes(k)}
                              >
                                <option value="">Pilih {labels[k]}</option>
                                {opts.map((o) => (
                                  <option key={o.id} value={o.id}>
                                    {o.nama}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                name={k}
                                defaultValue={Array.isArray(def) ? def.join(", ") : String(def)}
                                type={
                                  k.includes("tanggal") || ["mulai", "selesai"].includes(k)
                                    ? "date"
                                    : k === "password"
                                      ? "password"
                                      : k === "email"
                                        ? "email"
                                        : k.startsWith("putaran")
                                          ? "number"
                                          : "text"
                                }
                                min={k.startsWith("putaran") ? 1 : undefined}
                                minLength={k === "password" ? 8 : undefined}
                                required={!["catatan", "kepala_sekolah"].includes(k)}
                              />
                            )}
                          </label>
                        );
                      })}
                  </div>
                  <div className="form-actions">
                    <Button>
                      <Check />
                      Simpan
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setAdding(false);
                        setEditing(null);
                      }}
                    >
                      Batal
                    </Button>
                  </div>
                </form>
              )}
              <div className="data-table-wrap">
                <table>
                  <thead>
                    <tr>
                      {(tab === "user" ? ["nama", "no_hp", "role"] : config.fields.slice(0, 4)).map(
                        (k) => (
                          <th key={k}>{labels[k] || k}</th>
                        ),
                      )}
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {config.rows.map((row, index) => {
                      const r = row as unknown as Record<string, unknown>;
                      return (
                        <tr key={String(r["id"] || index)}>
                          {(tab === "user"
                            ? ["nama", "no_hp", "role"]
                            : config.fields.slice(0, 4)
                          ).map((k) => (
                            <td key={k}>
                              {k === "role"
                                ? data.roles
                                    .filter((x) => x.user_id === r["id"])
                                    .map((x) => x.role)
                                    .join(", ") || "Belum ditugaskan"
                                : k.endsWith("_id")
                                  ? (k === "halaqah_id"
                                      ? data.halaqah
                                      : k === "santri_id"
                                        ? data.santri
                                        : data.profiles
                                    ).find((x) => x.id === r[k])?.nama || "—"
                                  : String(r[k] || "—")}
                            </td>
                          ))}
                          <td>
                            <Button
                              variant="ghost"
                              onClick={() => {
                                setAdding(false);
                                setEditing(r);
                              }}
                            >
                              Ubah
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {!config.rows.length && (
                  <div className="empty-state">
                    <Users />
                    <h3>Belum ada data {config.title.toLowerCase()}</h3>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </ProtectedPage>
  );
}
function QuranImport() {
  const [target, setTarget] = useState("quran_surah");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const { refresh } = useSchool();
  const fields =
    target === "quran_surah"
      ? ["id", "nama_latin", "nama_arab", "jumlah_ayat"]
      : ["id", "surah", "ayat", "juz", "halaman", "baris_awal", "baris_akhir", "teks_utsmani"];
  async function parse(file: File | undefined) {
    if (!file) return;
    setMessage("");
    try {
      const text = await file.text();
      let parsed;
      if (file.name.endsWith(".json")) parsed = JSON.parse(text);
      else {
        const { default: Papa } = await import("papaparse");
        const r = Papa.parse(text, { header: true, skipEmptyLines: true });
        if (r.errors.length) throw new Error("CSV tidak valid. Periksa pemisah dan tanda kutip.");
        parsed = r.data;
      }
      if (!Array.isArray(parsed) || !parsed.length)
        throw new Error("File harus berisi daftar baris.");
      for (const row of parsed) {
        for (const k of fields)
          if (row[k] === undefined || row[k] === "")
            throw new Error("Kolom wajib tidak lengkap: " + k);
        for (const k of fields.filter((k) => !k.startsWith("nama") && k !== "teks_utsmani")) {
          row[k] = Number(row[k]);
          if (!Number.isInteger(row[k])) throw new Error("Angka tidak valid pada " + k);
        }
      }
      setRows(parsed.map((r) => Object.fromEntries(fields.map((k) => [k, r[k]]))));
    } catch (err) {
      setRows([]);
      setMessage(err instanceof Error ? err.message : "File tidak dapat dibaca.");
    }
  }
  return (
    <section className="import-section">
      <h2>Impor referensi Al-Qur’an</h2>
      <p className="muted-note">
        Mushaf Madinah · 15 baris · 604 halaman. Impor surah sebelum ayat; cocokkan sampel dengan
        mushaf fisik sekolah.
      </p>
      <label>
        Data referensi
        <select
          value={target}
          onChange={(e) => {
            setTarget(e.target.value);
            setRows([]);
          }}
        >
          <option value="quran_surah">Surah</option>
          <option value="quran_ayat">Ayat</option>
        </select>
      </label>
      <label className="upload-area">
        <BookOpen />
        <strong>Pilih file CSV atau JSON</strong>
        <input type="file" accept=".csv,.json" onChange={(e) => void parse(e.target.files?.[0])} />
      </label>
      <p className="muted-note">Kolom: {fields.join(", ")}</p>
      {rows.length > 0 && (
        <>
          <h3>Pratinjau 10 baris pertama · {rows.length} baris</h3>
          <div className="data-table-wrap">
            <table>
              <thead>
                <tr>
                  {fields.map((k) => (
                    <th key={k}>{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 10).map((r, i) => (
                  <tr key={i}>
                    {fields.map((k) => (
                      <td key={k}>{String(r[k])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setMessage("");
              try {
                for (let i = 0; i < rows.length; i += 200) {
                  const part = rows.slice(i, i + 200);
                  const result =
                    target === "quran_surah"
                      ? await supabase
                          .from("quran_surah")
                          .upsert(part as Database["public"]["Tables"]["quran_surah"]["Insert"][])
                      : await supabase
                          .from("quran_ayat")
                          .upsert(part as Database["public"]["Tables"]["quran_ayat"]["Insert"][]);
                  if (result.error) throw result.error;
                }
                setMessage(`${rows.length} baris berhasil diimpor.`);
                setRows([]);
                await refresh();
              } catch (err) {
                setMessage(
                  (err instanceof Error ? err.message : "Impor gagal") +
                    ". Sebagian kelompok baris sebelumnya mungkin sudah tersimpan; impor ulang aman.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <Check />
            {busy ? "Mengimpor…" : "Simpan referensi"}
          </Button>
        </>
      )}
      <Notice message={message} />
    </section>
  );
}
