---
description: "The Page family — on-demand session introspection, the armed pager, workflow state, background jobs, and the park-until-join barrier"
orbh-sessions:
  - "[[d1f03280-e10d-413f-a040-70c3a84feb66]]"
  - "[[521efa86-61d9-4156-92ba-c40ef56d9e3d]]"
---

# Knowledge: The Page, Jobs & Workflow State

Your session's on-demand introspection surface and the stateful slices it renders — see `(Spec) The Page`. A render runs the registered functions (core + installed shards' `page-functions:`) against the session store and concatenates their string output. Nothing is ever pushed into your mid-generation context; you read the Page at seams you judge useful: **first action of any resumed run**, **before ending a long turn**, **after a subagent batch**, and at workflow stage boundaries. Act on any `⚠` line. Interactive sessions additionally keep a pager **armed** (below) so Page-worthy events reach you as a push at turn boundaries.

```bash
flint orbh page                          # Render your own Page (self-targets; records the read)
flint orbh page <id>                     # Operator view of another session — read-only by default
flint orbh page --raw                    # Label each function's output by id (debugging)
flint orbh page --no-mutate              # Force read-only even on a self read
flint orbh page run <source>/<name> [args…]   # Invoke one function on demand (e.g. core/header, pgex/pin-set)
flint orbh page arm [--max-wait <s>]     # Agent-facing one-shot pager: hangs until something needs you — run it IN THE BACKGROUND (see below)
```

## Arm the Pager (`page arm`)

`page arm` is a hanging one-shot command: it watches your own session's spool on the filesystem (no server needed) and exits only when something needs your attention — an inter-session message or peer request arrives, one of your background jobs reaches a terminal state, request activity occurs, or a subscribed room has activity your notify policy cares about. **By default it hangs indefinitely — there is no heartbeat.** Pass `--max-wait <s>` explicitly if you want a bounded wait (its expiry then wakes with an elapsed-time line). On wake it prints a full **mutating** Page render (inbox drains exactly like a normal self read) plus a fixed re-arm footer, and the pager is no longer armed until you start a new waiter. Wake renders are event digests: they omit the working-tree hygiene warning (a plain `page` pull keeps it), never treat your own room posts/edits as wake-worthy, and honor room subscription changes made after arming (no re-arm needed on join/leave/policy change). (Task 182)

If the session ends while armed (`workState: finished|abandoned`) or is parked, the pager exits 0 with only `session ended — pager exiting`; it does not render the Page and does not print the re-arm footer. Run-end and retention finalization paths clear any `core:page-arm` lease, and resume/run-start clears stale leases before new work begins, so an old waiter cannot leave a false armed state behind.

Arm is not just an idle-wake: because the harness appends a completed background task's notification at your next tool-call seam **even mid-run**, an armed session receives messages as a **soft interrupt** — delivery within seconds, nothing killed, nothing lost. Verified for claude in both interactive and headless loops. Arm at session start regardless of mode; parked sessions don't need it (`--wake` covers them), and the delivery ladder is always softest-first: soft interrupt (armed) → wake (parked) → pull seams (unarmed) → hard `interrupt` (explicit escalation — see [[dev-knw-foh-coordination]]).

Run it with your harness's **native background execution** as part of session start. After every pager firing, **re-arm immediately as your mandatory first action** before reading, replying, planning, or doing any other work — the harness's background-task completion notification is what turns the exit into a push into your next turn. Reading the wake render is not enough: if you end your turn without re-arming, the session goes deaf, all inter-session communication queues invisibly, and the session is effectively over/unreachable from the rest of the system even though it still looks alive. Discipline is lease-guarded: arming writes a `core:page-arm` lease, a newer arm supersedes an older one harmlessly (the superseded waiter exits quietly without rendering), and the Page warns `⚠ paging not armed` whenever an active interactive/headless/subagent session's lease is missing or its process is dead. Parked and terminal sessions do not nag. Treat that warning as "re-arm now".

