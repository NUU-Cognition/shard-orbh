---
description: "Session internals — the Orb spool data model, the workState lifecycle, runs & endReason, spaces & spools, portable save/restore bundles, and maintenance/audit commands"
orbh-sessions:
  - "[[d1f03280-e10d-413f-a040-70c3a84feb66]]"
---

# Knowledge: Orbh Session Internals

How sessions work underneath — the event-sourced data model, the exact lifecycle mechanics, spool promotion across spaces, portable bundles, and the repair/audit surface. Load this when you need to reason about *why* a session is in a given state, move spools between machines/spaces, or repair a broken store. The everyday verbs live in [[dev-knw-foh-cli]].

## Data Model

There is **no** `.flint/sessions/<id>.json` file store. A session **is** an Orb spool: an **append-only, event-sourced** control log plus derived projections, stored under the Flint's `.orb/`.

```
.orb/
  spaces/<spaceId>/spools/
    <spoolId>.jsonl          # CONTROL PLANE: append-only CloudEvents log of orbh.session.*, orbh.run.*,
                             #   orbh.request.*, orbh.message.*, plus orb.spool.* / orb.run.*. The source of truth.
    <spoolId>.json           # SPOOL SNAPSHOT: the LIVE AgentSession projection — carries `ext.orbh.workState`
                             #   (live work-state), metadata, orbhInterface. Co-written with the .jsonl on EVERY
                             #   mutation (dual-write contract): fold(.jsonl) === .json always. Authoritative for
                             #   reads; re-fold (`rebuild-from-log`) is a repair/audit path, not the read path.
    <spoolId>/<threadId>.jsonl  # CONTENT PLANE: orb.thread.* / orb.message.* (the transcript). No control events here.
    <spoolId>/<threadId>.json   # thread snapshot
    <spoolId>/attachments/      # per-spool attachments
  indexes/orbh-sessions.json # DISPOSABLE session index — a cache rebuilt from control events; invalidated on every
                             #   mutation. Never authoritative.
~/.orb/blobs/sha256/...      # native-transcript bundle blobs (content-addressed)
```

Key consequences for agents:

- **Event-sourced.** Every fact (`register`, `set`, `return`, `ask`, lifecycle change) appends a control event. Nothing is edited in place.
- **`workState` is live on the snapshot.** The canonical lifecycle field is `workState`, carried on the `.json` snapshot's `ext.orbh` and co-written with the control log on every mutation (so it equals folding the log). Read the snapshot directly; a dead session reconciles to `abandoned` and never freezes at `working`.
- **The index is disposable.** It is a cache, rebuilt from control events — never treat it as truth. `verify-sessions` audits index health.

## Lifecycle: `workState`, run status, retention

`workState` has **4 values** and is the real lifecycle field:

| `workState` | Meaning |
|-------------|---------|
| `working` | Active; also the default for a just-created session with no run yet. |
| `needs-input` | A request is pending; open requests pin this regardless of run status. |
| `finished` | Explicit completion via agent `return`/`end` or operator `close`/`park`. |
| `abandoned` | Latest run ended without a completion fact; revivable by resume. |

> **Return discipline:** a clean process exit *without* a `return` lands in **`abandoned`** with no deliverable — it is **not** `finished`. If you mean "done", call `return`.

> **Interactive override (observed-over-declared):** for an **interactive** session with a live run, every view surface (`orbh list`, picker, summaries, Orbit) renders the *effective* workState derived from the observed run `activity`: spinner running → **`working`**, sitting idle at the prompt → **`needs-input`**. The declared workState is still the stored lifecycle fact; the override is read-side only (`effectiveSessionWorkState`). So for interactive sessions, `needs-input` means "waiting on the operator" — whether from an explicit `ask` or an observed idle prompt.

Retention is separate: `active | parked | closed`. `park` sets `finished + parked`; `close`/`end` set `finished + closed`; resume clears retention back to `active`. Titles stay raw; display titles are composed from mode (`(I)/(H)/(S)`), retention (`[Parked]/[Closed]`), and raw title.

## Runs and `endReason`

