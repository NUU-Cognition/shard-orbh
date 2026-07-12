---
description: "Core `flint orbh` reference — turn dispositions, awaiting, session verbs, operator lifecycle, hygiene surfaces, and deeper references"
orbh-sessions:
  - "[[e07fc648-1ec0-4bf7-bc78-3de4e566702a]]"
  - "[[d1f03280-e10d-413f-a040-70c3a84feb66]]"
  - "[[25f11f9b-67f7-46e6-ad6d-3089b3131066]]"
---

# Knowledge: Flint OrbH CLI Reference

Run `flint orbh --help`, `flint orbh <cmd> --help`, and group help for the authoritative surface of the **installed binary**. A source checkout may be newer than that binary until it is rebuilt, so when implementing or documenting unreleased source, verify the command registrations in `apps/orbh-cli/src` as well. This file covers the verbs used inside a session and maps to deeper references.

## Where the Depth Lives

| File | Load when you need |
|------|--------------------|
| [[dev-knw-foh-profiles]] | Exact `runtime/profile` selection |
| [[dev-knw-foh-coordination]] | Peers, collected subagents, turn-correlated results, messages, rooms, and intervention |
| [[dev-knw-foh-page]] | Page, persistent waiter/attach, workflow state, jobs, and group barriers |
| [[dev-knw-foh-internals]] | Orb spool, lifecycle derivation, result streams, waiter lease, spaces, bundles, and repair |
| [[dev-knw-foh-orchestrator]] | Delegation patterns, recursive managers, and infrastructure janitor behavior |

## Lifecycle Orientation

- A session is a durable event-sourced Orb spool; a headless/subagent run is one **turn**.
- `workState` has five values: `working | needs-input | awaiting | finished | abandoned`.
- Every headless/subagent turn ends with `session return --finish` or `--await`; finish is the default.
- `awaiting` is dormant and wakeable, not terminal. Parked retention is how the compatibility layer shelves awaiting sessions; park and await are not different lifecycle meanings.
- A session may return many turn-level results. Collectors correlate to initiated runs, not session terminality.
- An exit without return is re-prompted at most twice; exhaustion becomes `failed-unreturned` and `awaiting`.
- Abandonment is reserved for explicit operator verdicts such as discard/kill paths.

## Session Commands

When `ORBH_SESSION_ID` is set, omit your own ID:

```bash
flint orbh session register "<title>" "<description>"
flint orbh session set <key> <value>
flint orbh session get <key>
flint orbh session return --finish "<result markdown>"
flint orbh session return --await "<result markdown>"
flint orbh session ask "<question>" [--timeout <seconds>]
flint orbh session note "<text>"
flint orbh artifact <id> "<path>"
```

Explicit form is `flint orbh session <id> <action> [value...]`. `--finish` and `--await` are mutually exclusive. Omitting both on `return` means finish.

### Return Is the Turn Seam

`return` stores the payload on the current run and records the disposition. The harness may still be alive for a moment, but the durable run already carries its result and `returned` end reason. On process exit:

- finish self-shelves an unattended session as finished and tears down its waiter;
- await self-shelves it as awaiting/parked and preserves the persistent waiter;
- a pending deferred request remains `needs-input`;
- no return enters the bounded re-prompt path.

Terminal stdout is not a deliverable. Consumers read with:

```bash
flint orbh result <id>                 # latest returned turn
flint orbh result <id> --run <n>       # specific 1-based run
flint orbh inspect <id> --results
```

### Ask, Notes, and Interface Keys

`session ask` records a blocking request, suspends the live run, and returns the human response on stdout. Use it only when a headless root genuinely cannot proceed; subagents return blockers to their dispatcher. `note` appends an annotation without changing lifecycle.

Common free-form keys are `phase`, `progress`, `blockers`, `artifacts`, and `confidence`. Leave `core:*` slices to Orbh/Page internals.

### Event Subscription (`session await`)

This is unrelated to the `--await` turn disposition. It subscribes to server events:

```bash
flint orbh session await --list
flint orbh session await <eventType> [--filter <key=value>] [--timeout <seconds>]
```

It requires the Orbh server. Use Page/waiter delivery for ordinary session coordination.

## Results and Collection

```bash
flint orbh request -q <runtime/profile> "<prompt>"
flint orbh request -q -c <id> "<follow-up>"
flint orbh wait <id1> [id2...] [--timeout <seconds>]
flint orbh result <id> [--run <n>]
```

`request` and `wait` block on turn-correlated outcomes. Await/park and rescue runs remain pending; kill derives abandonment, which resolves collection as `abandoned`. A command timeout stops waiting while the collector outcome remains `pending`. Use background execution. See [[dev-knw-foh-coordination]].

## Operator Lifecycle Verbs

These are operator/session-retention controls, not substitutes for a headless agent's normal return discipline:

```bash
flint orbh close [id] [--obsidian]
flint orbh park [id] [--until-group <g>] [--barrier-timeout <s>] [--obsidian]
flint orbh discard [id] [--obsidian]
flint orbh end [id] [--result <text>] [--to <spaceId>] [--no-promote] [--require-promote] [--no-close] [--no-kill]
```

| Verb | Meaning |
|------|---------|
| `close` | Terminal finished + closed retention; terminates harness and waiter. |
| `park` | Legacy await spelling; awaiting/parked retention, persistent waiter survives. `--until-group` adds the all-terminal job-group condition to the standard wake set. |
| `discard` | Tombstones the entry, records abandonment, terminates harness and waiter. |
| `end` / `x` | Finishes, promotes by default, closes/terminates, and tears down terminal obligations. |

The default close/park/discard path is Obsidian-independent; `--obsidian` selects a bound terminal-tab path.

## Page, Waiter, and List Hygiene

```bash
flint orbh page
flint orbh page arm [id] [--max-wait <seconds>]
flint orbh list [--print] [--wide] [--subagents]
flint orbh list --status awaiting
```

`page arm` is a one-shot attach to the persistent waiter for live-turn latency. `list` renders dispatch trees by default and gives awaiting sessions their own section with duration and last-woken provenance. `ORBH_AWAITING_DORMANCY_DAYS` defaults to 7. A missing/dead unattended waiter lease raises Page hygiene and is repaired by the orchestrator.

The hidden internal command is `flint orbh waiter run <id>`. It is the persistent-waiter process entrypoint; agents/operators should not invoke it manually—use normal launch/return and `orchestrator ensure` for repair.

## Notes

- `--path <dir>` is accepted broadly to override Flint discovery.
- Verify/repair commands and current caveats live in [[dev-knw-foh-internals]].
- Bare `launch` creates a peer; `request` creates a collected subagent. Do not interchange them.
