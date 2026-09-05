# Phase 3: Verification

## Objective

Verify the full restructure end to end: type check, build, tests, route
reachability, and doc updates. This phase has no code changes to the app.

## Prerequisites

- Phase 2 complete (all pages, components, tests in place)

## Shared Context

See Global Context in `_index.md`. The build output goes to `astro/dist/`.
`npm run preview` serves the built site on `http://localhost:4321` (Astro default).
The decision record is `idea/routing.md` (open item §7: `<html lang>` static
override on content pages — this plan implements it). Session context is
`.pi/CONTEXT.md`.

## Work Packages

### WP-11: Full verification and doc updates

**Context:**
All code changes are done. This WP runs the full verification suite and updates
the two docs. The `idea/routing.md` §7 open items list currently has three
unchecked items; the `<html lang>` one is now done. `.pi/CONTEXT.md` has a
"Current Task" section and a "Next Steps" list that must reflect the completed
restructure.

**Task:**
Run the verification commands, check the routes, and update the two docs.

**Files:**

- `idea/routing.md` — MODIFY — check off the `<html lang>` open item
- `.pi/CONTEXT.md` — MODIFY — mark the restructure done, update Next Steps

**Constraints:**

- DO: Run, in order:

```bash
cd astro && npx astro check
cd astro && npm run build
cd astro && npm test
```

- DO: Verify build output routes:

```bash
ls astro/dist/books/andanzas/ | head -5
ls astro/dist/words/pronouns/
test -f astro/dist/index.html
```

- DO: Serve and probe every route (start preview in the background, then curl):

```bash
cd astro && npm run preview &
sleep 3
for p in / /books/andanzas/ /books/andanzas/prologo /books/andanzas/recuerdo-de-la-granja-de-moreruela /words/pronouns/; do
  echo "$p -> $(curl -s -o /dev/null -w '%{http_code}' http://localhost:4321$p)"
done
```

  Expected: every route prints `200`. Then stop the preview server
  (`powershell -Command "Get-NetTCPConnection -LocalPort 4321 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"` or Ctrl-C if run in foreground).

- DO: `idea/routing.md` — in §7, change `- [ ] \`<html lang>\` static override on content pages` to `- [x] \`<html lang>\` static override on content pages (done 2026-09-05, plan restructure-routing)`
- DO: `.pi/CONTEXT.md` — update the "Current Task" section to state the URL
  restructure is DONE (chooser at `/`, `/books/[book]/` landing, generic reader,
  `/words/pronouns/` lesson, `lang` fields, `<html lang>` fix); remove the
  "Redo app URL structure" item from "Next Steps" (keep the remaining items);
  add a line in "Completed This Session" for the restructure.
- DO NOT: Deploy (user-driven, not part of this plan)
- DO NOT: Run the Lighthouse/audit skills — that is a separate user-driven polish stage
- DO NOT: Change any app code in this WP

**Success:**

- [ ] `cd astro && npx astro check` → exit 0
- [ ] `cd astro && npm run build` → exit 0
- [ ] `cd astro && npm test` → exit 0 (all tests pass)
- [ ] `ls astro/dist/books/andanzas/` contains `index.html` and 41 chapter files
- [ ] `ls astro/dist/words/pronouns/` contains `index.html`
- [ ] All 5 curl probes print `200`
- [ ] `grep -n "\[x\]" idea/routing.md` → ≥ 1 match (the lang item checked)
- [ ] `grep -n "restructure" .pi/CONTEXT.md` → ≥ 1 match (task marked done)
- [ ] `grep -n "Redo app URL structure" .pi/CONTEXT.md` → 0 matches (removed from Next Steps)

## Phase Verification

The WP-11 Success checks ARE the phase verification — this phase has a single WP.
If all checks pass, the plan is complete. Report the results to the user,
including the new URL list and a note that deployment is pending their go-ahead.
