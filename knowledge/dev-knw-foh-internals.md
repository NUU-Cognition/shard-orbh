---
description: "Session internals — Orb spools, five-state lifecycle, turns/results, collector correlation, persistent-waiter leases, spaces, bundles, and repair"
orbh-sessions:
  - "[[d1f03280-e10d-413f-a040-70c3a84feb66]]"
  - "[[25f11f9b-67f7-46e6-ad6d-3089b3131066]]"
---

# Knowledge: Orbh Session Internals

Load this when diagnosing lifecycle, result collection, waiter health, spool movement, or store repair. Everyday verbs live in [[dev-knw-foh-cli]].

## Data Model

A session is an event-sourced Orb spool, not a standalone session JSON file:

```text
.orb/
  spaces/<spaceId>/spools/
    <spoolId>.jsonl              # append-only control/event log: source of truth
    <spoolId>.json               # co-written live projection (ext.orbh)
    <spoolId>/<threadId>.jsonl   # transcript/content events
    <spoolId>/<threadId>.json    # thread projection
    <spoolId>/attachments/
  indexes/orbh-sessions.json     # disposable index/cache
  jobs/                          # retained job output in the launching scope
```

Every mutation appends an event and updates the spool projection. Re-folding/rebuilding is repair, not the normal read path. The session index is disposable.

## Lifecycle: Work State and Retention

`workState` has five values:

| State | Meaning |
|-------|---------|
| `working` | A live or recoverable turn is active; un-returned exits remain here while the reaper decides. |
| `needs-input` | A request is pending. |
| `awaiting` | Non-terminal dormancy after await/park or `failed-unreturned`; waiter remains standing. |
| `finished` | Explicit finish return or terminal close/end. |
| `abandoned` | Explicit abandonment such as discard/operator verdict. |

Retention is a separate shelf projection: `active | parked | closed | finished | error`. Await/legacy park derives awaiting + parked; unattended finish derives finished retention; resume returns retention to active. Park is therefore compatibility vocabulary, not a lifecycle distinct from await.

Interactive views additionally derive observed activity: busy is working; idle is needs-input unless live dispatch stamps keep the manager working. This is read-side only.

## Turns, Runs, and Results

Each headless/subagent harness invocation is one turn and one run. Runs carry `continuesRunId`, process/native identifiers, status, end reason, disposition, and result.

| Turn outcome | Run facts | Derived state |
|--------------|-----------|---------------|
| `return --finish` | result + `returned` + `finish` | `finished` |
| `return --await` | result + `returned` + `await` | `awaiting` |
| exit without return | no result/disposition; exit reason retained | `working` pending reaper |
| two failed re-prompts | `failed-unreturned` | `awaiting` |
| pending request | request fact; run may be suspended | `needs-input` |
| discard/operator abandonment | terminal control fact | `abandoned` |

Kill and interrupt suppress the un-returned re-prompt path because the caller owns what happens next.

A session's results form a stream. `result <id>` reads the latest returned run; `result <id> --run <n>` reads a 1-based historical run.

## Collector Correlation

Collectors record an anchor `{initiatedRunId, startedAt}` and find the first result on that run or its `continuesRunId` rescue chain. They do not subscribe to work state, retention, or process exit. The outcome enum is exactly a correlated `result`, `failed-unreturned`, `abandoned`, or `pending`. Timeout belongs to the waiting command, not the outcome enum: it stops waiting while the durable outcome remains pending.

This prevents await/park and crash/re-prompt transitions from impersonating a result. Kill is different: it records abandonment, so the collector resolves as `abandoned`. Live collector stamps live in `core:dispatches`; they drive fan-out caps and keep interactive managers visibly working.

## Persistent Waiter Internals

Every non-terminal headless/subagent session is a waiter obligation. Its detached waiter stores a session-lifetime lease under `core:page-arm/lease` containing PID, `machineId`, `armedAt`, and—on Linux—boot ID/process start identity plus a contender token. A run end must not clear this lease on await; terminal finish/close/discard/kill tears the process down and clears it.

`page arm` writes a separate one-shot attach lease (`core:waiter-attach`) and waits for the persistent waiter to write its output. Wake cursors/state are durable in `core:waiter-state`, so waiter restart catches up from the spool.

State-aware behavior is: deliver to a live attach, HOLD while working-unattached, resume awaiting with a coalesced digest, or tear down when terminal. The default coalescing window is 3000 ms (`ORBH_WAITER_DEBOUNCE_MS`).

The orchestrator scans all scopes, respawns dead/missing local waiter leases, ignores healthy remote-machine leases, and uses boot-safe liveness. Retry sweeps act only behind direct waiter delivery.

## Ancestry and Safety Caps

Collected dispatches store immediate `parentSessionId` plus metadata `orbhAncestry: {rootSessionId, depth}`. Bare peer launches explicitly suppress parent inference. Defaults are depth 5 and live fan-out 16, configured by `ORBH_DISPATCH_DEPTH_CAP` and `ORBH_DISPATCH_FANOUT_CAP`.

## Spaces and Spools

```bash
flint orbh space list
flint orbh space show [id]
flint orbh space init <basis> [id] [--sync|--no-sync]
flint orbh promote [id] [--to <spaceId>]
flint orbh move-spool <spoolId> --to <spaceId> [--from <spaceId>]
```

Sessions are born in a machine-local space and may be promoted to a synced target. `end` promotes by default.

## Portable Bundles

```bash
flint orbh save [id] [-o <dir>]
flint orbh save <nativeId> --runtime <rt>
flint orbh restore <bundleDir> [--force]
```

`restore` restores native harness files only; it does not re-register an Orbh control session. Resume the restored native session to mint/associate control state.

## Maintenance and Audit

```bash
flint orbh heal [--dry-run]
flint orbh verify [sessionId] [--json]
flint orbh verify-sessions [--json]             # deprecated alias for verify
flint orbh rebuild-session-snapshots [--json]
flint orbh rebuild [--dry-run|--yes] [--json] [--runtime <name>]
flint orbh reset [same options]                  # alias of rebuild
```

`rebuild`/`reset` reconstruct derived transcript events and require `--yes`/`--force` to mutate; Orbh control events are preserved. `rebuild-session-snapshots` re-folds the session projection from canonical control events.
