import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// migrate-helper — admin-only maintenance endpoint.
// Every request is authenticated and checked for the admin role BEFORE any
// database operation runs. Reads use the caller-scoped client (RLS applies).

const tables = [
  "profiles",
  "user_roles",
  "pengaturan_sekolah",
  "periode",
  "halaqah",
  "penugasan_badal",
  "santri",
  "wali_santri",
  "kehadiran",
  "setoran",
  "setoran_iqro",
  "quran_surah",
  "quran_ayat",
  "kalender_sekolah",
] as const;

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

async function requireAdmin(request: Request) {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return { error: json({ ok: false, error: "Konfigurasi server belum lengkap" }, 500) };
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || token.split(".").length !== 3)
    return { error: json({ ok: false, error: "Login diperlukan" }, 401) };
  const supabase = createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: `Bearer ${token}` },
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data: claims, error } = await supabase.auth.getClaims(token);
  const userId = claims?.claims?.sub;
  if (error || !userId) return { error: json({ ok: false, error: "Login diperlukan" }, 401) };
  const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError || !isAdmin) return { error: json({ ok: false, error: "Akses admin diperlukan" }, 403) };
  return { supabase, userId };
}

type Client = NonNullable<Awaited<ReturnType<typeof requireAdmin>>["supabase"]>;

async function status(supabase: Client) {
  const counts: Record<string, number | string> = {};
  for (const t of tables) {
    const r = await supabase.from(t).select("*", { count: "exact", head: true });
    counts[t] = r.error ? `error: ${r.error.message}` : (r.count ?? 0);
  }
  const pending: string[] = [];
  if (counts["quran_surah"] === 0) pending.push("Referensi surah belum diimpor");
  if (counts["quran_ayat"] === 0) pending.push("Referensi ayat belum diimpor");
  if (counts["pengaturan_sekolah"] === 0) pending.push("Pengaturan sekolah belum diisi");
  return { counts, pending };
}

async function verifySchema(supabase: Client) {
  const missing = [];
  for (const t of tables) {
    const r = await supabase.from(t).select("*", { head: true }).limit(1);
    if (r.error) missing.push({ table: t, error: r.error.message });
  }
  return { ok: missing.length === 0, checked: tables.length, missing };
}

export const Route = createFileRoute("/api/migrate-helper")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireAdmin(request);
        if (auth.error) return auth.error;
        return json({ ok: true, action: "status", ...(await status(auth.supabase)) });
      },
      POST: async ({ request }) => {
        const auth = await requireAdmin(request);
        if (auth.error) return auth.error;
        const body = (await request.json().catch(() => ({}))) as { action?: string };
        if (body.action === "status")
          return json({ ok: true, action: "status", ...(await status(auth.supabase)) });
        if (body.action === "verify_schema")
          return json({ action: "verify_schema", ...(await verifySchema(auth.supabase)) });
        return json(
          { ok: false, error: "Aksi tidak dikenal", actions: ["status", "verify_schema"] },
          400,
        );
      },
    },
  },
});
