import { createFileRoute } from "@tanstack/react-router";
import { EntryView } from "@/features/school/views";
import { schoolQuery } from "@/features/school/queries";
import { pageHead } from "@/features/school/constants";
export const Route = createFileRoute("/_authenticated/setoran")({
  validateSearch: (search: Record<string, unknown>) => ({
    santri: typeof search["santri"] === "string" ? search["santri"] : "",
  }),
  head: () => pageHead("Input setoran", "Catatan Sabaq, Sabaqi, Manzil dan Iqro santri STHQ."),
  loader: ({ context }) => context.queryClient.ensureQueryData(schoolQuery),
  component: Page,
});
function Page() {
  const { santri } = Route.useSearch();
  return <EntryView initial={santri} />;
}
