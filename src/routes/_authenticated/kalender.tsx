import { createFileRoute } from "@tanstack/react-router";
import { CalendarView } from "@/features/school/views";
import { schoolQuery } from "@/features/school/queries";
import { pageHead } from "@/features/school/constants";
export const Route = createFileRoute("/_authenticated/kalender")({
  head: () => pageHead("Kalender Sekolah", "Libur, ujian sekolah, dan kegiatan STHQ."),
  loader: ({ context }) => context.queryClient.ensureQueryData(schoolQuery),
  component: CalendarView,
});
