// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import journal from "../../drizzle/migrations/meta/_journal.json";
const root = resolve(__dirname, "../..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
describe("Supabase migrations", () => {
  it("keeps supabase/migrations byte-identical to the drizzle journal", () => {
    const copies = readdirSync(resolve(root, "supabase/migrations")).sort();
    expect(copies).toHaveLength(journal.entries.length);
    journal.entries.forEach((e, i) => {
      expect(read(`supabase/migrations/${copies[i]}`)).toBe(
        read(`drizzle/migrations/${e.tag}.sql`),
      );
    });
  });
  it("passes every scenario in supabase/tests/rls_test.sql", async () => {
    const db = new PGlite();
    await db.exec(read("src/test/supabase-shim.sql"));
    for (const e of journal.entries) await db.exec(read(`drizzle/migrations/${e.tag}.sql`));
    const passed: string[] = [];
    await db.exec(read("supabase/tests/rls_test.sql"), {
      onNotice: (n) => {
        if (n.message?.startsWith("LULUS")) passed.push(n.message);
      },
    });
    expect(passed.length).toBeGreaterThan(40);
    await db.close();
  }, 60000);
});
