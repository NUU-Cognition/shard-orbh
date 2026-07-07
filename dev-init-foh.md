# Flint OrbH

You are an Orbh-managed Flint agent. Your launch prompt already oriented you — what Orbh is (the meta-harness: sessions, spools, workState, runs, the orchestrator), registering title + description, dispatching subagents with a background-run `request -q`, and (headless/subagent) `return` discipline. The launch prompts are `flint-interactive` for interactive sessions inside a Flint, and `orbh-headless` / `orbh-subagent` for headless and subagent launches. This shard is the **depth layer**: the operational knowledge deliberately kept out of the launch prompts, loaded on demand.

## The Page

`flint orbh page` renders your session's introspection Page — active workflow, unread inter-session messages, background jobs, and ⚠ hygiene warnings (unnamed session, stale description, missing `return`). It is pull-only: read it at meaningful seams (first action on resume, before ending a long turn, after a subagent batch) and act on what it flags. The full command family (`page`, `page run`, `workflow`, `job`) is documented in `knowledge/dev-knw-foh-page.md`.

**Push delivery — arm your pager.** `flint orbh page arm`, run in the background via your harness's background execution, long-polls your session and exits with a Page render the moment something needs you (message, finished job, request activity, or a max-wait heartbeat) — the background-task completion notification carries it into your run within seconds, even mid-turn. The pager is one-shot: after every firing, your mandatory first action is to re-arm it before reading, replying, planning, or doing any other work. If you miss that re-arm, the session goes deaf: all inter-session communication queues invisibly, and the session is effectively over/unreachable from the rest of the system even though it still looks alive. The Page warns `⚠ paging not armed` when your session has active work and no live waiter. See [[(Spec) Session Wake Delivery]], `dev-knw-foh-page.md` (arming), and `dev-knw-foh-coordination.md` (`--wake` for parked targets, the `interrupt` escalation verb) for the full delivery ladder.

## Session Interface Conventions

Orbh prescribes no interface keys; this workspace has conventions. Use them when an operator (or your parent session) should see where you are without reading your transcript:

| Key | Example | Purpose |
|-----|---------|---------|
| `phase` | `reading-code` | Current work phase |
| `progress` | `3/7 files` | Progress indicator |
| `blockers` | `need decision on auth flow` | What's in the way |
| `artifacts` | `(Report) 012, (Task) 205` | Artifacts produced |

`flint orbh session set <key> <value>` / `get <key>`. The Page's own state lives in reserved `core:*` keys — leave those alone.

## Human Input

Two verbs, by how long you can afford to wait (headless sessions only — interactive sessions just ask in the terminal; subagents use neither and `return` early instead):

- **Blocking:** `flint orbh session ask "<question>"` — records a request, notifies the human, polls until they `respond`, hands you the answer on stdout. Use only when you genuinely cannot proceed.
- **Deferred:** `flint orbh request "$ORBH_SESSION_ID" "<question>"` — records the question, marks the session `needs-input`, and lets your run end cleanly; a later `respond` auto-resumes the session with the answer.

## What's Here

| File | When to Use |
|------|-------------|
| `skills/dev-sk-foh-close.md` | When ending a session and leaving a searchable record. Writes `Mesh/Agents/<Runtime>/<session-id>.md` (summary + machine name), tracks the artifact, calls `return`, then `flint orbh close <id>` last (terminates the harness; returns the terminal to the shell — no Obsidian dependency). Do nothing after the close. |
| `skills/dev-sk-foh-discard.md` | When ending a session that should leave **no** record and drop out of `orbh list`. Tombstones the entry and terminates the harness. Do nothing after the discard. |
| `knowledge/dev-knw-foh-cli.md` | The core `flint orbh` CLI reference — your own session's verbs (`register`, `set`/`get`, `return`, `ask`, `note`), end-of-life, and the map to the deeper knowledge files. Start here for anything CLI. |
| `knowledge/dev-knw-foh-profiles.md` | Picking a `runtime/profile` launch target — the live profile set per runtime and which profile to use for which kind of task. |
| `knowledge/dev-knw-foh-coordination.md` | Operating on other sessions — launch/resume, listing & inspection, the `request`/`result`/`wait` dispatch surface, inter-session messages, `interrupt`, `respond`, `kill`. |
| `knowledge/dev-knw-foh-page.md` | The Page family — `page`, the armed pager, `workflow` state, background `job`s, and the park-until-join barrier. |
| `knowledge/dev-knw-foh-internals.md` | Session internals — the Orb spool data model, `workState`/run mechanics, spaces & spools, `save`/`restore` bundles, maintenance & repair. |
| `knowledge/dev-knw-foh-orchestrator.md` | Delegating to subagents in depth — the background-run blocking `request -q` pattern, follow-ups, parallel fan-out, and the park-until-join barrier. Read this before spawning subagents. |

## Loading on Demand

Load the close (or discard) skill when you intend to end the session. Load the orchestrator knowledge when you intend to delegate to subagents. Otherwise leave them out of context — the launch prompt has already taught you everything you need to operate.
