# Flint OrbH

You are an Orbh-managed Flint agent. Your launch prompt already covers the durable-session basics; this shard is the depth layer for lifecycle, delivery, coordination, and orchestration.

## Turns, Results, and Dispositions

A headless or subagent run is one **turn**. End every turn by returning its result with an explicit disposition:

```bash
flint orbh session return --finish "<result>"   # default: work/session duty is done
flint orbh session return --await "<result>"    # dormant, with a real expectation of follow-up
```

`awaiting` is first-class and non-terminal. A session can return many turn-level results over its life. A collector waits for the result correlated to the turn it dispatched, not for a process or work-state transition. An exit without `return` is re-prompted at most twice; exhaustion becomes `failed-unreturned` and leaves the session awaiting, still recoverable. Plain `park` is the legacy spelling of await.

## The Page and Waiter Attach

`flint orbh page` renders your session's introspection Page: workflow state, unread coordination, jobs, awaiting provenance, and hygiene warnings. Read it at meaningful seams: first action on resume, before ending a long turn, after a subagent batch, and at workflow boundaries.

Every headless/subagent session has a detached **persistent waiter** for the session's lifetime. During a live turn, run `flint orbh page arm` through your harness's background execution to **attach** to that waiter. The attach is one-shot and gives the lowest-latency mid-turn delivery; attach again after it fires while latency matters. If no attach is present, the waiter holds durable events for a later attach or the next turn boundary.

Awaiting sessions need no attach: any Page-worthy event resumes them with a coalesced digest. A Page warning about a missing/dead waiter lease is a delivery-health problem for the orchestrator to repair, not an instruction to repeatedly arm a run-scoped pager. See [[dev-knw-foh-page]].

## Self-Compaction at 80% Context

The Page `CONTEXT` line is the source of truth for context occupancy; an armed pager autofires a hard advisory at ≥ 80%. **80% is guidance, not a gate — nothing in the runtime blocks or triggers the verbs, and `compact start` is re-runnable and safe at any occupancy.** Treat it as the point by which you should have started, not a threshold that fires on your behalf: at or above **80%**, or clearly approaching it on a long turn, or whenever an operator asks you to compact, **you write your own handoff** — there is no distiller:

1. `flint orbh compact start` — prints the handoff contract, the exact path in your spool's `scratch/` to write it to, and your live Page (so OPEN OBLIGATIONS comes from durable state, not memory). Records nothing, kills nothing; it **holds the pager**, and marks the session `[Compacting...]` on every title surface.
2. Write the handoff to that path with your own tools.
3. `flint orbh compact handoff` — a **turn-ending verb**, sibling of `return`. It validates the handoff *while you are still alive*, ends this context, and relaunches a fresh run **on the same session id**: inbox, jobs, rooms, stations, scratch, and collector anchors all carry over by construction.
4. `flint orbh compact finish` — run by the **relaunched context**, once it has read the handoff and every FILES path. It clears `[Compacting...]` and releases the pager hold. Nothing else does; arming no longer releases it.

Every refusal (missing/malformed handoff, live dispatches) leaves your context alive — fix and retry. `flint orbh compact abort` releases the hold if you decide not to compact; any other turn-ending verb releases it automatically. The relaunched context wakes with its normal launch prompt plus a pointer to your handoff, must read it and every FILES path before acting, and closes the compaction with `compact finish`. Full doctrine: [[dev-knw-foh-compaction]].

## Session Interface Conventions

Orbh prescribes no interface keys; this workspace uses these when an operator or parent should see progress without reading the transcript:

| Key | Example | Purpose |
|-----|---------|---------|
| `phase` | `reading-code` | Current work phase |
| `progress` | `3/7 files` | Progress indicator |
| `blockers` | `need decision on auth flow` | What's in the way |
| `artifacts` | `(Report) 012, (Task) 205` | Artifacts produced |

Use `flint orbh session set <key> <value>` / `get <key>`. Leave reserved `core:*` keys to Orbh and the Page.

## Human Input

Headless sessions can use `flint orbh session ask "<question>"` for blocking human input, or `flint orbh request "$ORBH_SESSION_ID" "<question>"` for a deferred request. Subagents do neither: return the blocker and precise follow-up question to their dispatcher.

## What's Here

| File | When to Use |
|------|-------------|
| `skills/dev-sk-foh-close.md` | Close an operator-owned session after leaving a searchable Mesh summary. |
| `skills/dev-sk-foh-discard.md` | Tombstone a session with no Mesh summary. |
| `knowledge/dev-knw-foh-cli.md` | Core verbs, turn dispositions, awaiting/list hygiene, and the map to deeper references. |
| `knowledge/dev-knw-foh-profiles.md` | Choose an exact `runtime/profile` target. |
| `knowledge/dev-knw-foh-coordination.md` | Launch peers; dispatch, continue, and collect subagents; message, room, interrupt, respond, and kill. |
| `knowledge/dev-knw-foh-page.md` | Page, persistent waiter/attach behavior, workflow state, jobs, and group barriers. |
| `knowledge/dev-knw-foh-compaction.md` | Self-compaction doctrine: CONTEXT occupancy, the 80% threshold, compact start/handoff/finish, the agent-authored handoff, relaunched-context duty. |
| `knowledge/dev-knw-foh-internals.md` | Orb spool model, five work states, run/result correlation, waiter lease, spaces, bundles, and repair. |
| `knowledge/dev-knw-foh-orchestrator.md` | Manager patterns plus the orchestrator's janitor/designated-survivor role. Read before delegating. |

## Loading on Demand

Load the close/discard skill only when performing that operator lifecycle action. Load orchestrator knowledge before delegation. Otherwise keep depth references out of context until needed.
