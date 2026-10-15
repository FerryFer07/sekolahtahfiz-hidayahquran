<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Application architecture
- Keep the TanStack Start file router and authenticated pathless layout; the foundation must remain compatible with the hosted Worker runtime.
- Store roles in user_roles and enforce all school access through database RLS and caller-scoped SQL helpers, never UI role checks alone.
- All schema changes go through tracked migrations with explicit grants and RLS; keep generated database types synchronized.
- Keep Quran reference data read-only except validated admin imports and compute verse-range line totals in database triggers.
- Use shared school UI and data modules for protected pages; keep privileged account creation in authenticated server functions with an admin check.
