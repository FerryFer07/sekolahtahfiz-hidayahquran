import { createFileRoute } from "@tanstack/react-router";
import { SupervisorView } from "@/features/school/views";
import { schoolQuery } from "@/features/school/queries";
import { pageHead } from "@/features/school/constants";
export const Route = createFileRoute("/_authenticated/pengawas")({
  head: () => pageHead("Pengawasan", "Ringkasan setoran halaqah STHQ untuk pengawas."),
  loader: ({ context }) => context.queryClient.ensureQueryData(schoolQuery),
  component: SupervisorView,
});
