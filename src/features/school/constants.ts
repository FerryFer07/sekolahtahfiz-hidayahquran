export const schoolName = "Sekolah Tahfidz Hidayah Qur'an";
export const schoolAddress = 'Jl. Jahari No.36A, RT.4/RW.7, Sukabumi Sel., Kec. Kb. Jeruk, Kota Jakarta Barat, Daerah Khusus Ibukota Jakarta 11560';
export const roles = ['admin', 'ustadz', 'badal', 'pengawas', 'wali'] as const;
export function jakartaDate(date = new Date()) { return new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(date); }
export function pageHead(title: string, description: string) { return {meta:[{title:`${title} · Mutaba’ah STHQ`},{name:'description',content:description},{property:'og:title',content:`${title} · Mutaba’ah STHQ`},{property:'og:description',content:description},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}; }