- **Self vs observer:** a render mutates (bumps the read counter, drains the inbox) only when `ORBH_SESSION_ID` matches the target. Observer reads never perturb the session's hygiene state.
- **Failure isolation:** a broken/slow shard function is skipped with a `⚠ <id> failed:` line; `page run` by contrast exits non-zero on failure.
- Page state lives in reserved `core:*` interface keys (`core:page`, `core:workflow`, `core:job:*`) — treat them as the Page's; use your own keys for `set`/`get`.

## Workflow State (`workflow`)

Records stateful workflow progress the Page renders (`core/workflow`, `core/workflow-idle`) — "where am I / what's next" survives context loss:

```bash
flint orbh workflow start <workflow-id> [--stages N] [--title T] [--next A] [--exit E] [--checklist "a;b;c"]
flint orbh workflow advance [--title T] [--next A] [--checklist "…"]   # stage +1 (or --stage N)
flint orbh workflow check <text>          # Tick a checklist item (substring match)
flint orbh workflow close [--outcome finished|abandoned]   # Clears the slice; records a closed marker
flint orbh workflow show                  # Dump the active slice as JSON
```

Closing with `finished` writes a `core:workflow:closed` marker; if you then never `return`, `core/return-discipline` nags on your next Page read. One active workflow per session.

## Background Jobs (`job`)

```bash
flint orbh job run "<command>" [--group <g>] [--timeout <s>]        # Detached background command; inherits your terminal env + ORBH_SESSION_ID
flint orbh job run --agent <runtime/profile> "<prompt>" [--group <g>] [--timeout <s>]
                                               # Dispatch a SUBAGENT as a job (wraps `request -q`; the subagent's return payload is the job output)
flint orbh job list                            # This session's jobs (also reaps dead-wrapper / timed-out jobs)
flint orbh job result <id>                     # Print a job's FULL retained output (works while running — output streams into the file)
flint orbh job wait <id> [--poll <ms>]         # Block until the job is terminal, then print its full output (exit 0 done, 1 failed)
flint orbh job clear [--all]                   # Remove terminal (or all) jobs from the Page + delete their retained outputs
```

Jobs self-report completion; `core/jobs` renders running/done/failed (failures first, group badges throughout). The Page shows an ~800-byte tail; the full output is retained **inside the launching scope** (`<orbRoot>/jobs/`, e.g. the Flint's `.orb/jobs/`) until `job clear`, and served by `job result <id>`. `job wait <id>` is the inline join for a single job when you want to stay live — it reaps while polling, so it can never hang on a job that will never report; for multi-job waits without holding a harness, use the park barrier below.

**Reaper.** No job can sit `running` forever: a job whose wrapper process died is marked `failed (wrapper died before reporting)`, and a job past its `--timeout` is marked `failed (timeout)` with its process group SIGTERMed. The reaper runs on every `job list` and continuously in the per-machine orchestrator.

### Park-Until-Join (the point of groups)

Register N jobs — commands and/or subagents — into one `--group`, then park on the barrier:

```bash
flint orbh job run --agent codex/55xh "review module A" --group fan
flint orbh job run --agent codex/55xh "review module B" --group fan
flint orbh job run "pnpm test" --group fan --timeout 1800
flint orbh park --until-group fan [--barrier-timeout <s>]
```

Parking terminates your harness — you hold no context and burn no tokens while waiting (strictly cheaper than N blocking `request -q` calls holding a live harness). The orchestrator monitors the group and auto-resumes your session when the **last** job reaches a terminal state. The barrier is **all-terminal, not all-success**: failures resolve it too and are surfaced first in the resume prompt, which carries every job's status + output tail (read full outputs with `job result <id>`). `--barrier-timeout` force-resolves a stuck barrier (running group jobs → `failed (barrier timeout)`) so you can never be stranded. Groups never auto-retry — retry is your explicit decision on resume. A plain `park` clears any leftover barrier directive.

## Cross-Session Writes

`workflow` and `job` accept `--session <id>` and will mutate **another** session's slices — this is deliberate (the store permits explicit-id coordination, exactly like `message send <id>` / `session set <id>`), and every mutation is an attributed, append-only event. The Page *render* path is the only surface with an observer read-only default. Mutate another session's workflow/jobs only as an orchestrator that owns that session.
