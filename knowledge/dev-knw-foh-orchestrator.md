---
description: Orchestrator pattern — dispatching subagent Orbh sessions from a managing session, with raw-result piping and parallel waits
---

# Knowledge: Orbh Orchestrator Pattern

An Orbh session can act as a **manager** that dispatches subagent sessions, blocks until they finish, reviews their results, and continues them with follow-up prompts. This pattern works for both interactive and headless sessions.

## Spawning Other Agents

Always launch via a profile rather than a bare runtime so model + extra-arg defaults are applied consistently:

```bash
flint orbh launch codex/high "implement the auth fix described in (Task) 205"
```

This starts a new headless session and returns the session ID. Use `flint orbh profiles` to see available profiles.

## Dispatching with `--quiet`

**Always use `--quiet` (`-q`) when dispatching from an agent session.** The default `request` output includes spinners and formatted result boxes designed for human terminals. When you're calling `request` from a Bash tool, use `-q` to get only the raw result on stdout — no spinner, no formatting, no noise in your context.

```bash
# Dispatch a subagent and get the raw result (always use -q from agent sessions)
result=$(flint orbh request -q claude/opus-max "research the auth flow and summarize findings")
result=$(flint orbh request -q codex/high "implement the auth fix described in (Task) 205")

# Continue a previous session with a follow-up
result=$(flint orbh request -q -c <session-id> "now also handle the edge case for expired tokens")

# Read just the raw result of a finished session
output=$(flint orbh result <session-id>)

# Dispatch multiple subagents in parallel and collect results
flint orbh launch codex/high "implement feature A" &
flint orbh launch codex/high "implement feature B" &
flint orbh wait <id-A> <id-B>
```

## Do Not Set Timeouts

**Do not set timeouts on orchestrator calls.** `flint orbh request` and `flint orbh wait` are designed to block indefinitely until the subagent finishes. Do not pass `--timeout` and do not set a timeout on the Bash tool call itself. The whole point is that the manager waits for real work to complete — subagent sessions can take minutes. Let them run.

See [[dev-knw-foh-cli]] for the full orchestrator command reference.
