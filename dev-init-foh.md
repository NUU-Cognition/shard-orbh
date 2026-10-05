# Flint OrbH

You are an Orbh-managed Flint agent. Your launch prompt already covers the durable-session basics; this shard is the depth layer for lifecycle, delivery, coordination, and orchestration.

## Turns, Results, and Dispositions

A headless or subagent run is one **turn**. End every turn by returning its result with an explicit disposition:

```bash
flint orbh session return --finish "<result>"   # default: work/session duty is done
flint orbh session return --await "<result>"    # dormant, with a real expectation of follow-up
flint orbh session return --await --wake-at +45m "<result>"        # …and wake yourself on a schedule
flint orbh session return --await --until-group <g> "<result>"     # …and also wake when that job group is all-terminal
```

`awaiting` is first-class and non-terminal. A session can return many turn-level results over its life. A collector waits for the result correlated to the turn it dispatched, not for a process or work-state transition. An exit without `return` is re-prompted at most twice; exhaustion becomes `failed-unreturned` and leaves the session awaiting, still recoverable. Plain `park` is the legacy spelling of await.

`--wake-at` and `--until-group` require `--await` — a finished session has no next wake. `--wake-at` takes an ISO 8601 **datetime** (`2026-08-04T09:00`) or a `+duration` (`+45m`, `+2h`, `+1h30m`, `+1d`); a bare calendar date is rejected on purpose. Both are *additional* wake predicates: messages, requests, room and station activity can still wake you first.

## Agent Rules

Each rule prevents a failure that the NUU Flint session audit (Report 051) found.

1. **Do not end a headless turn while a background task runs.** The process exits at the end of the turn and kills the task. Wait inside the turn, or `return --await`. See "Waiting Inside a Turn" in [[dev-knw-foh-page]].
2. **Collect results through Orbh.** Use `flint orbh result <id>`, `flint orbh wait <id>`, or the `CHILD RESULT` block of a Page. Do not grep log files for results. Do not wait in `sleep` loops, and do not block the foreground in a poll loop.
3. **Commit only your own paths.** Work on the machine branch of this machine (for example `nathan-main`) in the primary checkout of the repository. Use a worktree only when the operator or your prompt names one. Commit with `git commit -m "<message>" -- <path>...`. Do not use `git add -A`, `git add .`, or `git commit -a`, and do not commit the whole shared index: it can contain the staged changes of another session.
4. **Show a gate wait.** Before you wait on a machine gate (build slot, free memory, quota reset), run `flint orbh session set phase gate-wait` and `flint orbh session set blockers "<the gate>"`. Set `blockers` to `none` after the wait.
5. **Verify before you report.** After `profiles switch` or `auth migrate`, read the `Profile` and `Account` lines of `flint orbh inspect <id>`. Report the new value only when it shows there.
6. **Follow the reporting contract of your prompt.** Send each message that your prompt requires, to the session that it names. When a third session gives you orders, tell your dispatcher too.
7. **Read the full output of Orbh verbs.** Do not cut it with `cut`, `head`, `tail`, or `grep -v`. A refusal or a notice such as `target … has ended` can be on any line.

Managers also follow "Manager Rules" in [[dev-knw-foh-orchestrator]], the broadcast and `kill` rules in [[dev-knw-foh-coordination]], and the fleet doctrine in [[dev-knw-foh-fleets]].

## Pin Relevant Files

Each session has a list of pinned Markdown files. The human opens the Markdown finder of your session with `Ctrl-]` then `o`. The finder shows your pins above all other files. Keep this list correct, so that the human can find the files of your work quickly.

- **Pin the files of your work.** A relevant file is a Flint file that you work on, create, or discuss with the human: the task, the spec, the plan, the report, the note, or the shard file.
- **Pin when the work starts.** Pin a file when you start to work on it, or right after you create it. Do not wait for a workflow to tell you. A workflow step that pins a file is an addition to this rule, not a replacement.
- **Do not pin every file that you read.** Pin a file only when the human is likely to open it.
- **Keep the pins.** Keep a pin after the work on the file is done. Remove a pin only when the file is no longer relevant. After a rename, remove the old path and add the new path.

