---
description: "Session internals — Orb store layout and spools, five-state lifecycle, turns/results, collector correlation, pager and delivery slices, spaces, bundles, and repair"
orbh-sessions:
  - "[[d1f03280-e10d-413f-a040-70c3a84feb66]]"
  - "[[25f11f9b-67f7-46e6-ad6d-3089b3131066]]"
  - "[[0a96d4be-c368-430e-84a6-3ba0366bc6f8]]"
  - "[[09eafad7-61d5-4654-a0fe-b703803c366b]]"
  - "[[79de8b0a-567e-459f-a720-182c53f09b46]]"
---

# Knowledge: Orbh Session Internals

Load this when diagnosing lifecycle, result collection, delivery health, spool movement, or store repair. Everyday verbs live in [[dev-knw-foh-cli]].

## Data Model

A session is an event-sourced Orb spool, not a standalone session JSON file:

```text
.orb/
  manifest.json                  # {"schemaVersion":"1.0","kind":"orb-spool-tree-store"}
  spaces/<spaceId>/spools/
    <spoolId>.jsonl              # append-only control/event log: source of truth
    <spoolId>.json               # co-written live projection (ext.orbh)
    <spoolId>/<threadId>.jsonl   # transcript/content events
    <spoolId>/<threadId>.json    # thread projection
    <spoolId>/scratch/           # created with the spool; compaction handoffs land here
    <spoolId>/attachments/       # created on demand
  indexes/                       # orb-event-frontier.json, orb-spool-snapshot-locks, orbh-session-locks
  workflows/instances/           # workflow instance records; definitions/ holds static definitions
  procedures/                    # procedure step registers
  orbh.local/sweep-index/        # orchestrator sweep index, one file per session id
  jobs/                          # retained job output in the launching scope
  tmp/                           # launcher shims and scratch
```

Every mutation appends an event and updates the spool projection. Re-folding/rebuilding is repair, not the normal read path. Everything under `indexes/` is disposable cache and lock state.

Which store a command resolves to is worth confirming before any mutating verb in unfamiliar cwd: `flint orbh scope [--expect <dir>] [--json]` prints the resolution and its reason, creates nothing, and exits non-zero on an `--expect` mismatch. `--orb-root <dir>` (plus `--create-store`) overrides it explicitly.

## Lifecycle: Work State and Retention

`workState` has five values:

| State | Meaning |
|-------|---------|
| `working` | A live or recoverable turn is active; un-returned exits remain here while the reaper decides. |
| `needs-input` | A blocking `session ask` request is pending. Deferred requests are fire-and-continue and preserve lifecycle. |
| `awaiting` | Non-terminal dormancy after await/park or `failed-unreturned`; the orchestrator sweep owns the wake. |
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
| pending blocking request (`ask`) | request fact; run may be suspended | `needs-input` |
| discard/operator abandonment | terminal control fact | `abandoned` |

Kill and interrupt suppress the un-returned re-prompt path because the caller owns what happens next.

A session's results form a stream. `result <id>` reads the latest returned run; `result <id> --run <n>` reads a 1-based historical run.

## Collector Correlation

Collectors record an anchor `{initiatedRunId, startedAt}` and find the first result on that run or its `continuesRunId` rescue chain. They do not subscribe to work state, retention, or process exit. The outcome enum is a correlated `result`, `api-error`, `failed-unreturned`, `abandoned`, `hangup`, `adopted`, or `pending`; `pending` and `adopted` do not discharge the durable dispatch obligation. Timeout belongs to the waiting command, not the outcome enum: it stops waiting while the durable outcome remains pending.

This prevents await/park and crash/re-prompt transitions from impersonating a result. Kill is different: it records abandonment, so the collector resolves as `abandoned`. Live collector stamps live in `core:dispatches`, alongside `core:dispatch-obligations` and `core:dispatch-claims`; they drive fan-out caps and keep interactive managers visibly working.

