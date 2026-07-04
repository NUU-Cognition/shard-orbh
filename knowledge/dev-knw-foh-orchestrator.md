---
description: Orchestrator pattern — delegating to subagent Orbh sessions with a background-run blocking request, raw-result piping, parallel waits, and the park-until-join barrier
---

# Knowledge: Orbh Orchestrator Pattern

An Orbh session can act as a **manager** that delegates work to **subagent** sessions, collects their results, reviews them, and (if needed) continues them with follow-up prompts. This works for both interactive and headless sessions.

## The Default: a Blocking Request, Run in the Background

The dispatch primitive is **`flint orbh request`** — it launches a subagent session, blocks until that subagent calls `return`, and prints the returned result:

```bash
flint orbh request -q codex/55xh "<a complete, self-contained prompt>"
```

- **`-q` / `--quiet` is mandatory from an agent session.** Without it, `request` prints spinners and a formatted result box meant for human terminals, which pollutes your context. `-q` prints only the raw returned result on stdout.
- **Never launch detached for delegation.** Bare `launch` is fire-and-forget — it loses the collect step. Dispatch is always a `request` that somebody is collecting.
- **Run the request with your harness's native background execution.** Subagent sessions run for minutes to an hour, and your harness's shell tool kills long-running foreground commands (and, interactively, would hold the terminal hostage). Every current harness can run a shell command in the background — Claude Code's Bash tool takes `run_in_background: true`, and other harnesses have their own facility (see `prompts/harness/<runtime>.md` in the orbh package). Start the blocking request there, keep working or conversing, and collect the output when it lands.
- **Do not set timeouts on blocking calls.** `request` and `wait` block indefinitely by design until the subagent finishes. Do not pass `--timeout`, and do not put a shell/tool timeout on the call — the background run is what makes the long block safe.

## Default Subagent: `codex/55xh`

**Default to `codex/55xh`** when delegating implementation/code work. It is the standard subagent target for this workspace. (Profile names are exact short codes — `codex/55xh` resolves; slugs like `codex/high` or `claude/opus-max` do **not** and will error. Run `flint orbh profiles` to confirm the live set, and see [[dev-knw-foh-cli]] → Profiles for picking a different target when the task warrants it, e.g. `claude/o48mx` for research/design/review.)

## Be Specific With the Prompt

A subagent starts with **no shared context** — it does not see your conversation, your working memory, or what you already discovered. The prompt is the only channel. A vague prompt produces vague work. Every delegation prompt should carry:

- **The goal** — what "done" means, concretely.
- **Exact targets** — file paths, function/symbol names, artifact titles, commands to run. Don't make the subagent re-discover what you already know.
- **Relevant context** — the constraints, decisions, and gotchas it needs (quote them; don't assume).
- **The expected output** — what to `return` and in what shape (e.g. "return the diff", "return a bullet summary of findings with file:line refs").
- **Boundaries** — what NOT to touch, and to return early rather than guess if blocked.

```bash
# Bad — subagent has to guess everything:
flint orbh request -q codex/55xh "fix the auth bug"

# Good — self-contained:
flint orbh request -q codex/55xh "In Repos/flint/packages/orbh/src/session/lifecycle.ts, \
deriveSessionWorkState() returns 'finished' for runs that exited zero without a return. \
Per the 4-value model it must return 'abandoned' in that case. Fix it, keep the \
returned->finished path, run 'pnpm -C Repos/flint test session' and return the diff plus test output."
```

## Continue, Collect, Parallelize

All of these block, so all of them ride in background runs the same way:

```bash
# Continue a previous subagent with a follow-up (blocks again until it returns)
flint orbh request -q -c <session-id> "now also handle the expired-token edge case"

# Read the raw result of an already-finished session
flint orbh result <session-id>

# Parallel fan-out: start several background requests at once and collect each as it lands;
# or launch non-blocking and join on all of them with a single background `wait`:
flint orbh launch codex/55xh "<full prompt A>"     # returns a session id immediately
flint orbh launch codex/55xh "<full prompt B>"
flint orbh wait <id-A> <id-B>                       # blocks until all finish; run in the background
```

The simplest parallel shape is several background `request -q` runs side by side — each completion arrives on its own. Use `launch … wait` when you want the ids up front (e.g. to `watch` one of them) and a single join point.

## Alternative: Detached Jobs + Park-Until-Join

For wide fan-outs where you'd rather hold **no context at all** while waiting — or when your environment offers no native background execution — register each dispatch as an Orbh-side **agent job** in a group and park on the barrier. Parking terminates your harness (no tokens burned); the orchestrator auto-resumes your session when the **last** job in the group reaches a terminal state:

```bash
flint orbh job run --agent codex/55xh "<full prompt A>" --group fan
flint orbh job run --agent codex/55xh "<full prompt B>" --group fan
flint orbh job run "pnpm -C Repos/flint test" --group fan --timeout 1800   # commands mix in freely
flint orbh park --until-group fan
```

On resume, the injected prompt lists every job's status and output tail; read full outputs with `flint orbh job result <job-id>`. The barrier is all-terminal, not all-success: failures resolve it too and are surfaced first, and retrying is your explicit decision (groups never auto-retry). Per-job `--timeout` and park `--barrier-timeout <s>` are reaper-enforced safety bounds — unlike blocking `request`, use them freely here. To stay live and join a single job inline, `flint orbh job wait <job-id>`. Full command surface: [[dev-knw-foh-cli]] → Background Jobs.

See [[dev-knw-foh-cli]] for the full command and profile reference.