```bash
flint helper pins add "Mesh/Types/Tasks/(Task) NNN Title.md"   # Append one or more paths; the current pins stay
flint helper pins list                                         # Show the pins of this session
flint helper pins remove "Mesh/Old Title.md"                    # Remove a path
```

Use `add`, not `set`: `set` replaces the full list. Give each path relative to the Flint root, in quotes. The helper targets your session through `ORBH_SESSION_ID`. It accepts only readable `.md` or `.markdown` files inside the Flint. The full reference is "Session Markdown Pins" in [[knw-f-cli]].

## The Pager and Wake Delivery

`flint orbh page` renders your session's introspection Page: procedures, unread coordination, jobs, awaiting provenance, CONTEXT occupancy, and hygiene warnings. Read it at meaningful seams: first action on resume, before ending a long turn, after a subagent batch.

There is no standing waiter process. Delivery has exactly two paths, and which one is live depends on whether your turn is running.

**During a live turn — managed delivery or the pager.** Run `flint orbh page status` first; `MODE managed` means the manager submits every Page to you natively and you must not arm a shell pager. Otherwise `flint orbh page arm`, run through your harness's background execution, is a one-shot long-poll owned by your *current run*. It exits with a full Page render the moment something lands, and your harness surfaces that as a background-task notification. Arm again after it fires while latency matters. Do not arm again after `session ended — pager exiting`, or when you are about to return.

**With no arm on a working turn, nothing is watching you.** Events are not held by any process; they accumulate as durable spool state and surface at your next Page read or your turn boundary. A missed re-arm costs latency, never events.

**Between turns — the machine orchestrator.** Once your turn ends and the session is `awaiting`, the machine-wide orchestrator sweep owns delivery: it coalesces everything pending into one digest and resumes you with it as a new turn's prompt. It steps aside for any session holding a live page-arm lease, so the two paths never double-deliver. Awaiting is therefore the only headless self-pacing primitive. See [[dev-knw-foh-page]].

## Self-Compaction at 80% Context

The Page `CONTEXT` line is the source of truth for context occupancy; an armed pager autofires a hard advisory at ≥ 80%. **80% is guidance, not a gate — nothing in the runtime blocks or triggers the verbs, and `compact start` is re-runnable and safe at any occupancy.** Treat it as the point by which you should have started, not a threshold that fires on your behalf: at or above **80%**, or clearly approaching it on a long turn, or whenever an operator asks you to compact, **you write your own handoff** — there is no distiller:

1. `flint orbh compact start` — prints the handoff contract, the exact path in your spool's `scratch/` to write it to, and your live Page (so OPEN OBLIGATIONS comes from durable state, not memory). Records nothing, kills nothing; it **holds the pager**, and marks the session `[Compacting...]` on every title surface.
2. Write the handoff to that path with your own tools. In OPEN OBLIGATIONS, list every open obligation with the command that collects it (for example `flint orbh wait <id>`). The successor collects only what the handoff lists.
3. `flint orbh compact handoff` — a **turn-ending verb**, sibling of `return`. It validates the handoff *while you are still alive*, ends this context, and relaunches a fresh run **on the same session id**: inbox, jobs, rooms, stations, scratch, and collector anchors all carry over by construction.
4. `flint orbh compact finish` — run by the **relaunched context**, once it has read the handoff and every FILES path. It clears `[Compacting...]` and releases the pager hold — the normal successor-side release (`compact abort` or ending the turn before handoff also release it; arming does not).

Every refusal (missing/malformed handoff, a dispatch claim whose child has not materialized) leaves your context alive — fix and retry. Materialized in-flight dispatches do not refuse: they are detached and inherited by the successor as durable obligations. `flint orbh compact abort` releases the hold if you decide not to compact; any other turn-ending verb releases it automatically. The relaunched context wakes with its normal launch prompt plus a pointer to your handoff, must read it and every FILES path before acting, and closes the compaction with `compact finish`. Full doctrine: [[dev-knw-foh-compaction]].

