import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { jakartaDate } from "@/features/school/constants";
const url = process.env["SUPABASE_URL"];
const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
const publicKey = process.env["SUPABASE_PUBLISHABLE_KEY"];
describe("Jakarta school dates", () => {
  it("uses Jakarta midnight rather than UTC", () => {
    expect(jakartaDate(new Date("2026-10-14T18:00:00Z"))).toBe("2026-10-15");
  });
});
const available = Boolean(url && key && publicKey);
describe.skipIf(!available)("School RLS", () => {
  const u = url || "",
    k = key || "",
    p = publicKey || "";
  const options = {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        const headers = new Headers(init?.headers);
        if (
          headers.get("Authorization") === `Bearer ${k}` ||
          headers.get("Authorization") === `Bearer ${p}`
        )
          headers.delete("Authorization");
        return fetch(input, { ...init, headers });
      },
    },
  };
  let admin: SupabaseClient<Database>;
  const users: string[] = [];
  const clients: Record<string, SupabaseClient<Database>> = {};
  let h = "",
    child = "",
    other = "",
    entry = "";
  beforeAll(async () => {
    admin = createClient<Database>(u, k, options);
    for (const role of ["admin", "ustadz", "wali", "badal", "pengawas"]) {
      const password = crypto.randomUUID() + "A1";
      const email = `rls-${crypto.randomUUID()}@example.com`;
      const result = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      if (result.error || !result.data.user) throw new Error("Test user setup failed");
      const id = result.data.user.id;
      users.push(id);
      await admin
        .from("user_roles")
        .insert({ user_id: id, role: role as Database["public"]["Enums"]["app_role"] });
      const c = createClient<Database>(u, p, {
        ...options,
        auth: { ...options.auth, storageKey: crypto.randomUUID() },
      });
      const login = await c.auth.signInWithPassword({ email, password });
      if (login.error) throw login.error;
      clients[role] = c;
    }
    const halaqah = await admin
      .from("halaqah")
      .insert({
        nama: "RLS test",
        tahun_ajaran: "2026/2027",
        ustadz_id: users[1] || "",
        pengawas_id: users[4] || "",
      })
      .select()
      .single();
    h = halaqah.data?.id || "";
    const students = await admin
      .from("santri")
      .insert([
        {
          nis: crypto.randomUUID(),
          nama: "Own test child",
          kelas: "1",
          jalur: "iqro",
          halaqah_id: h,
        },
        {
          nis: crypto.randomUUID(),
          nama: "Other test child",
          kelas: "1",
          jalur: "iqro",
          halaqah_id: h,
        },
      ])
      .select();
    child = students.data?.[0]?.id || "";
    other = students.data?.[1]?.id || "";
    await admin.from("wali_santri").insert({ wali_id: users[2] || "", santri_id: child });
    const r = await clients["ustadz"]
      ?.from("setoran_iqro")
      .insert({
        santri_id: child,
        tanggal: "2026-10-15",
        tempat: "sekolah",
        jilid: 1,
        halaman_dari: 1,
        halaman_sampai: 2,
        nilai: "lancar",
      })
      .select()
      .single();
    entry = r?.data?.id || "";
  }, 30000);
  afterAll(async () => {
    await admin.from("setoran_iqro").delete().in("santri_id", [child, other]);
    await admin.from("wali_santri").delete().eq("santri_id", child);
    await admin.from("santri").delete().in("id", [child, other]);
    await admin.from("penugasan_badal").delete().eq("halaqah_id", h);
    await admin.from("halaqah").delete().eq("id", h);
    for (const id of users) await admin.auth.admin.deleteUser(id);
  }, 30000);
  it("wali cannot read children before consent", async () => {
    const r = await clients["wali"]?.from("santri").select("*");
    expect(r?.data).toEqual([]);
  });
  it("wali can read only own child after consent", async () => {
    await clients["wali"]
      ?.from("profiles")
      .update({ persetujuan_data_pada: new Date().toISOString() })
      .eq("id", users[2] || "");
    const r = await clients["wali"]?.from("santri").select("id");
    expect(r?.data).toEqual([{ id: child }]);
  });
  it("wali cannot insert school entries", async () => {
    const r = await clients["wali"]
      ?.from("setoran_iqro")
      .insert({
        santri_id: child,
        tanggal: "2026-10-15",
        tempat: "sekolah",
        jilid: 1,
        halaman_dari: 1,
        halaman_sampai: 2,
      });
    expect(r?.error).toBeTruthy();
  });
  it("wali can insert home entries for own child", async () => {
    const r = await clients["wali"]
      ?.from("setoran_iqro")
      .insert({
        santri_id: child,
        tanggal: "2026-10-15",
        tempat: "rumah",
        jilid: 1,
        halaman_dari: 1,
        halaman_sampai: 2,
      });
    expect(r?.error).toBeNull();
  });
  it("wali cannot insert home entries for another child", async () => {
    const r = await clients["wali"]
      ?.from("setoran_iqro")
      .insert({
        santri_id: other,
        tanggal: "2026-10-15",
        tempat: "rumah",
        jilid: 1,
        halaman_dari: 1,
        halaman_sampai: 2,
      });
    expect(r?.error).toBeTruthy();
  });
  it("wali cannot edit school learning data", async () => {
    const r = await clients["wali"]
      ?.from("setoran_iqro")
      .update({ catatan: "Unauthorized change" })
      .eq("id", entry);
    expect(r?.error).toBeTruthy();
  });
  it("wali can paraf own school record", async () => {
    const r = await clients["wali"]
      ?.from("setoran_iqro")
      .update({ diparaf_oleh: users[2] || "", diparaf_pada: new Date().toISOString() })
      .eq("id", entry)
      .select()
      .single();
    expect(r?.error).toBeNull();
    expect(r?.data?.diparaf_oleh).toBe(users[2] || "");
  });
  it("pengawas is read only", async () => {
    const r = await clients["pengawas"]
      ?.from("kehadiran")
      .insert({ santri_id: child, tanggal: "2026-10-15", status: "hadir" });
    expect(r?.error).toBeTruthy();
  });
  it("badal cannot read outside assigned dates", async () => {
    await admin
      .from("penugasan_badal")
      .insert({
        halaqah_id: h,
        ustadz_id: users[3] || "",
        mulai: "2000-01-01",
        selesai: "2000-01-02",
      });
    const r = await clients["badal"]?.from("santri").select("*");
    expect(r?.data).toEqual([]);
  });
  it("badal can read during an active Jakarta assignment", async () => {
    await admin
      .from("penugasan_badal")
      .insert({
        halaqah_id: h,
        ustadz_id: users[3] || "",
        mulai: jakartaDate(),
        selesai: jakartaDate(),
      });
    const r = await clients["badal"]?.from("santri").select("id");
    expect(r?.data?.length).toBe(2);
  });
  it("wali cannot grant self admin", async () => {
    const r = await clients["wali"]
      ?.from("user_roles")
      .insert({ user_id: users[2] || "", role: "admin" });
    expect(r?.error).toBeTruthy();
  });
  it("anonymous users cannot read santri", async () => {
    const c = createClient<Database>(u, p, {
      ...options,
      auth: { ...options.auth, storageKey: crypto.randomUUID() },
    });
    const r = await c.from("santri").select("*");
    expect(r.data ?? []).toEqual([]);
  });
});
