import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Plus, Search, Users, Phone, HeartPulse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { studentStatuses } from "./constants";
import { Notice, useSchool } from "./views";

type Santri = Database["public"]["Tables"]["santri"]["Row"];
type SantriInsert = Database["public"]["Tables"]["santri"]["Insert"];
type PribadiInsert = Database["public"]["Tables"]["santri_pribadi"]["Insert"];

type Field = {
  k: string;
  label: string;
  /** santri = identitas sekolah; pribadi = santri_pribadi (hanya admin/TU/kepsek). */
  table: "santri" | "pribadi";
  type?: "text" | "date" | "number" | "tel" | "textarea" | "select";
  options?: { id: string; nama: string }[];
  required?: boolean;
  pattern?: string;
  hint?: string;
};

const parentFields = (who: "ayah" | "ibu", label: string): Field[] => [
  { k: `nama_${who}`, label: `Nama ${label}`, table: "pribadi" },
  { k: `pekerjaan_${who}`, label: `Pekerjaan ${label}`, table: "pribadi" },
  { k: `pendidikan_${who}`, label: `Pendidikan ${label}`, table: "pribadi" },
  { k: `hp_${who}`, label: `No. HP ${label}`, table: "pribadi", type: "tel" },
];

const sixteenDigits = { pattern: "[0-9]{16}", hint: "16 digit angka" };
const nullableSantri = ["jenis_kelamin", "tanggal_masuk", "halaqah_id", "foto_path"];
const nullablePribadi = ["tanggal_lahir", "anak_ke", "jumlah_saudara"];

function useStudentTabs(halaqah: { id: string; nama: string }[]) {
  return useMemo(
    (): { key: string; title: string; fields: Field[] }[] => [
      {
        key: "identitas",
        title: "Identitas",
        fields: [
          { k: "nis", label: "NIS", table: "santri", required: true },
          { k: "nisn", label: "NISN", table: "santri", pattern: "[0-9]{10}", hint: "10 digit" },
          { k: "nama", label: "Nama lengkap", table: "santri", required: true },
          { k: "nama_panggilan", label: "Nama panggilan", table: "santri" },
          {
            k: "jenis_kelamin",
            label: "Jenis kelamin",
            table: "santri",
            type: "select",
            options: [
              { id: "L", nama: "Laki-laki" },
              { id: "P", nama: "Perempuan" },
            ],
          },
          { k: "tempat_lahir", label: "Tempat lahir", table: "pribadi" },
          { k: "tanggal_lahir", label: "Tanggal lahir", table: "pribadi", type: "date" },
          { k: "anak_ke", label: "Anak ke-", table: "pribadi", type: "number" },
          { k: "jumlah_saudara", label: "Jumlah saudara", table: "pribadi", type: "number" },
          { k: "nik", label: "NIK", table: "pribadi", ...sixteenDigits },
          { k: "no_kk", label: "Nomor KK", table: "pribadi", ...sixteenDigits },
        ],
      },
      {
        key: "alamat",
        title: "Alamat",
        fields: [
          { k: "alamat", label: "Alamat", table: "pribadi", type: "textarea" },
          { k: "rt", label: "RT", table: "pribadi" },
          { k: "rw", label: "RW", table: "pribadi" },
          { k: "kelurahan", label: "Kelurahan", table: "pribadi" },
          { k: "kecamatan", label: "Kecamatan", table: "pribadi" },
          { k: "kota", label: "Kota/Kabupaten", table: "pribadi" },
        ],
      },
      {
        key: "orang_tua",
        title: "Orang tua",
        fields: [
          ...parentFields("ayah", "ayah"),
          ...parentFields("ibu", "ibu"),
          { k: "nama_wali_lain", label: "Nama wali lain", table: "pribadi" },
          { k: "hubungan_wali", label: "Hubungan wali", table: "pribadi" },
          { k: "hp_wali", label: "No. HP wali", table: "pribadi", type: "tel" },
          { k: "kontak_darurat_nama", label: "Kontak darurat", table: "pribadi" },
          { k: "kontak_darurat_hp", label: "No. HP darurat", table: "pribadi", type: "tel" },
        ],
      },
      {
        key: "kesehatan",
        title: "Kesehatan",
        fields: [
          {
            k: "catatan_kesehatan",
            label: "Catatan kesehatan (alergi, kondisi khusus)",
            table: "pribadi",
            type: "textarea",
          },
        ],
      },
      {
        key: "sekolah",
        title: "Sekolah & tahfidz",
        fields: [
          {
            k: "kelas",
            label: "Kelas",
            table: "santri",
            type: "select",
            required: true,
            options: ["1", "2", "3", "4", "5", "6"].map((v) => ({ id: v, nama: v })),
          },
          { k: "tanggal_masuk", label: "Tanggal masuk", table: "santri", type: "date" },
          { k: "asal_sekolah", label: "Asal sekolah", table: "pribadi" },
          {
            k: "status",
            label: "Status",
            table: "santri",
            type: "select",
            required: true,
            options: studentStatuses.map((v) => ({ id: v, nama: v })),
          },
          { k: "halaqah_id", label: "Halaqah", table: "santri", type: "select", options: halaqah },
          {
            k: "jalur",
            label: "Jalur",
            table: "santri",
            type: "select",
            required: true,
            options: ["tahfidz", "iqro"].map((v) => ({ id: v, nama: v })),
          },
          { k: "catatan", label: "Catatan", table: "santri", type: "textarea" },
        ],
      },
    ],
    [halaqah],
  );
}

