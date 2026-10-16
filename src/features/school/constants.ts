export const schoolName = "Sekolah Tahfidz Hidayah Qur'an";
export const schoolAddress =
  "Jl. Jahari No.36A, RT.4/RW.7, Sukabumi Sel., Kec. Kb. Jeruk, Kota Jakarta Barat, Daerah Khusus Ibukota Jakarta 11560";
export const roles = ["admin", "ustadz", "badal", "pengawas", "wali"] as const;
export function jakartaDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
const dayNames = ["minggu", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu"];
export const calendarTypes = {
  libur: "Libur",
  ujian_sekolah: "Ujian sekolah",
  kegiatan: "Kegiatan",
} as const;
/** Mirrors SQL public.hari_efektif for a single YYYY-MM-DD date. */
export function isEffectiveDay(
  date: string,
  schoolDays: string[] | undefined,
  calendar: { tanggal: string; halaqah_id: string | null }[],
  halaqahIds: string[] = [],
) {
  const days = (
    schoolDays?.length ? schoolDays : ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"]
  ).map((d) => d.trim().toLowerCase());
  const weekday = dayNames[new Date(`${date}T00:00:00Z`).getUTCDay()]!;
  if (!days.includes(weekday)) return false;
  return !calendar.some(
    (k) => k.tanggal === date && (k.halaqah_id === null || halaqahIds.includes(k.halaqah_id)),
  );
}
export function pageHead(title: string, description: string) {
  return {
    meta: [
      { title: `${title} · Mutaba’ah STHQ` },
      { name: "description", content: description },
      { property: "og:title", content: `${title} · Mutaba’ah STHQ` },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  };
}
