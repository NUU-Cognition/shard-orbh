---
description: "Operating on other sessions — launch/resume, interactive sessions, listing & inspection, the request/result/wait dispatch surface, inter-session messages, interrupt, respond, kill, and the orchestrator singleton"
orbh-sessions:
  - "[[d1f03280-e10d-413f-a040-70c3a84feb66]]"
  - "[[5d693555-8632-4235-b536-d366018f3a65]]"
---

# Knowledge: Orbh Session Coordination

The command surface for operating on **other** sessions — launching them, watching them, dispatching and collecting subagents, and messaging between sessions. For the delegation *patterns* (background-run blocking requests, fan-out, park barriers), read [[dev-knw-foh-orchestrator]]. For picking a `runtime/profile` target, read [[dev-knw-foh-profiles]].

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

## Listing & Inspection

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

> For the blocking dispatch/collect pattern, do **not** add `--timeout` — these calls block intentionally until the subagent finishes. Run them with your harness's native background execution ([[dev-knw-foh-orchestrator]]).

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

## Discovering Active Sessions

```bash
flint orbh active                               # Active tree: humans browse; agents get JSON targets
```

`active` is the live session-tree discovery surface. Humans in a normal TTY get the interactive active-session tree: every tree with activity, subagents nested depth-first under parents, and the full per-session action set on any row.

Inside an Orbh session (`ORBH_SESSION_ID` present), `active` automatically prints machine-readable JSON — no flag needed. Parse it, choose the target session by full `id`, then message it with `flint orbh message send <id> "<text>"`. The caller's own session is included and flagged `self: true`; it is not hidden. Write your `register` descriptions knowing other agents read them here.

JSON shape: `{ self, generatedAt, sessions }`. `self` is the caller session id or `null`; `generatedAt` is ISO time; `sessions` is tree-order rows: active roots plus all nested subagents, including finished children of active roots as context (`active: false`). Row fields: `id` (full, message-target-ready), `shortId`, `parentSessionId`, `depth`, `mode`, `workState`, `active`, `runtime`, `title`, `description`, `phase`, `progress`, `started`, `updated`, `self`. Empty values are `null`.

Overrides and filters: `--json` forces JSON for anyone; `--print` forces the static human tree; `--wide` prints the static tree full-width and implies `--print`; `-r/--runtime <runtime>` and `-q/--search <text>` filter every mode. Precedence: `--json` > `--print`/`--wide` > `ORBH_SESSION_ID` JSON > TTY interactive > static tree. (Task 186.)

## Inter-Session Messages

```bash
flint orbh message send <targetId> "<text>"     # Append a message to another session (records orbh.message.received on the target)
flint orbh message send <targetId> "<text>" --wake   # Additionally wake a PARKED target: resume it with the message digest as the prompt
flint orbh message send <targetId> "<text>" --revive # Resume an ENDED (finished/abandoned, incl. closed) target with the message digest — explicit resurrection
flint orbh message list <id>                    # List a session's message history (peer request/response pairs render as threads)
```

Messages are delivered lazily by default and persist on the target session's control log. Use them for asynchronous coordination between sessions. Delivery reaches the target at its next turn boundary through three channels: the target's own `page` / `page arm` reads ([[dev-knw-foh-page]]), piggyback on the target's next `session` verb, and — with `--wake` — an immediate resume when the target is **parked** (send-time fast path, retried by the orchestrator's message-wake sweep if the resume fails). `--wake` on a non-parked target is a no-op beyond normal queueing: working sessions are never interrupted by message delivery. `--revive` is the terminal-session analog: it explicitly resumes an *ended* session with the digest (never silently — without the flag the message just queues). Sender identity renders as the session's **title (short-id)** everywhere.

After queueing, `message send` prints a delivery-state notice:

- `Message queued — session <id> has ended (<workState>); add --revive to resume it with this message`
- `Message queued — target is parked; add --wake to deliver now` (or `wake requested` when `--wake` was passed)
- `Message queued — target is armed; delivery within seconds`
- `Message queued — target is working and unarmed; delivery waits for the target's next pull/arm`

## Peer Requests (blocking session-to-session ask)

```bash
flint orbh message request <targetId> "<question>"   # Hangs until the target responds — run in your background execution
flint orbh message request --cancel <requestId>      # Withdraw a pending request
flint orbh message respond <requestId> "<answer>"    # Answer a pending peer request (self-targets as the responder)
```

