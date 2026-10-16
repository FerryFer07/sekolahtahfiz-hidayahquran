import { createFileRoute } from "@tanstack/react-router";

// migrate-helper — placeholder endpoint (replaces the requested edge function).
// Intentionally empty: no migration logic and no data are returned yet.
// Any real migration work added here must verify the caller is an admin
// before touching the database, because this endpoint is reachable over HTTP.
export const Route = createFileRoute("/api/migrate-helper")({
  server: {
    handlers: {
      GET: async () =>
        Response.json({
          ok: true,
          helper: "migrate-helper",
          ready: false,
          message: "migrate-helper is installed but has no logic yet",
        }),
    },
  },
});