## Pager and Wake-Delivery Internals

There is no per-session waiter process and no session-lifetime lease.

**`core:page-arm/lease`** is written *only* by a running `flint orbh page arm` process, as exactly `{ pid, runId, machineId, armedAt }`. No boot-id or process-start fields are written on any platform — the lease record type still declares them as optional, but nothing populates them. `runId` is load-bearing rather than legacy: it powers the one-arm self-guard (a second arm for the same live run no-ops), supersession detection (an arm whose durable lease stops matching its own exits `superseded`), and context-advisory autofire eligibility. Because the lease is run-scoped by construction, it appears only on `working` spools and is cleared on the arm's exit, on session end, on run finalization for interactive/terminal sessions, and on mode switch, close, discard, abandon, and park-for-interactive.

Two sibling keys share the slice: `held` — the compaction pager hold, taken by `compact start` and released by `compact finish`, `compact abort`, or any turn-ending `session return` — and `context-advisory-run`, which marks the run whose 80% context advisory has already fired.

**`core:waiter-state/delivery`** is the durable delivery cursor, and it is what makes arm → fire → re-arm lossless. Its shape is `{ terminalJobIds, deliveredChildResultRunIds, deliveredNoticeIds, deliveredStationItemIds, pendingRequestIds, answeredRequestIds, barrier, roomCursors }`. Note `deliveredStationItemIds`: **station items are a first-class wake source**, so a station-bound session is woken by queued work like any other event ([[dev-knw-foh-machinery]]).

**`core:event-delivery`** is the managed-delivery family, written by the Page pump of a manager that holds a harness event connection (interactive Codex and Claude, unattended Claude since Task 682, unattended Muse since Task 692, and unattended Codex on the Orbh Codex host since Task 702). Three keys, three questions: `connection` is the health of the link (`{ version: 2, runId, nativeSessionId, endpoint, pid, machineId, link, attachedAt?, changedAt, verifiedAt, error? }`, with `link` one of `connecting | attaching | connected | held | error | closed`); `receipt` is the outcome of the last Page (`{ version: 2, eventId, outcome: accepted | uncertain, at, source, evidence?: transport | transcript | operator, readAt?, nativeTurnId?, error? }`); `pending` is the one Page on its way, written once with `submitted: true` right before the transport call and cleared after the receipt and the cursor advance. One delivery is four events. `endpoint` is rewritten after attach, `changedAt` moves with `link`, and `verifiedAt` moves on a successful check at most every five minutes. A version 1 record (`status`, `checkedAt`) still reads. `flint orbh timeline` renders all of this under the `delivery` class.

**The delivery mode** (`page status` `MODE`) is computed across these slices: `held` from the compaction hold, `managed` from a live `connection` record (current run, this machine, live manager pid, link not `error` or `closed`), `shell-pager` from a live page-arm lease, else `unleased`. The four slices are one family with two legacy names: there is no waiter process behind `core:waiter-state`, and the compaction hold under `core:page-arm/held` is not an arm. The keys keep their names because a live orchestrator on older code reads the cursor; `core:waiter-attach` was dead code and was removed in Task 682.

Delivery to an awaiting session is owned by the machine orchestrator's awaiting-wake sweep, which refuses sessions that are no longer awaiting, are interactive, or are compacting, and defers to any live `page-arm` lease (including one held by another machine). See [[dev-knw-foh-orchestrator]] for the sweep inventory and cadences.

## Ancestry and Safety Caps

Collected dispatches store immediate `parentSessionId` plus metadata `orbhAncestry: {rootSessionId, depth}`. Bare peer launches explicitly suppress parent inference. Defaults are depth 5 and live fan-out 16, configured by `ORBH_DISPATCH_DEPTH_CAP` and `ORBH_DISPATCH_FANOUT_CAP`; cap failures report the chain and the requested depth/fan-out.

## Spaces and Spools