## Session Interface Conventions

Orbh prescribes no interface keys; this workspace uses these when an operator or parent should see progress without reading the transcript:

| Key | Example | Purpose |
|-----|---------|---------|
| `phase` | `reading-code` | Current work phase |
| `progress` | `3/7 files` | Progress indicator |
| `blockers` | `need decision on auth flow` | What's in the way |
| `artifacts` | `(Report) 012, (Task) 205` | Artifacts produced |

Use `flint orbh session set <key> <value>` / `get <key>`. Leave reserved `core:*` keys to Orbh and the Page.

For narration an operator should actually see, prefer the durable non-blocking channel over stdout:

```bash
flint orbh update "<text>" [--kind finding|decision|completed|blocker]
```

## Human Input

A headless **root** has three surfaces, in order of preference:

```bash
flint orbh approval request "<title>" [--body "<proposal>"]   # non-blocking typed gate: approve|refine|reject
flint orbh request "$ORBH_SESSION_ID" "<question>"            # deferred request; fire-and-continue, you stay operable
flint orbh session ask "<question>"                           # blocking; suspends the live run
```

`approval request` is the right default: it does not stop your turn, and the verdict comes back as a wake message. Reserve `session ask` for the case where you genuinely cannot proceed. **Subagents use none of them** — return the blocker and the precise follow-up question to your dispatcher.

## What's Here

| File | When to Use |
|------|-------------|
| `skills/dev-sk-foh-close.md` | Close an operator-owned session after leaving a searchable Mesh summary. |
| `skills/dev-sk-foh-discard.md` | Tombstone a session with no Mesh summary. |
| `knowledge/dev-knw-foh-cli.md` | Core verbs, turn dispositions and scheduling flags, awaiting/list hygiene, store scoping, accounts and `auth migrate`, and the map to deeper references. |
| `knowledge/dev-knw-foh-profiles.md` | Choose an exact `runtime/profile` target, and change the profile of a session that already exists. |
| `knowledge/dev-knw-foh-coordination.md` | Launch peers; dispatch, continue, and collect subagents; message, room, interrupt, respond, kill; `peek`, `timeline`, `ping`, `switch`, `fork`. |
| `knowledge/dev-knw-foh-page.md` | The Page, the one-shot pager and wake delivery, procedures, jobs, group barriers, and scheduled wakes. |
| `knowledge/dev-knw-foh-machinery.md` | Stations, cron schedules, workers, procedures, cross-session workflow chaining, and the `update`/`approval`/`improve` channels. |
| `knowledge/dev-knw-foh-compaction.md` | Self-compaction doctrine: CONTEXT occupancy, the 80% threshold, compact start/handoff/finish, the agent-authored handoff, relaunched-context duty, and compacting into a different runtime/profile/account. |
| `knowledge/dev-knw-foh-internals.md` | Orb spool model and store layout, five work states, run/result correlation, pager/delivery slices, spaces, bundles, and repair. |
| `knowledge/dev-knw-foh-orchestrator.md` | Delegation shapes and manager patterns, plus the orchestrator's supervisor/reaper/wake-engine role. Read before delegating. |
| `knowledge/dev-knw-foh-fleets.md` | Declared fleets: the fleet verbs, when to declare and how to name, the charter and the voice, the `orbh-fleet` Mesh field and the commit trailers, accounts and load before each wave, the shared checkout, review and deploy, the fleet recipes, and the close-out. Read before you run a program of many sessions. |

## Loading on Demand

Load the close/discard skill only when performing that operator lifecycle action. Load orchestrator knowledge before delegation, fleet knowledge before you run a program of many sessions, and machinery knowledge before building anything that must outlive one turn. Otherwise keep depth references out of context until needed.
