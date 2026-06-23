# Knowledge: Flint OrbH CLI Reference

Complete reference for `flint orbh` commands — the commands you use to register, communicate, and deliver work during a headless orbh session, and the commands an orchestrating agent uses to dispatch and collect subagents.

Run `flint orbh --help`, `flint orbh <cmd> --help`, and group helps (`flint orbh space --help`, `flint orbh orchestrator --help`, `flint orbh session --help`) for the authoritative live surface. This doc mirrors the binary at HEAD.

## Quick Orientation

- A **session** is an Orb spool (event-sourced; not a JSON file — see "Data Model" below).
- The lifecycle field is **`workState`** (8 values). The old `status` enum is a derived back-compat projection.
- You **register**, do work, set interface keys, then **`return`** your result. `return` records a clean completion.
- An **operator** (human or manager) ends a session's life with `close` / `park` / `discard` / `end`.
- An **orchestrator agent** dispatches subagents with `request` / `launch` and collects with `result` / `wait`.

## Profiles

Profiles are pre-configured runtime targets (model + reasoning effort + harness args). A target is `runtime/profile`, e.g. `claude/o48mx`. Profile resolution is **exact** — there is no fuzzy matching; an unknown profile name **errors**. Always discover real names with `flint orbh profiles`.

```bash
flint orbh profiles                              # List all profiles, grouped by runtime
flint orbh profiles claude                        # Filter to one runtime
flint orbh launch claude/o48mx "<prompt>"         # Launch with an explicit profile
flint orbh request -q claude/o48mx "<prompt>"     # Dispatch with an explicit profile
flint orbh launch claude "<prompt>"               # Bare runtime → uses that runtime's `default` profile if one exists, else no profile args
```

`flint orbh profiles update` pulls the latest shared `default.json` layer; `flint orbh profiles push` publishes it (maintainers only).

### Real Profile Names (verify with `flint orbh profiles`)

Profile names are **short codes**, not `runtime/tier` slugs. The set evolves as model families ship — always confirm live. As observed at HEAD:

| Runtime | Common codes | Notes |
|---------|--------------|-------|
| `claude` | `o48mx` (Opus Max), `o48xh` / `o48h` (Opus High), `o48m` (Opus Medium), `o48uc` (Opus Ultracode), `s461m` (Sonnet 1M), `f5h` / `f5m` / `f5mx` / `f5xh` / `f5uc` (Fable) | older families also present: `o46*`, `o47*` |
| `codex` | `54h` / `54xh` / `54m` (GPT-5.4), `55h` / `55xh` / `55m` / `55l` (GPT-5.5) | |
| `gemini` | `flash`, `pro` | |
| `grok` | `build-h` / `build-m` / `build-max` / `build-xh`, `c25` | |
| `opencode` | `fireworks-kimi`, `fireworks-minimax`, … | |

> WRONG names like `claude/opus-max`, `codex/high`, `claude/sonnet`, `codex/medium` **do not resolve** and will error. Use the codes from `flint orbh profiles`.

### Choosing a Profile (orchestrator guidance)

When dispatching subagents, pick by task:

| Task Type | Suggested target | Why |
|-----------|------------------|-----|
| Research, design, review, Mesh artifacts | `claude/o48mx` (or `o48xh`) | Strongest reasoning |
| Implement code, refactor, write tests | `codex/54xh` or `codex/55h` | Optimized for code edits |
| Fast / lightweight | `claude/s461m` | Lower cost |
| Parallel batch throughput | `codex/54m` / `codex/55m` | Good throughput |

## Data Model

There is **no** `.flint/sessions/<id>.json` file store. A session **is** an Orb spool: an **append-only, event-sourced** control log plus derived projections, stored under the Flint's `.orb/`.

```
.orb/
  spaces/<spaceId>/spools/
    <spoolId>.jsonl          # CONTROL PLANE: append-only CloudEvents log of orbh.session.*, orbh.run.*,
                             #   orbh.request.*, orbh.message.*, plus orb.spool.* / orb.run.*. The source of truth.
    <spoolId>.json           # SPOOL SNAPSHOT: reduced AgentSession projection (status, metadata, orbhInterface).
                             #   Note: stores the DERIVED `status` only — workState lives in events, not the snapshot.
    <spoolId>/<threadId>.jsonl  # CONTENT PLANE: orb.thread.* / orb.message.* (the transcript). No control events here.
    <spoolId>/<threadId>.json   # thread snapshot
    <spoolId>/attachments/      # per-spool attachments
  indexes/orbh-sessions.json # DISPOSABLE session index — a cache rebuilt from control events; invalidated on every
                             #   mutation. Never authoritative. Regenerate with `rebuild-session-index`.
~/.orb/blobs/sha256/...      # native-transcript bundle blobs (content-addressed)
```

