---
description: "Core `flint orbh` reference — orientation, the verbs you use inside your own session (register, set/get, return, ask, note), end-of-life, and the map to the deeper knowledge files"
orbh-sessions:
  - "[[e07fc648-1ec0-4bf7-bc78-3de4e566702a]]"
  - "[[d1f03280-e10d-413f-a040-70c3a84feb66]]"
---

# Knowledge: Flint OrbH CLI Reference

The core reference for `flint orbh` — the verbs you call inside your own session, plus the map to the deeper references. Run `flint orbh --help`, `flint orbh <cmd> --help`, and group helps (`flint orbh space --help`, `flint orbh orchestrator --help`, `flint orbh session --help`) for the authoritative live surface. This doc mirrors the binary at HEAD.

## Where the Depth Lives

This file covers what every session needs. Load the deeper files on demand:

| File | Load when you need |
|------|--------------------|
| [[dev-knw-foh-profiles]] | Picking a `runtime/profile` target — the live profile set and when to use which |
| [[dev-knw-foh-coordination]] | Operating on **other** sessions — launch/resume, listing & inspection, `request`/`result`/`wait`, messages, `interrupt`, `respond`, `kill` |
| [[dev-knw-foh-page]] | The Page family — `page`, `page arm`, `workflow` state, background `job`s, park-until-join barriers |
| [[dev-knw-foh-internals]] | How it works underneath — the Orb spool data model, `workState`/run mechanics, spaces & spools, `save`/`restore`, maintenance & repair |
| [[dev-knw-foh-orchestrator]] | Delegation **patterns** — read before spawning subagents |

## Quick Orientation

- A **session** is an Orb spool (event-sourced; not a JSON file — see [[dev-knw-foh-internals]]).
- The lifecycle field is **`workState`** (4 values: `working | needs-input | finished | abandoned`).
- You **register**, do work, set interface keys, then **`return`** your result. `return` records a clean completion.
- An **operator** (human or manager) ends a session's life with `close` / `park` / `discard` / `end`.
- An **orchestrator agent** dispatches subagents with `request` / `launch` and collects with `result` / `wait` (see [[dev-knw-foh-coordination]]).

## Session Commands (called by agents)

These are the verbs you call from inside your own run. When `ORBH_SESSION_ID` is set, you may omit `<id>` for self-targeting actions (`register`, `status`, `return`, `set`, `get`, `ask`, `note`):

```bash
flint orbh session register "<title>" "<description>"      # Register: title + description
flint orbh session set <key> <value>                       # Write an interface key/value
flint orbh session get <key>                               # Read an interface key (stdout)
flint orbh session return "<result markdown>"              # Deliver your result + record completion
flint orbh session ask "<question>"                        # BLOCK until a human responds (stdout)
flint orbh session note "<text>"                           # Append an operator/agent annotation (does NOT change lifecycle)
flint orbh session status <enum>                           # Legacy: set workState via the status enum (prefer the direct verbs)
flint orbh result <id>                                     # Read a finished session's raw result (orchestrator use)
flint orbh artifact <id> "<path>"                          # Track a created artifact path in the interface
```

> Full form with explicit id: `flint orbh session <id> <action> [value...]`.

### The `return` Command — how you deliver output

When your work is done, call `return` with your full result as markdown. This:

1. Stores the result on the **current run**.
2. Records an explicit completion: run `endReason: returned` → **`workState: finished`**.

The human/orchestrator reads it via `flint orbh inspect <id> -r` or `flint orbh result <id>`. **Do not rely on terminal stdout** for your deliverable — always `return`.

> **Return discipline:** a clean exit *without* `return` lands the session in **`abandoned`** (revivable by resume, but with no deliverable), not `finished`. If you mean "done", `return`.

### The `ask` Command — blocking human input

`ask` blocks. When you call it:

1. A request is recorded (`orbh.request.asked`); `workState` → `needs-input` (`status: blocked`).
2. A macOS notification fires to the human.
3. The command polls until a human runs `flint orbh respond <id> "<text>"`.
4. The response is returned to stdout; you resume in-place.

