import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const calls: { table: string; payload: unknown }[] = [];
vi.mock("@/integrations/supabase/client", () => {
  const from = (table: string) => ({
    select: async () => ({ data: [], error: null }),
    upsert: (payload: unknown) => {
      calls.push({ table, payload });
      const result = { data: { id: "new-santri" }, error: null };
      return Object.assign(Promise.resolve(result), {
        select: () => ({ single: async () => result }),
      });
    },
  });
  return { supabase: { from, rpc: async () => ({ data: [], error: null }) } };
});
vi.mock("@/features/school/views", () => ({
  Notice: ({ message }: { message: string }) => (message ? <p role="status">{message}</p> : null),
  useSchool: () => ({
    data: { santri: [], halaqah: [{ id: "h1", nama: "Halaqah Abdurrahman bin Auf" }] },
    refresh: async () => {},
  }),
}));

import { StudentRegistry } from "@/features/school/students";

function renderRegistry() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <StudentRegistry />
    </QueryClientProvider>,
  );
}
// Label kolom pribadi memuat penanda "pribadi"; batasi pencarian ke form, bukan filter daftar.
const field = (label: string) =>
  within(document.querySelector("form")!).getByLabelText(new RegExp(`^${label}(pribadi)?$`));

describe("Data induk siswa", () => {
  beforeEach(() => {
    calls.length = 0;
  });

  it("opens the tab holding an empty required field instead of failing silently", async () => {
    renderRegistry();
    fireEvent.click(screen.getByRole("button", { name: /Tambah santri/ }));
    fireEvent.change(field("NIS"), { target: { value: "001" } });
    fireEvent.change(field("Nama lengkap"), { target: { value: "Santri Uji" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    expect(await screen.findByText(/Lengkapi kolom wajib di tab “Sekolah & tahfidz”/)).toBeTruthy();
    expect(field("Kelas").closest(".form-grid")?.hasAttribute("hidden")).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it("saves school identity to santri and personal data to santri_pribadi", async () => {
    renderRegistry();
    fireEvent.click(screen.getByRole("button", { name: /Tambah santri/ }));
    fireEvent.change(field("NIS"), { target: { value: "001" } });
    fireEvent.change(field("Nama lengkap"), { target: { value: "Santri Uji" } });
    fireEvent.change(field("NIK"), { target: { value: "3174000000000001" } });
    fireEvent.change(field("Kelas"), { target: { value: "2" } });
    fireEvent.change(field("Halaqah"), { target: { value: "h1" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    await waitFor(() => expect(calls).toHaveLength(2));
    const [santri, pribadi] = calls;
    expect(santri?.table).toBe("santri");
    expect(santri?.payload).toMatchObject({
      nis: "001",
      nama: "Santri Uji",
      kelas: "2",
      halaqah_id: "h1",
      status: "aktif",
      jalur: "tahfidz",
      jenis_kelamin: null,
    });
    expect(santri?.payload).not.toHaveProperty("nik");
    expect(pribadi?.table).toBe("santri_pribadi");
    expect(pribadi?.payload).toMatchObject({
      santri_id: "new-santri",
      nik: "3174000000000001",
      tanggal_lahir: null,
    });
    expect(pribadi?.payload).not.toHaveProperty("nis");
  });
});