Key consequences for agents:

- **Event-sourced.** Every fact (`register`, `set`, `return`, `ask`, lifecycle change) appends a control event. Nothing is edited in place.
- **`status` is derived.** Do not reason about a stored `status` field as the truth; the canonical lifecycle is `workState`, recomputed from run facts + operator/agent intent.
- **The index is disposable.** If `list` looks stale or wrong, `flint orbh rebuild-session-index` regenerates it. `verify-sessions` audits index health.

### Lifecycle: `workState` (first-class) vs `status` (derived)

`workState` has **8 values** and is the real lifecycle field. The legacy 7-value `status` is computed from it for back-compat (Obsidian, older readers):

| `workState` | Meaning | Derived `status` |
|-------------|---------|------------------|
| `queued` | Created, not yet running | `queued` |
| `working` | A run is active | `in-progress` |
| `needs-input` | A request is pending | `blocked` (or `deferred` if the pending request is deferred) |
| `dormant` | **Clean exit with NO completion fact — resumable.** (process exited / tab closed / PID lost without a `return`) | `deferred` |
| `finished` | **Explicit completion** via `return` (or `end`) | `finished` |
| `failed` | Unrecoverable error | `failed` |
| `cancelled` | Killed (`kill`) | `cancelled` |
| `abandoned` | Discarded (tombstoned via `discard`) | `cancelled` |

> **`dormant` vs `finished` is load-bearing.** A clean process exit *without* a `return` lands in **`dormant`** (resumable, no deliverable recorded) — it is **not** `finished`. Only an explicit `return` (or `end`) records `finished`. If you exit a run intending it to be "done", call `return` first or the work shows as `dormant`.

The agent-facing `session <id> status <enum>` verb is a **legacy front-end that sets `workState`**: `in-progress` → `working`, `blocked` → `needs-input`, `deferred` → `dormant`. Prefer the direct verbs (`register`, `set`, `return`) over `status` in new work.

### Runs and `endReason`

Each harness invocation (`launch`, `resume`) appends a **run**. A run records `machineId`, `orbRunId` (defaults to the run `id`), `nativeSessionId`, `nativeTranscriptPath`, and an `activity` axis. `inputSocket` is **legacy and always null** since Mission 004 — ignore it.

A run's terminal `endReason` drives `workState`:

| `endReason` | Resulting `workState` |
|-------------|------------------------|
| `returned` | `finished` |
| `exit-zero` (clean exit, no `return`) | **`dormant`** (resumable — NOT finished) |
| `exit-nonzero` | `failed` |
| `signal` / `hangup` / `lost` | `dormant` or `failed` per context |
| `cancelled` | `cancelled` |
| `spawn-failed` | `failed` |
| `unknown` | derived defensively |