```bash
response=$(flint orbh session ask "Found 3 issues. Fix all or just criticals?")
echo "Human said: $response"
```

Default timeout is 3600s; override with `--timeout <seconds>`. Use `ask` only when you genuinely cannot proceed without input.

### The `note` Command — append-only annotation

`note` appends an operator/agent annotation to the session's control log. It is purely additive and **never affects lifecycle** — use it to leave a breadcrumb without changing status.

### Interface Key Conventions

`set`/`get` write a free-form key/value interface you control entirely. Useful conventions:

| Key | Example Value | Purpose |
|-----|---------------|---------|
| `phase` | `reading-code` | Current work phase |
| `progress` | `3/7 files` | Progress indicator |
| `artifacts` | `(Report) 012, (Task) 205` | Artifacts produced |
| `blockers` | `need clarification on auth flow` | Current blockers |
| `confidence` | `high` | Confidence in work quality |
| `context-pressure` | `high` | Context window getting full |

Page state lives in reserved `core:*` interface keys (`core:page`, `core:workflow`, `core:job:*`) — treat them as the Page's; use your own keys for `set`/`get`.

## Operator End-of-Life Verbs

These finalize a session's life. They self-target via `ORBH_SESSION_ID` (id optional inside a harness).

```bash
flint orbh close [id]                  # Finish, title → [Closed], terminate the harness (terminal returns to the shell)
flint orbh park [id] [--until-group <g>] [--barrier-timeout <s>]
                                       # Finish, title → [Parked], pin to top of `orbh c` (resume auto-unparks), terminate the harness.
                                       # --until-group: the orchestrator auto-resumes this session when every job in the group is terminal
                                       #   (see [[dev-knw-foh-page]] → Background Jobs)
flint orbh discard [id]                # Tombstone the session (no confirmation) → workState abandoned, terminate the harness
flint orbh end [id]                    # (alias: x) Finish + PROMOTE the spool to the synced space + close/kill the harness
```

By default `close`, `park`, and `discard` are **Obsidian-independent**: they record their lifecycle state and then terminate the harness process (SIGHUP — the same signal a closing terminal tab delivers), which returns the terminal to the shell. Pass **`--obsidian`** to instead close the bound Obsidian terminal tab (the closing tab terminates the harness as a side effect). The `--obsidian` path is only meaningful for an interactive session with a discoverable tab binding.

| Verb | Records | Default termination | `--obsidian` |
|------|---------|---------------------|--------------|
| `close` | `workState: finished` + `session.closed`, title `[Closed]` | SIGHUP the harness | closes the bound tab |
| `park` | `finished` (parked) + pin, title `[Parked]` | SIGHUP the harness | closes the bound tab |
| `discard` | `session.discarded` tombstone → `abandoned` (**no confirmation**) | SIGHUP the harness | closes the bound tab |
| `end` / `x` | `run.ended` + `finished` + `session.closed` + promote | SIGTERM if no tab | closes the bound tab |

`end` flags: `--result <text>` (store a result on the run), `--to <spaceId>` (promotion target), `--no-promote`, `--require-promote` (fail rather than warn if promotion can't complete), `--no-close`, `--no-kill`. (`end` still defaults to closing a bound tab and falling back to a kill; it is unchanged.)

> **Headless note:** `close`, `park`, and `discard` record their state durably even with no live harness or tab, and never depend on Obsidian in the default path. `end` remains the verb when you also need spool promotion. Pattern: `return` ends the run with your deliverable; `end` finalizes + promotes.

## Notes & Caveats (current real behavior)

- **`session await`** appears in `session --help` for SSE event subscription, but at HEAD the action dispatcher rejects it (valid actions: `register, status, return, set, get, ask, note`). Treat `await` as not currently usable from the `session` verb; use `watch` to follow a transcript ([[dev-knw-foh-coordination]]).
- `--path <dir>` is accepted on most commands to override flint auto-detection.
- Maintenance/audit caveats (e.g. `verify-session <id>` being broken — use `verify-sessions`) live in [[dev-knw-foh-internals]].