/** Data induk siswa (admin & TU): daftar dengan filter dan form bertab. */
export function StudentRegistry() {
  const { data, refresh } = useSchool();
  const qc = useQueryClient();
  const tabs = useStudentTabs(data.halaqah);
  const pribadi = useQuery({
    queryKey: ["santri_pribadi"],
    queryFn: async () => {
      const r = await supabase.from("santri_pribadi").select("*");
      if (r.error) throw r.error;
      return r.data;
    },
  });
  const [q, setQ] = useState("");
  const [kelas, setKelas] = useState("");
  const [status, setStatus] = useState("aktif");
  const [halaqah, setHalaqah] = useState("");
  const [editing, setEditing] = useState<Santri | "new" | null>(null);
  const [tab, setTab] = useState("identitas");
  const [values, setValues] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const rows = data.santri.filter(
    (s) =>
      (!kelas || s.kelas === kelas) &&
      (!status || s.status === status) &&
      (!halaqah || (halaqah === "-" ? !s.halaqah_id : s.halaqah_id === halaqah)) &&
      (!q ||
        [s.nama, s.nama_panggilan, s.nis, s.nisn].some((v) =>
          v.toLowerCase().includes(q.toLowerCase()),
        )),
  );
  const classes = [...new Set(data.santri.map((s) => s.kelas))].sort();

  function open(s: Santri | "new") {
    const p = s === "new" ? undefined : pribadi.data?.find((x) => x.santri_id === s.id);
    const merged: Record<string, unknown> =
      s === "new" ? { status: "aktif", jalur: "tahfidz" } : { ...p, ...s };
    setValues(
      Object.fromEntries(
        tabs
          .flatMap((t) => t.fields)
          .map((f) => [f.k, merged[f.k] == null ? "" : String(merged[f.k])]),
      ),
    );
    setEditing(s);
    setTab("identitas");
    setMessage("");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const fields = tabs.flatMap((t) => t.fields);
      const pick = (table: Field["table"], nullable: string[]) =>
        Object.fromEntries(
          fields
            .filter((f) => f.table === table)
            .map((f) => {
              const v = values[f.k] ?? "";
              if (nullable.includes(f.k) && v === "") return [f.k, null];
              return [f.k, f.type === "number" ? Number(v) : v];
            }),
        );
      const santri = pick("santri", nullableSantri) as unknown as SantriInsert;
      const id = editing && editing !== "new" ? editing.id : undefined;
      const saved = await supabase
        .from("santri")
        .upsert(id ? { ...santri, id } : santri)
        .select("id")
        .single();
      if (saved.error) throw saved.error;
      const personal = pick("pribadi", nullablePribadi);
      const hasExisting = pribadi.data?.some((x) => x.santri_id === saved.data.id);
      if (hasExisting || Object.values(personal).some((v) => v !== "" && v !== null)) {
        const r = await supabase
          .from("santri_pribadi")
          .upsert({ ...personal, santri_id: saved.data.id } as PribadiInsert);
        if (r.error)
          throw new Error(
            `Identitas sekolah tersimpan, tetapi data pribadi gagal: ${r.error.message}`,
          );
      }
      setEditing(null);
      setMessage("Data induk santri disimpan.");
      await Promise.all([refresh(), qc.invalidateQueries({ queryKey: ["santri_pribadi"] })]);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Data belum tersimpan.");
    } finally {
      setBusy(false);
    }
  }

  const current = tabs.find((t) => t.key === tab) ?? tabs[0]!;
  return (
    <>
      <div className="section-heading">
        <h2>Data induk siswa</h2>
        <Button onClick={() => open("new")}>
          <Plus />
          Tambah santri
        </Button>
      </div>
      <Notice message={message} />
      {pribadi.error && (
        <Notice message={`Data pribadi tidak dapat dimuat: ${(pribadi.error as Error).message}`} />
      )}
      {editing && (
        <form
          className="admin-form"
          onSubmit={save}
          onInvalidCapture={(e) => {
            // Kolom wajib bisa berada di tab tersembunyi: buka tab itu agar pesannya terlihat.
            const name = (e.target as HTMLInputElement).name;
            const owner = tabs.find((t) => t.fields.some((f) => f.k === name));
            if (owner && owner.key !== tab) {
              setTab(owner.key);
              setMessage(`Lengkapi kolom wajib di tab “${owner.title}”.`);
            }
          }}
        >
          <h3>{editing === "new" ? "Santri baru" : `Ubah · ${editing.nama}`}</h3>
          <div className="admin-tabs">
            {tabs.map((t) => (
              <Button
                key={t.key}
                type="button"
                variant={tab === t.key ? "default" : "ghost"}
                onClick={() => setTab(t.key)}
              >
                {t.title}
              </Button>
            ))}
          </div>
          {/* Semua tab tetap dirender (tersembunyi) agar validasi wajib-isi berlaku di seluruh form. */}
          {tabs.map((t) => (
            <div key={t.key} className="form-grid" hidden={t.key !== current.key}>
              {t.fields.map((f) => (
                <label key={f.k} className={f.type === "textarea" ? "span-full" : undefined}>
                  {f.label}
                  {f.table === "pribadi" && <small className="private-tag">pribadi</small>}
                  {f.type === "select" ? (
                    <select
                      name={f.k}
                      value={values[f.k] ?? ""}
                      required={f.required}
                      onChange={(e) => setValues({ ...values, [f.k]: e.target.value })}
                    >
                      <option value="">Pilih {f.label.toLowerCase()}</option>
                      {[
                        ...(f.options ?? []),
                        ...(values[f.k] && !f.options?.some((o) => o.id === values[f.k])
                          ? [{ id: values[f.k]!, nama: values[f.k]! }]
                          : []),
                      ].map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.nama}
                        </option>
                      ))}
                    </select>
                  ) : f.type === "textarea" ? (
                    <textarea
                      name={f.k}
                      value={values[f.k] ?? ""}
                      onChange={(e) => setValues({ ...values, [f.k]: e.target.value })}
                    />
                  ) : (
                    <input
                      name={f.k}
                      type={f.type ?? "text"}
                      value={values[f.k] ?? ""}
                      required={f.required}
                      pattern={f.pattern}
                      title={f.hint}
                      min={f.type === "number" ? 0 : undefined}
                      inputMode={f.pattern ? "numeric" : undefined}
                      onChange={(e) => setValues({ ...values, [f.k]: e.target.value })}
                    />
                  )}
                </label>
              ))}
            </div>
          ))}
          <p className="muted-note">
            Kolom bertanda “pribadi” hanya dapat dibuka admin, tata usaha, dan kepala sekolah.
            Ustadz hanya melihat kontak wali; catatan kesehatan hanya untuk wali ananda.
          </p>
          <div className="form-actions">
            <Button disabled={busy}>
              <Check />
              {busy ? "Menyimpan…" : "Simpan"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
              Batal
            </Button>
          </div>
        </form>
      )}
      <div className="history-filters">
        <label>
          Cari
          <span className="search-input">
            <Search size={16} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nama, NIS, atau NISN"
            />
          </span>
        </label>
        <label>
          Kelas
          <select value={kelas} onChange={(e) => setKelas(e.target.value)}>
            <option value="">Semua kelas</option>
            {classes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Semua status</option>
            {studentStatuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          Halaqah
          <select value={halaqah} onChange={(e) => setHalaqah(e.target.value)}>
            <option value="">Semua halaqah</option>
            <option value="-">Belum ada halaqah</option>
            {data.halaqah.map((h) => (
              <option key={h.id} value={h.id}>
                {h.nama}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="muted-note">
        {rows.length} dari {data.santri.length} santri
      </p>
      <div className="data-table-wrap">
        <table>
          <thead>
            <tr>
              <th>NIS</th>
              <th>Nama</th>
              <th>Kelas</th>
              <th>Halaqah</th>
              <th>Jalur</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <td>{s.nis}</td>
                <td>
                  {s.nama}
                  {s.nama_panggilan && <small className="muted-note"> · {s.nama_panggilan}</small>}
                </td>
                <td>{s.kelas}</td>
                <td>{data.halaqah.find((h) => h.id === s.halaqah_id)?.nama || "—"}</td>
                <td>{s.jalur}</td>
                <td>{s.status}</td>
                <td>
                  <Button variant="ghost" onClick={() => open(s)} disabled={pribadi.isLoading}>
                    Ubah
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <div className="empty-state">
            <Users />
            <h3>Tidak ada santri yang cocok</h3>
          </div>
        )}
      </div>
    </>
  );
}

/** Kontak wali dan catatan kesehatan; isi hanya muncul bila database mengizinkan pemanggil. */
export function StudentContactCard({ santriId }: { santriId: string }) {
  const contacts = useQuery({
    queryKey: ["kontak_wali_santri"],
    queryFn: async () => {
      const r = await supabase.rpc("kontak_wali_santri");
      if (r.error) throw r.error;
      return r.data;
    },
  });
  const health = useQuery({
    queryKey: ["kesehatan_santri"],
    queryFn: async () => {
      const r = await supabase.rpc("kesehatan_santri");
      if (r.error) throw r.error;
      return r.data;
    },
  });
  const c = contacts.data?.find((x) => x.santri_id === santriId);
  const h = health.data?.find((x) => x.santri_id === santriId);
  const people = c
    ? [
        [c.nama_ayah || "Ayah", c.hp_ayah],
        [c.nama_ibu || "Ibu", c.hp_ibu],
        [c.nama_wali_lain ? `${c.nama_wali_lain} (${c.hubungan_wali || "wali"})` : "", c.hp_wali],
        [c.kontak_darurat_nama ? `${c.kontak_darurat_nama} (darurat)` : "", c.kontak_darurat_hp],
      ].filter(([name, hp]) => name && hp)
    : [];
  if (!people.length && !h?.catatan_kesehatan) return null;
  return (
    <section className="student-contact">
      {people.length > 0 && (
        <div>
          <h3>
            <Phone size={16} /> Kontak wali
          </h3>
          <ul>
            {people.map(([name, hp]) => (
              <li key={hp}>
                {name} · <a href={`tel:${hp}`}>{hp}</a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {h?.catatan_kesehatan && (
        <div>
          <h3>
            <HeartPulse size={16} /> Catatan kesehatan
          </h3>
          <p>{h.catatan_kesehatan}</p>
        </div>
      )}
    </section>
  );
}
