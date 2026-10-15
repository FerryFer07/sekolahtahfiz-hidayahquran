import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
export const schoolData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context.supabase;
    const results = await Promise.all([
      c.from("profiles").select("*"),
      c.from("user_roles").select("*"),
      c.from("pengaturan_sekolah").select("*"),
      c.from("halaqah").select("*"),
      c.from("santri").select("*").order("nama"),
      c.from("kehadiran").select("*").order("tanggal", { ascending: false }),
      c.from("setoran").select("*").order("tanggal", { ascending: false }),
      c.from("setoran_iqro").select("*").order("tanggal", { ascending: false }),
      c.from("periode").select("*"),
      c.from("penugasan_badal").select("*"),
      c.from("wali_santri").select("*"),
      c.from("quran_surah").select("*").order("id"),
    ]);
    for (const r of results) if (r.error) throw new Error(r.error.message);
    return {
      userId: context.userId,
      profiles: results[0].data ?? [],
      roles: results[1].data ?? [],
      settings: results[2].data ?? [],
      halaqah: results[3].data ?? [],
      santri: results[4].data ?? [],
      attendance: results[5].data ?? [],
      entries: results[6].data ?? [],
      iqro: results[7].data ?? [],
      periods: results[8].data ?? [],
      badal: results[9].data ?? [],
      relations: results[10].data ?? [],
      surahs: results[11].data ?? [],
    };
  });
export const createAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      email: z.string().email(),
      nama: z.string().min(1),
      password: z.string().min(8),
      role: z.enum(["admin", "ustadz", "badal", "pengawas", "wali"]),
    }),
  )
  .handler(async ({ context, data }) => {
    const { data: admin, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (error || !admin) throw new Error("Akses admin diperlukan");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { nama: data.nama },
    });
    if (result.error) throw new Error(result.error.message);
    if (!result.data.user) throw new Error("Akun tidak dibuat");
    const role = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: result.data.user.id, role: data.role });
    if (role.error) {
      await supabaseAdmin.auth.admin.deleteUser(result.data.user.id);
      throw new Error(role.error.message);
    }
    return { ok: true };
  });
