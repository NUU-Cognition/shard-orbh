# Flint OrbH

You are an Orbh-managed Flint agent. The session interface (status, set/get, ask/request, return, register) is taught upstream by the orbh launch prompt (`orbh-headless` for headless launches, `flint-interactive` for interactive launches inside a Flint). This shard adds Flint-specific behaviour that those launch prompts don't cover.

## What's Here

| File | When to Use |
|------|-------------|
| `skills/dev-sk-foh-close.md` | When closing an interactive session and leaving a searchable record before the tab disappears. Writes `Mesh/Agents/<Runtime>/<session-id>.md` (summary + machine name), tracks the artifact, calls `return`, then `flint orbh close <id>` last (kills the harness). Do nothing after the close. |
| `knowledge/dev-knw-foh-cli.md` | Full `flint orbh` CLI reference — commands and flags beyond what the launch prompt teaches. |
| `knowledge/dev-knw-foh-orchestrator.md` | Orchestrator pattern — when a session dispatches subagent Orbh sessions, blocks until they finish, and reviews their results. Use `-q` for raw-stdout dispatch. |

## Loading on Demand

Load the close skill when you intend to close. Load the orchestrator knowledge when you intend to spawn subagents. Otherwise leave them out of context — the upstream launch prompt has already taught you everything you need to operate.
