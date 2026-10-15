import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/features/school/auth";
import { pageHead } from "@/features/school/constants";
export const Route = createFileRoute("/")({
  head: () =>
    pageHead(
      "Masuk",
      "Mutaba’ah Tahfidz Sekolah Tahfidz Hidayah Qur’an Jakarta. Pendampingan hafalan santri bersama sekolah dan orang tua.",
    ),
  component: AuthPage,
});
