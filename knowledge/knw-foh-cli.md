# Knowledge: Flint OrbH CLI Reference

Complete reference for `flint orbh` commands. These are the commands you use to communicate with the outside world during a headless orbh session.

## Profiles

Profiles are pre-configured runtime targets with model and reasoning effort settings. Use `flint orbh profiles` to see all available profiles. Always launch with a profile rather than a bare runtime.

```bash
flint orbh profiles                                     # List all profiles
flint orbh launch claude/opus-max "<prompt>"             # Launch with a specific profile
flint orbh request claude/opus-max "<prompt>"            # Request with a specific profile
```

### Recommended Profiles

| Task Type | Profile | Why |
|-----------|---------|-----|
| **Default / general** | `claude/opus-max` | Best reasoning for Flint tasks, research, planning |
| **Coding tasks** | `codex/high` | Optimized for code generation and file editing |
| **Fast / simple** | `claude/sonnet` | Lower cost for lightweight tasks |
| **Parallel batch** | `codex/medium` | Good throughput for many concurrent tasks |

When dispatching subagents as an orchestrator, pick the profile based on the task:
- Research, design, review, Mesh artifacts → `claude/opus-max`
- Implement code, refactor, write tests → `codex/high`
- Quick lookups, simple edits → `claude/sonnet` or `codex/medium`

## Launch Commands (called by humans)

```bash
flint orbh launch claude/opus-max "<prompt>"             # Launch with profile (preferred)
flint orbh launch codex/high "<prompt>"                  # Launch Codex with profile
flint orbh launch claude "<prompt>"                      # Launch with default model
flint orbh launch claude "<prompt>" --continues <id>     # Launch as continuation (new session, linked)
flint orbh launch claude "<prompt>" --max-turns <n>      # Limit agent turns
flint orbh resume <id> [prompt]                          # Resume existing session (adds new run)
```

## Session Management (called by humans)

```bash
flint orbh list                                         # List all sessions (last 20)
flint orbh list --all                                   # List all sessions
flint orbh list --stats                                 # Show token usage and turn counts
flint orbh list -i                                      # Live refresh (2s interval)
flint orbh inspect <id>                                 # Show session detail with stats, runs, questions
flint orbh stats <id>                                   # Detailed statistics — turns, tokens, tools, files
flint orbh stats <id> --files                           # Include full file paths in stats
flint orbh watch <id>                                   # Stream live transcript with token counter
flint orbh watch <id> -v                                # Verbose — full thinking and tool output
flint orbh kill <id>                                    # Kill a running session (SIGTERM)
flint orbh heal                                         # Fix sessions stuck with stale PIDs
flint orbh heal --dry-run                               # Preview what would be healed
flint orbh respond <id> "<text>"                        # Respond to a blocked session's pending question
```

## Session Commands (called by agents)

```bash
flint orbh register <id> "<title>" "<description>"       # Register with a title and description
flint orbh status <id> <enum>                           # Set lifecycle status
flint orbh return <id> "<result markdown>"              # Store final result and finish session
flint orbh artifact <id> "<artifact path>"              # Track an artifact you produced
flint orbh result <id>                                  # Get raw result payload of a finished session (stdout only)
```

### The `return` Command

**This is how you deliver your output.** When you're done working, call `return` with your full result as markdown. This:
1. Stores the result on the **current run** (`currentRun.result`)
2. Sets the run status to `completed` and session status to `finished`

The human reads this result via `flint orbh inspect <id>`. Do NOT rely on terminal output — always use `return`.

### Status Enum Values

| Status | Meaning | When to set |
|--------|---------|-------------|
| `queued` | Session created, not started | Set by launcher |
| `in-progress` | Actively working | After registering, while working |
| `blocked` | Needs human input (blocking) | When using `ask` (agent stays alive) |
| `deferred` | Needs human input (deferred) | When using `request` or `return` with pending deferred question |
| `finished` | Work complete | Set automatically by `return` command |
| `failed` | Error occurred | On unrecoverable error |
| `cancelled` | Session was killed | Set by `flint orbh kill` |

## Orchestrator Commands (called by manager agents)

These commands enable an interactive agent session to dispatch, continue, and collect results from subagent sessions.

```bash
flint orbh request -q claude/opus-max "<prompt>"         # Quiet dispatch — raw result only (use from agent sessions)
flint orbh request -q codex/high "<prompt>"              # Quiet dispatch for coding tasks
flint orbh request -q -c <id> "<prompt>"                 # Quiet continue — resume and get raw result
flint orbh request claude/opus-max "<prompt>"            # Interactive dispatch (spinner + result box)
flint orbh request claude/opus-max "<prompt>" --stream   # Stream live transcript while waiting
flint orbh result <id>                                   # Get raw result payload (stdout, no formatting)
flint orbh wait <id1> [id2...]                           # Block until all sessions finish, print results in order
flint orbh wait <id1> <id2> --timeout 600                # Wait with timeout
```

### `request` — Synchronous Subagent Dispatch

`request` is the primary orchestration primitive. It launches (or resumes) a subagent and blocks the calling process until the subagent finishes. The subagent's `return` output comes back on stdout.

