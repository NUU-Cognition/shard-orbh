---
description: "The Page family — introspection, the persistent waiter and live attach, awaiting hygiene, workflow state, jobs, and group barriers"
orbh-sessions:
  - "[[d1f03280-e10d-413f-a040-70c3a84feb66]]"
  - "[[521efa86-61d9-4156-92ba-c40ef56d9e3d]]"
  - "[[1e7717cf-c6b0-4706-a149-ed479bd341cd]]"
  - "[[25f11f9b-67f7-46e6-ad6d-3089b3131066]]"
---

# Knowledge: The Page, Waiter, Jobs & Workflow State

The Page is your session's on-demand introspection surface. It combines core and shard Page functions over the durable session store. Read it at meaningful seams: first action on resume, before ending a long turn, after a subagent batch, and at workflow boundaries. Act on `⚠` lines.

```bash
flint orbh page                               # Render your own Page; self reads may drain/update Page state
flint orbh page <id>                          # Read-only observer view of another session
flint orbh page --raw                         # Label each function's output by id
flint orbh page --no-mutate                   # Force a read-only self render
flint orbh page run <source>/<name> [args…]   # Invoke one Page function
flint orbh page arm [id] [--max-wait <s>]     # One-shot live attach; use background execution
```

## Persistent Waiter and Live Attach

Every headless/subagent session has one detached **persistent waiter** across all of its turns. It watches the Orb spool, re-derives wake predicates from durable state, and holds a session-lifetime lease in `core:page-arm`. The lease includes PID, machine identity, time, and—where supported—boot/process identity so reboot or PID reuse cannot masquerade as liveness.

`page arm` is a thin **attach** to that waiter, not the waiter itself. It hangs until delivery, prints a full mutating Page render, then exits. Use your harness's background execution so completion reaches the live turn as a soft notification. The attach is one-shot: attach again after delivery when lowest latency still matters. `--max-wait` is optional; without it the attach waits indefinitely.

The observable delivery model is:

| Session state | Attach | What happens |
|---------------|--------|--------------|
| `working` | present | Waiter delivers the render to the attach; the attach exits. |
| `working` | absent | Waiter **HOLDs** pending state until an attach arrives or the turn ends. |
| `awaiting` | irrelevant | Waiter debounces and resumes the session with one coalesced digest. |
| terminal | irrelevant | Waiter is torn down and its lease cleared. |

The default awaiting debounce is 3 seconds (`ORBH_WAITER_DEBOUNCE_MS`). Missing an attach changes latency only: events remain durable and arrive on a later attach or at the next turn boundary.

Interactive sessions retain their run-scoped pager behavior. For unattended modes, the persistent waiter is the standing actor and `page arm` only attaches to it.

## Hygiene and Awaiting Surfaces

- A headless/subagent Page warns `⚠ waiter not standing` when an active/awaiting session's persistent-waiter lease is absent or dead. Restart/ensure the orchestrator so its janitor repairs the lease.
- An awaiting Page renders `AWAITING since … · last woken by …`, derived from durable events.
- `flint orbh list` has a dedicated **Awaiting** section with awaiting duration and last-woken source; dispatch children are trees by default.
- Awaiting beyond `ORBH_AWAITING_DORMANCY_DAYS` (default 7) is flagged as a broken await-promise worth retiring.
- One attach per session is current; a newer attach quietly supersedes an older one.

Self Page reads may mutate Page counters and drain inbox state; observer reads do not. Page functions fail independently with a warning. Treat `core:*` interface slices as reserved.

## Workflow State

Workflow state survives context loss and renders on the Page:

```bash
flint orbh workflow start <workflow-id> [--stages N] [--title T] [--next A] [--exit E] [--checklist "a;b;c"]
flint orbh workflow advance [--stage N] [--title T] [--next A] [--checklist "…"]
flint orbh workflow check <text>
flint orbh workflow close [--outcome finished|abandoned]
flint orbh workflow show
```

One workflow is active per session. Closing it does not replace the turn's required `session return`.

## Background Jobs

```bash
flint orbh job run "<command>" [--group <g>] [--timeout <s>]
flint orbh job run --agent <runtime/profile> "<prompt>" [--group <g>] [--timeout <s>]
flint orbh job list
flint orbh job result <id>
flint orbh job wait <id> [--poll <ms>]
flint orbh job clear [--all]
```

An agent job wraps `request -q`; the subagent's correlated result becomes job output. `job result` can read retained output while running, and `job wait` blocks until terminal. The reaper marks dead wrappers and expired jobs failed. Groups are all-terminal barriers: failure resolves the barrier too, and retries remain explicit.

### Await a Job Group

`park --until-group` is the compatibility surface that adds the all-terminal job-group condition to the standard wake-on-anything set:

```bash
flint orbh job run --agent codex/solxh "review module A" --group fan
flint orbh job run --agent codex/solxh "review module B" --group fan
flint orbh job run "pnpm test" --group fan --timeout 1800
flint orbh park --until-group fan [--barrier-timeout <s>]
```

The barrier is additional, not exclusive: messages, requests, subscribed room activity, and terminal-job events can still wake the session before the whole group is terminal. The persistent waiter owns direct delivery; the orchestrator sweep is a retry net after a grace window. On wake, inspect `job list` and use `job result <id>` for full output. Plain `park` is legacy plain await and clears a stale barrier directive.

`workflow` and `job` accept `--session <id>` for explicit cross-session mutation. Use that only when you own orchestration of the target.
