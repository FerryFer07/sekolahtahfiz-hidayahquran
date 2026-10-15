import { createFileRoute } from "@tanstack/react-router";
import { AdminView } from "@/features/school/views";
import { schoolQuery } from "@/features/school/queries";
import { pageHead } from "@/features/school/constants";
export const Route = createFileRoute("/_authenticated/admin")({
  head: () => pageHead("Administrasi", "Pengelolaan data sekolah dan akses akun STHQ."),
  loader: ({ context }) => context.queryClient.ensureQueryData(schoolQuery),
  component: AdminView,
});
