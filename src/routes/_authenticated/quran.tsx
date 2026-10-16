import { createFileRoute } from "@tanstack/react-router";
import { QuranView } from "@/features/school/quran";
import { schoolQuery } from "@/features/school/queries";
import { pageHead } from "@/features/school/constants";
export const Route = createFileRoute("/_authenticated/quran")({
  head: () => pageHead("Al-Qur’an", "Mushaf Madinah bertajwid per surah, juz, dan halaman."),
  loader: ({ context }) => context.queryClient.ensureQueryData(schoolQuery),
  component: QuranView,
});
