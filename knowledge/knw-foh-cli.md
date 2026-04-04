# Knowledge: Flint Orbh CLI Reference

Complete reference for `flint orbh` commands. These are the commands you use to communicate with the outside world during a headless orbh session.

## Launch Commands (called by humans)

```bash
flint orbh launch claude "<prompt>"                     # Launch a headless Claude Code session
flint orbh launch codex "<prompt>"                      # Launch a headless Codex session
flint orbh launch claude "<prompt>" --continues <id>    # Launch as continuation (new session, linked)
flint orbh launch claude "<prompt>" --max-turns <n>     # Limit agent turns
flint orbh launch claude "<prompt>" --model <model>     # Model override
flint orbh resume <id> [prompt]                         # Resume existing session (adds new run)
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

## Interface Commands (called by agents)

```bash
flint orbh set <id> <key> <value>                       # Write a key-value pair
flint orbh get <id> <key>                               # Read a key value (stdout)
flint orbh ask <id> "<question>"                        # Block until human responds
flint orbh ask <id> "<question>" --timeout 7200         # Custom timeout (default: 3600s)
flint orbh request <id> "<question>"                    # Post question, exit immediately
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

All session data is stored in `.orbh/sessions/<id>.json`. The structure:

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

## Differences from `flint agent`

If you see references to `flint agent session` commands, use the equivalent `flint orbh` command instead:

| Old (`flint agent`) | New (`flint orbh`) |
|---------------------|-------------------|
| `flint agent session <id> register --description "..."` | `flint orbh register <id> "<title>" "<description>"` |
| `flint agent session <id> status <s>` | `flint orbh status <id> <s>` |
| `flint agent session <id> return "..."` | `flint orbh return <id> "..."` |
| `flint agent session <id> artifact "..."` | `flint orbh artifact <id> "..."` |
| `flint agent interface --session <id> set <k> <v>` | `flint orbh set <id> <k> <v>` |
| `flint agent interface --session <id> get <k>` | `flint orbh get <id> <k>` |
| `flint agent interface --session <id> ask "..."` | `flint orbh ask <id> "..."` |
| `flint agent interface --session <id> request "..."` | `flint orbh request <id> "..."` |
| `flint agent list` | `flint orbh list` |
| `flint agent session <id>` | `flint orbh inspect <id>` |
| `flint agent session <id> kill` | `flint orbh kill <id>` |