`endReason` is observable-only (you read it; you don't set it). The takeaway is the same as above: **exit cleanly without `return` → `dormant`, not `finished`.**

## Launch & Resume (called by humans / launchers)

```bash
flint orbh launch claude/o48mx "<prompt>"                 # New headless session (preferred: explicit profile)
flint orbh launch codex/54xh "<prompt>"                   # New Codex session
flint orbh launch claude "<prompt>"                       # Bare runtime (uses claude's default profile if set)
flint orbh launch claude "<prompt>" --continues <id>      # New session, linked as a continuation of <id>
flint orbh launch claude "<prompt>" --max-turns <n>       # Cap agent turns
flint orbh launch claude "<prompt>" --title "<t>" --description "<d>"  # Pre-set (skips agent self-registration)
flint orbh resume <id> [prompt]                           # Resume a session — adds a new run (default prompt: "Continue working")
```

`launch` also accepts `--budget <usd>` and `--model <model>`. `target` is a runtime or `runtime/profile`; bare runtimes seen at HEAD include `agy, claude, codex, droid, grok, opencode`.

## Interactive Sessions (called by humans)

```bash
flint orbh i <target> [prompt]                  # Launch an interactive TUI (alias: interactive) with orbh tracking
flint orbh i claude --detachable "<prompt>"     # Detachable daemon: survives terminal close; detach/reattach below
flint orbh i claude -c <id>                      # Continue a previous orbh session interactively
flint orbh attach <id>                           # Attach to a detachable session (single client)
flint orbh attach <id> --steal                   # Take over a session attached elsewhere
flint orbh detach [id]                            # Detach the active client (agent keeps running); self-targets via ORBH_SESSION_ID
flint orbh continue [opts]                        # (alias: c) Pick a session interactively and continue it on its original profile
```

A **detachable interactive session** runs as a daemon you can detach from (Ctrl-\\ or `orbh detach <id>`) and reattach to (`orbh attach <id>`); it survives the terminal closing. `i` also accepts `--continues <id>` (new linked session), `--model`, `--dev-channels` (load dev MCP channels e.g. orbh), and `--close-after <seconds>` (bounded test runs). `continue|c` supports `-S/--status`, `-r/--runtime`, `-q/--search` pre-filters (the picker also has an in-menu `/` search); `--all` is deprecated/no-op.

## Listing & Inspection (called by humans)

```bash
flint orbh list                                 # List sessions (default: last 30)
flint orbh list -a                              # (--all) Show every session
flint orbh list -s                              # (--stats) Token usage + turn counts (reads transcripts)
flint orbh list -i                              # (--interactive) Live-refresh the list
flint orbh list -S in-progress                  # (--status) Filter by status
flint orbh list -r codex                        # (--runtime) Filter by runtime
flint orbh list -q "auth"                       # (--search) Search title/description/prompt (case-insensitive)
flint orbh inspect <id>                         # Detailed session view (stats, runs, requests)
flint orbh inspect <id> -r                      # (--results) Include run results
flint orbh stats <id>                           # Transcript stats — turns, tokens, tools, files
flint orbh stats <id> --files                   # Include full file paths
flint orbh watch <id>                           # Stream the live transcript
flint orbh watch <id> -v                        # (--verbose) Full thinking + tool output
flint orbh requests <id>                        # List all request/response pairs for a session
flint orbh requests <id> --pending              # Only unanswered requests
flint orbh result <id>                          # Print the raw result of a finished session (stdout only)
flint orbh runtimes                             # List discovered runtimes + resolved executables/versions
```

`list` accepts partial IDs everywhere a `<id>` is taken. `result` prints only the `return` payload, no formatting — use it to read a subagent's output into a variable.

## Session Commands (called by agents)

These are the verbs you call from inside your own headless run. When `ORBH_SESSION_ID` is set, you may omit `<id>` for self-targeting actions (`register`, `status`, `return`, `set`, `get`, `ask`, `note`):

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

> **Return discipline:** a clean exit *without* `return` lands the session in **`dormant`** (resumable, no deliverable), not `finished`. If you mean "done", `return`.

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

## Operator End-of-Life Verbs

These finalize a session's life. They self-target via `ORBH_SESSION_ID` (id optional inside a harness).

```bash
flint orbh close [id]                  # Finish, title → [Closed], terminate the harness (terminal returns to the shell)
flint orbh park [id]                   # Finish, title → [Parked], pin to top of `orbh c` (resume auto-unparks), terminate the harness
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

> **Headless note:** `close`, `park`, and `discard` record their state durably even with no live harness or tab, and never depend on Obsidian in the default path. `end` remains the finish-and-promote verb when you also need spool promotion. Pattern: `return` ends the run with your deliverable; `end` finalizes + promotes.

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
- After `promote`, the disposable index can drift until `rebuild-session-index`.

### Portable Bundles: `save` / `restore`

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
flint orbh rebuild-session-index        # Regenerate the disposable session index (cache only)
flint orbh verify-sessions              # Audit ALL canonical sessions + index health + promotion readiness
flint orbh verify-session <id>          # Audit ONE session (see caveat)
flint orbh rebuild --yes                # DESTRUCTIVE: wipe derived orb.* content, rebuild from native transcripts; keeps orbh.* control
flint orbh rebuild --dry-run            # Preview (default: previews unless --yes/--force)
flint orbh reset --yes                  # Alias of `rebuild`
```

- `rebuild`/`reset` destroy **derived** `orb.*` content and re-derive it from native transcripts; the `orbh.*` **control** plane is preserved. Both default to preview — `--yes` (or `--force`) is required to actually mutate. Also accept `--json`, `--runtime <name>`, `--cwd <dir>`.
- `verify-sessions` (all) classifies correctly. **`verify-session <id>` (single) is currently broken** — it reports canonical sessions as `missing` even when the index is usable. Prefer `verify-sessions` until fixed.

## Orchestration

There are **two** distinct things called "orchestration" — keep them apart:

1. **The per-machine orchestrator singleton** (`orchestrator|orch`) — an OS-level supervisor process.
2. **The manager-agent request/wait pattern** — how an *agent* dispatches and collects *subagents*.

### 1. The Orchestrator Singleton (`orchestrator` / `orch`)

A per-machine singleton (lock + pidfile + heartbeat) that **supervises interactive managers and reaps ungraceful deaths**. You rarely touch it directly; interactive launches auto-ensure it.

```bash
flint orbh orchestrator status            # Singleton state + supervised manager roster (--json)
flint orbh orchestrator managers          # (alias: ls) List managers in the registry (live only by default)
flint orbh orchestrator managers --all    # Include dead/stale entries
flint orbh orchestrator managers -i       # Pick a live manager and attach / detach / kill (needs a TTY)
flint orbh orchestrator reap              # Force-reap dead managers now (remove stale entries + signal orphaned groups)
flint orbh orchestrator ensure            # (alias: start) Ensure the singleton is up (lazily spawns it)
flint orbh orchestrator stop              # Stop the singleton (re-ensured on next interactive launch)
```

### 2. Manager-Agent Dispatch (`request` / `result` / `wait`)

This is the primitive an interactive or manager agent uses to dispatch subagents and collect their `return` output. **It is unrelated to the singleton above** — it just launches/resumes sessions and blocks on them.

```bash
flint orbh request -q claude/o48mx "<prompt>"     # Quiet dispatch — raw result only (use from agent bash)
flint orbh request -q codex/54xh "<prompt>"       # Quiet dispatch for coding tasks
flint orbh request -q -c <id> "<prompt>"          # Quiet CONTINUE — resume a session and wait for its result
flint orbh request claude/o48mx "<prompt>"        # Interactive dispatch (spinner + result box)
flint orbh request claude/o48mx "<prompt>" --stream   # Stream the live transcript while waiting
flint orbh result <id>                            # Read a finished session's raw result (stdout, no formatting)
flint orbh wait <id1> [id2...]                    # Block until all finish; print each result, labeled, in argument order
```

#### `request` — synchronous subagent dispatch

`request` is the primary orchestration primitive. Its **`<target>` argument is overloaded** — it dispatches to one of three modes:

- **Launch + wait** — `<target>` is a `runtime/profile` (e.g. `claude/o48mx`): creates a new session, spawns the harness, blocks until it finishes, prints the `return` output.
- **Resume + wait** — `-c <id>` (`--continue`): resumes an existing session and waits for its result (iterative work — dispatch, review, continue).
- **Deferred ask** — `<target>` is a session id and the text is a question: posts a deferred question to that session and **exits immediately** (no block). The session goes `needs-input`; a `respond` auto-resumes it.

> `--continue <id>` (resume + wait, same session) is different from `--continues <id>` (start a **new** session linked to `<id>`).

`request` also accepts `--max-turns`, `--budget`, `--model`, `--title`, `--description`, and `--timeout <seconds>`.

**Quiet mode (`-q` / `--quiet`):** when calling `request` from inside an agent (bash tool), **always pass `-q`** — without it you get spinners and formatted boxes that pollute your context. With `-q` you get only the raw result on stdout, identical to `result`.

> For the blocking dispatch/collect pattern below, do **not** add `--timeout` — these calls block intentionally until the subagent finishes.

#### `result` — raw result collection

Returns only the `return` payload of a finished session to stdout — no metadata, no formatting. Exits non-zero if the session isn't finished or has no result.

```bash
output=$(flint orbh result <id>)
```

#### `wait` — parallel result collection

Blocks until all listed sessions reach a terminal state, then prints each result labeled by id, **in the order the ids were given** (not completion order).

```bash
flint orbh launch codex/54xh "implement feature A" &   # returns immediately
flint orbh launch codex/54xh "implement feature B" &
# ... then collect:
flint orbh wait <id-A> <id-B>
```

## Inter-Session Messages

```bash
flint orbh message send <targetId> "<text>"     # Append a message to another session (records orbh.message.received on the target)
flint orbh message list <id>                    # List a session's message history
```

Messages are delivered lazily and persist on the target session's control log. Use them for asynchronous coordination between sessions.

## Responding to a Blocked Session (called by humans / managers)

```bash
flint orbh respond <id> "<text>"        # Answer a pending question on a session
```

If the pending request was a blocking `ask`, the asking agent's `ask` call returns the text and it resumes in-place. If it was a **deferred** request, `respond` **auto-resumes** the session with the answer.

## Killing a Session

```bash
flint orbh kill [id]                    # SIGTERM a running session (records run.ended + cancelled first); self-targets via ORBH_SESSION_ID
```

## Notes & Caveats (current real behavior)

- **`session await`** appears in `session --help` for SSE event subscription, but at HEAD the action dispatcher rejects it (valid actions: `register, status, return, set, get, ask, note`). Treat `await` as not currently usable from the `session` verb; use `watch` to follow a transcript.
- **`verify-session <id>`** (single) is broken — use `verify-sessions` (all).
- **`close`/`park`/`discard`** silently no-op on headless (no-tab) sessions — use `end` (see Operator End-of-Life Verbs).
- `--path <dir>` is accepted on most commands to override flint auto-detection.