```bash
flint orbh space list
flint orbh space show [id]
flint orbh space init <basis> [id] [--sync|--no-sync]   # basis: machine | user | flint
flint orbh move-spool <spoolId> --to <spaceId> [--from <spaceId>]
```

One store, one space: sessions are born in the machine-local space `local` and stay there. `end` does not promote the spool, and the `promote` verb is gone. `flint` is the legacy git-synced session space. Session lookup reads only `local`, so move a legacy spool with `flint orbh move-spool <spoolId> --from flint --to local`. `space init` defaults its id to `local`, then `$ORBH_USER_SPACE_ID`, then `flint`.

## Portable Bundles

```bash
flint orbh save [id] [-o <dir>]                # export one session as a bundle directory
flint orbh save <nativeId> --runtime <rt>      # native-only bundle, bypassing the session store
flint orbh restore <bundleDir> [--force]       # native files only; prints a --fork-session resume
flint orbh import <bundleDir> [--force] [--account <name>] [--cwd <dir>]   # full session, SAME id
```

A bundle is a plain directory, not an archive: `bundle.json` (manifest, sha256 per file), `native/` (raw harness files for EVERY native session id across the session's runs — a compacted session has one per thread), `transcript.md`, and `orb/` (the spool event bundle: events, blobs, snapshot, plus `spool-scratch/` carrying agent-written scratch files such as compaction handoffs). Credentials never enter a bundle. Default destination: `<cwd>/.orbh/bundles/<runtime>-<nativeId>`.

`restore` lands only the `native/` half and forks the native session; it does not register an Orbh session. `import` is the cross-machine path (Task 655): it lands the `orb/` spool in this machine's local space under the SAME session id, writes the id→spool index entry, stamps a divergent identity from the manifest, clears foreign page-arm state, records an `imported` fact in `core:transfers`, re-pins the session to a THIS-machine account (`--account <name>`, else the same-name match against the pinned account), and restores the native files into that account's home without fork semantics — identical files skip by sha256, differing files refuse without `--force`. Every refusal fires before the first store write. A session id that already exists here refuses; `--force` replaces only a live spool at the bundle's own coordinates.

Semantics are copy, not move: work a session on one machine at a time — two diverged copies have no merge. Save after the session waits or finishes; an imported `working` run names a foreign dead pid until `reconcile` settles it. Machine to machine: `save <id> -o <dir>`, ship the folder, `import <dir>` on the other side, then `resume <id>`. The target account must already be signed in there (`auth` is separate; bundles carry the conversation, never the credential).

## Maintenance and Audit

```bash
flint orbh reconcile [--all] [--dry-run] [--grace <seconds>] [--json]
flint orbh heal [--dry-run] [--include-synced] [--allow-adapter-strip] [--json]
flint orbh verify [sessionId] [--json]
flint orbh verify-sessions [--json]             # deprecated alias for verify
flint orbh rebuild-session-snapshots [sessionId] [--dry-run] [--json]
flint orbh rebuild [--dry-run|--yes] [--json] [--cwd <dir>] [--runtime <name>]
flint orbh reset [same options]                  # alias of rebuild
```

`reconcile` marks this machine's dead `working` sessions abandoned via the event path (`run.ended` with `endReason: lost`), skipping runs younger than the grace (default 60 s) and, with `--all`, sweeping every discovered scope rather than the current one. It is the usual provenance of `abandoned`/`error` spools you encounter that nobody deliberately discarded.

`heal` repairs Data Layer conformance violations; `--include-synced` allows rewrites in synced/flint-tier spaces and `--allow-adapter-strip` deletes adapter data it cannot re-fold instead of refusing those spools. `rebuild`/`reset` reconstruct derived transcript events and require `--yes`/`--force` to mutate; Orbh control events are preserved. `rebuild-session-snapshots` re-folds the session projection from canonical control events, for one session or every spool in scope.