Each harness invocation (`launch`, `resume`) appends a **run**. A run records `machineId`, `orbRunId` (defaults to the run `id`), `nativeSessionId`, `nativeTranscriptPath`, and an interactive `activity` axis (`busy | idle`).

A run has `status: running | suspended | completed | failed`. `suspended` is live: the run is deliberately yielded on a blocking `ask`, and returns to `running` on answer. Terminal mapping:

| Event | Run status | Resulting `workState` |
|-------|------------|------------------------|
| `returned` / agent `return` | `completed` | `finished` |
| `exit-zero` + pending deferred request | `completed` | `needs-input` |
| `close` / `park` | `completed` | `finished` + retention |
| `exit-zero` with no return/request | `failed` | `abandoned` |
| `exit-nonzero` / `signal` / `hangup` / `spawn-failed` / `lost` / `unknown` | `failed` | `abandoned` |

`endReason` is observable-only (you read it; you don't set it). The takeaway is the same as above: **exit cleanly without `return` → `abandoned`, not `finished`.**

## Spaces & Spools

A spool is born in a **local** space (`local`, basis `machine`, not synced) and is **promoted** to a **synced** space (e.g. `flint`, basis `flint`, synced) to share it. The synced space is the "target".

```bash
flint orbh space list                   # List spaces in the active Orb root (id, basis, sync, spool count, born/target)
flint orbh space show [id]              # Show a space descriptor + spool count (defaults to the target space)
flint orbh space init <basis> [id]      # Register a space descriptor; basis = machine | user | flint; --sync / --no-sync
flint orbh promote [id]                 # Promote a local spool → resolved synced space (embeds native bundle, restamps space ids)
flint orbh promote [id] --to <spaceId>  # Promote to a specific space
flint orbh move-spool <spoolId> --to <spaceId> [--from <spaceId>]   # Move an arbitrary spool between spaces (restamped bundle)
```

- `end` **promotes by default** (use `end --no-promote` to skip).
- `promote` and `move-spool` overlap; `promote` resolves the synced target automatically, `move-spool` takes explicit `--from`/`--to` (default `--from local`).

## Portable Bundles: `save` / `restore`

```bash
flint orbh save [id]                          # Export a portable bundle: bundle.json + transcript.md + native rollout + orb/events.jsonl
flint orbh save [id] -o <dir>                 # Output dir (default: <cwd>/Exports/Orbh Bundles/<runtime>-<native-id>)
flint orbh save <nativeId> --runtime <rt>     # Treat <id> as a NATIVE session id of <rt>, bypassing the orbh store
flint orbh restore <bundleDir>                # Restore a bundle into THIS machine's native harness storage
flint orbh restore <bundleDir> --force        # Overwrite existing native files
```

> `restore` writes **native files only** — it does **NOT** re-register the session in orbh. A restored session is invisible to `list` until you `resume` it (which re-mints the orbh control session). Sessions track imported bundles in `rawNativeBundles[]`. `save` and `restore` are therefore not inverses at the control plane.

## Maintenance & Audit

```bash
flint orbh heal                         # Repair sessions stuck non-terminal (stale PIDs / orphaned runs)
flint orbh heal --dry-run               # Preview without writing
flint orbh verify-sessions              # Audit ALL canonical sessions + index health + promotion readiness
flint orbh verify-session <id>          # Audit ONE session (see caveat)
flint orbh rebuild --yes                # DESTRUCTIVE: wipe derived orb.* content, rebuild from native transcripts; keeps orbh.* control
flint orbh rebuild --dry-run            # Preview (default: previews unless --yes/--force)
flint orbh reset --yes                  # Alias of `rebuild`
```

- `rebuild`/`reset` destroy **derived** `orb.*` content and re-derive it from native transcripts; the `orbh.*` **control** plane is preserved. Both default to preview — `--yes` (or `--force`) is required to actually mutate. Also accept `--json`, `--runtime <name>`, `--cwd <dir>`.
- `verify-sessions` (all) classifies correctly. **`verify-session <id>` (single) is currently broken** — it reports canonical sessions as `missing` even when the index is usable. Prefer `verify-sessions` until fixed.