**Quiet mode (`-q` / `--quiet`):**
When calling `request` from an agent session (bash tool), **always use `-q`**. Without it, the command outputs spinners and formatted result boxes that pollute your context. With `-q`, you get only the raw result on stdout — same as calling `result` after the session finishes.

**Launch mode** — `flint orbh request [-q] <runtime> "prompt"`:
- Creates a new session, spawns the harness, waits for completion
- Supports `--continues <id>` to link as a continuation (new session, linked to old one)
- Supports `--max-turns`, `--budget`, `--model`, `--title`, `--description`

**Continue mode** — `flint orbh request [-q] -c <id> "prompt"`:
- Resumes an existing session — the subagent keeps its full context from the previous run
- Appends a new run to the session (same as `resume` but with blocking wait)
- Use this for iterative work: dispatch → review result → continue with follow-up

### `result` — Raw Result Collection

Returns just the `return` payload of a finished session to stdout. No session metadata, no formatting. Exits non-zero if the session isn't finished or has no result.

Use this to read subagent outputs into variables:
```bash
output=$(flint orbh result <id>)
```

### `wait` — Parallel Result Collection

Blocks until all specified sessions reach a terminal status, then prints each result labeled by session ID. Results appear in the order the IDs were specified, not completion order.

Use this after launching multiple requests in parallel:
```bash
flint orbh launch codex/high "implement feature A" &  # launches, returns immediately
flint orbh launch codex/high "implement feature B" &
# ... then collect results:
flint orbh wait <id-A> <id-B>
```

## Interface Commands (called by agents)

```bash
flint orbh set <id> <key> <value>                       # Write a key-value pair
flint orbh get <id> <key>                               # Read a key value (stdout)
flint orbh ask <id> "<question>"                        # Block until human responds
flint orbh ask <id> "<question>" --timeout 7200         # Custom timeout (default: 3600s)
flint orbh request <id> "<question>"                    # Post deferred question, exit immediately
```

### The `ask` Command

`ask` is a blocking command. When you call it:

1. A structured request is created with type `blocking`
2. Your status is set to `blocked`
3. A macOS notification is sent to the human
4. The command polls until the human calls `flint orbh respond <id> "<text>"`
5. The response is returned to stdout

Use `ask` when you genuinely need human input to proceed:

```bash
response=$(flint orbh ask <id> "Found 3 issues. Fix all or just criticals?")
echo "Human said: $response"
```

### The `request` Command

`request` is a non-blocking variant of `ask`. It posts the question and exits immediately. The session is set to `blocked`. When the human responds via `flint orbh respond`, the session is automatically resumed.

### Interface Key Conventions

You can write any key you want. Some commonly useful ones:

| Key | Example Value | Purpose |
|-----|---------------|---------|
| `phase` | `reading-code` | Current work phase |
| `progress` | `3/7 files` | Progress indicator |
| `artifacts` | `(Report) 012, (Task) 205` | Artifacts produced |
| `blockers` | `need clarification on auth flow` | Current blockers |
| `confidence` | `high` | Confidence in work quality |
| `context-pressure` | `high` | Context window getting full |

## Session File

All session data is stored in `.flint/sessions/<id>.json`. The structure:

```json
{
  "id": "uuid",
  "runtime": "claude",
  "status": "in-progress",
  "prompt": "the original prompt",
  "title": "short session label",
  "description": "what the agent registered as",
  "continues": "previous-session-id-or-null",
  "started": "ISO-8601",
  "updated": "ISO-8601",
  "interface": {
    "phase": "reading-code",
    "progress": "3/7 files"
  },
  "runs": [
    {
      "id": "run-uuid",
      "nativeSessionId": "native-session-id",
      "continuesRunId": "previous-run-uuid-or-null",
      "pid": 48291,
      "started": "ISO-8601",
      "ended": "ISO-8601-or-null",
      "exitCode": 0,
      "status": "completed",
      "result": "final-result-markdown-or-null",
      "requests": [
        {
          "id": "request-uuid",
          "type": "blocking",
          "question": "Fix all 3 issues or just criticals?",
          "asked": "ISO-8601",
          "answered": "ISO-8601-or-null",
          "response": "just criticals"
        }
      ]
    }
  ]
}
```

### Key Fields

- **`runs[]`** — Each harness invocation (launch, resume) adds a new run. The current run is the last entry. Each run has its own PID, native session ID, exit code, timestamps, result, and requests.
- **`runs[].result`** — The agent's final deliverable for that run, set by the `return` command.
- **`runs[].requests[]`** — Structured log of questions asked and answered during that run. Tracks type, timestamps, and the response.
- **`runs[].status`** — Run lifecycle: `running`, `completed`, `failed`, `cancelled`, `suspended`.
- **`runs[].continuesRunId`** — Links a resume run to the run it continues.
- **`interface`** — Free-form key-value pairs you control entirely.
- **`status`** — Session lifecycle: `queued`, `in-progress`, `blocked`, `deferred`, `finished`, `failed`, `cancelled`.