The synchronous complement to `message send`: use it when you cannot proceed without the answer (file-boundary negotiation, "is your migration done?"). The request prints its `requestId` immediately, then waits store-side (no server, no default timeout; optional `--timeout <s>` exits non-zero leaving the request pending). The waiter exits early with a clear status if the target session **ends** unanswered; parked targets keep the wait alive. Pending requests render distinctly on the target's Page with the exact respond command and stay visible until answered or cancelled. Mutual pending requests (A↔B) are *warned* on both Pages, not prevented — one side responds or cancels. Run the request in your harness's background execution, same as `request -q` dispatch. (Task 177; see `(Spec) Orbh . Peer Requests`.)

## Rooms (shared durable places)

```bash
flint orbh room create <name> [--topic "<t>"]        # Create a durable room (name unique, case-insensitive)
flint orbh room list                                 # Rooms + your membership/unread columns
flint orbh room read <room> [--no-advance]           # Render stream + context; subscribed self reads drain cursors (--no-advance peeks)
flint orbh room join <room> [--notify all|mentions|mute]   # Subscribe THIS session (re-join updates policy, keeps cursors)
flint orbh room leave <room>                         # Remove your subscription (room persists)
flint orbh room post <room> "<text>"                 # Append to the stream (membership not required)
flint orbh room context show <room>                  # Full context library body + rev
flint orbh room context append <room> "<text>"       # Append to the context library (rev +1)
flint orbh room context edit <room> --search "<old>" --replace "<new>"   # CAS edit: fails on not-found or ambiguous match
```

A **room** is a named spool owned by no session — it outlives every participant, so conversations and shared context survive session churn. It carries two planes: the append-only **message stream** (chat, sender titles resolved) and the **context library**, one mutable revisioned document for shared state (goals, file claims, links). Context edits are **search/replace with exactly-one-match required** — a stale view fails loudly (`not found` / `ambiguous`), and the repair is `room context show` then retry. Treat every edit as a compare-and-swap.

**Join ≠ read.** Reading is a look and mutates nothing (except a subscribed *self* read drains your cursors). Joining writes a subscription into *your* `core:rooms` slice — that is what routes the room onto your Page (`core/rooms` renders unread messages + change-only context deltas) and into your armed pager's wake conditions: `all` wakes on any new message or context rev, `mentions` only when a message `@`-mentions your id-prefix or exact title, `mute` never wakes (unread counts still render). Your **own** posts and context edits never wake you and never count as unread to you (author-filtered). Subscription changes take effect on a **live** waiter — joining, leaving, or changing notify policy mid-arm needs no re-arm. Room activity never wakes parked or terminal sessions — direct `message send --wake` stays the explicit path. (Task 182)

**Dispatch convention:** when a subagent participates in shared work, name the room in its prompt — "join room `<name>` (--notify all), announce yourself in the stream, and read its context library before starting." The launch prompts teach the mechanic; naming the room is the manager's choice. (Task 177; see `(Spec) Orbh . Rooms`.)

### Interrupting a Working Headless Session

```bash
flint orbh interrupt <targetId> "<text>"   # Terminate the target's live run, then resume it with your message as an interrupt digest
```

The explicit escalation for "stop, requirements changed" — when waiting for the target's next turn boundary is wrong. Headless/subagent targets only (interactive sessions are interrupted from their own terminal). The message is recorded on the spool first, the live run is terminated through the same machinery as `kill`, and the session is resumed with a digest stating it was interrupted mid-run, that its transcript is preserved, and that in-flight changes may be half-applied. Degrades state-awarely: a parked target behaves exactly like `--wake`, an idle target resumes without a kill, a finished/abandoned target just queues the message with `queued (terminal; session has ended and will only see this if resumed)` (no silent resurrection). Nothing automates this verb — the orchestrator never interrupts. Use it sparingly: the target loses its in-flight tool call, and its interrupted work may be half-applied.

## Responding to a Blocked Session (called by humans / managers)

```bash
flint orbh respond <id> "<text>"        # Answer a pending question on a session
```

If the pending request was a blocking `ask`, the asking agent's `ask` call returns the text and it resumes in-place. If it was a **deferred** request, `respond` **auto-resumes** the session with the answer.

## Killing a Session

```bash
flint orbh kill [id]                    # SIGTERM a running session (records run.ended + cancelled first); self-targets via ORBH_SESSION_ID
```
