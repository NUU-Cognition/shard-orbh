---
description: "Orbh orchestration — collector-backed delegation, recursive awaiting managers, peers, and the orchestrator's janitor/designated-survivor role"
orbh-sessions:
  - "[[e5b16ab0-bba4-4da2-a15a-6f84107d181f]]"
  - "[[1e7717cf-c6b0-4706-a149-ed479bd341cd]]"
  - "[[25f11f9b-67f7-46e6-ad6d-3089b3131066]]"
  - "[[f5bc64b0-3b0a-4b22-a079-866934fc9c24]]"
---

# Knowledge: Orbh Orchestration

Two different actors are called orchestrators:

1. A **manager agent** decomposes work, dispatches subagents, reviews results, and may await between waves.
2. The **per-machine orchestrator process** is a janitor and designated survivor. It does not plan agent work.

## Manager Agents: Default Delegation

Dispatch collected work with a quiet blocking request, run through the harness's native background execution:

```bash
flint orbh request -q codex/solxh "<complete, self-contained prompt>"
```

`request` creates a subagent, anchors collection to the initiated turn, and prints only that turn's correlated result in quiet mode. Run it in the background because the shell call intentionally blocks; do not poll it or add a routine timeout.

Prompts must carry the goal, exact targets, relevant decisions, boundaries, verification commands, and required result shape. A child shares none of the manager's conversational context.

```bash
# Follow up: awaiting targets are woken and the new turn is collected.
flint orbh request -q -c <session-id> "<follow-up>"

# Read the latest or a specific historical turn result.
flint orbh result <session-id>
flint orbh result <session-id> --run <n>
```

Subagents default to `return --finish`. Grant `--await` only when you genuinely expect follow-ups or standing duty. Remember that `return --await` still emits a result: the collector for that turn unblocks, and any later work is another turn/result.

## Parallel Fan-Out

For a small fan-out, start several background `request -q` calls. Each completion is independently correlated and delivered. For wide fan-out or a manager that should release its harness between waves, use agent jobs:

```bash
flint orbh job run --agent codex/solxh "<prompt A>" --group wave-1
flint orbh job run --agent codex/solxh "<prompt B>" --group wave-1
flint orbh park --until-group wave-1 [--barrier-timeout <s>]
```

`park --until-group` is the legacy compatibility spelling that adds the all-terminal barrier to the standard wake set; it does not suppress messages, requests, room activity, or earlier terminal-job wakes. The waiter delivers the wake directly; the orchestrator sweep repairs only missed/dead-waiter cases. On wake, use `job list` and `job result <id>`; failure also resolves the barrier.

## Recursive and Interior-Awaiting Managers

Subagents may themselves manage subagents. An interior manager can dispatch depth-2+ work, end the current turn with a checkpoint result, await the wave, then collect outputs when its waiter wakes it:

```bash
# Interior manager, turn N
flint orbh job run --agent codex/solxh "<leaf A>" --group wave-1
flint orbh job run --agent codex/solxh "<leaf B>" --group wave-1
flint orbh session return --await "Wave 1 dispatched; awaiting leaf results."

# Waiter resumes the manager after Page-worthy job completions; turn N+1
flint orbh job list
flint orbh job result <job-id-A>
flint orbh job result <job-id-B>
# Synthesize, dispatch another wave and return --await again, or finish:
flint orbh session return --finish "<final synthesis>"
```

This is a **result stream**, not one collector spanning the whole standing duty. The caller's turn-N collector receives the checkpoint return. It can inspect later results with `result --run`, or issue `request -q -c` when it wants to initiate and collect a specific follow-up turn. The interior manager's child awaits, crashes, resumes, and rescue runs do not accidentally resolve collectors; only correlated results or explicit failure outcomes do.

Ancestry `{rootSessionId, depth}` and immediate parent edges make recursive trees visible in `orbh list`. Default safety caps are depth 5 (`ORBH_DISPATCH_DEPTH_CAP`) and live fan-out 16 (`ORBH_DISPATCH_FANOUT_CAP`).

## Peers

Use bare `launch` for work that should outlive the caller or belongs to no collector:

```bash
flint orbh launch <runtime/profile> "<standing duty>"
```

That creates a root **peer** with a manager-flavored prompt and await-default duty. It is not delegation and never belongs to the launcher's tree. Coordinate through messages/rooms; do not use a peer when you need an owned result now.

## Resume Hygiene: Re-Collect Before Re-Dispatch

Children survive your death and results are durable — so a resume (waiter wake, rescue after a crash or `failed-unreturned` turn, operator revival) often lands you in a session whose previous turn already dispatched work. **Inventory before dispatching anything:**

```bash
flint orbh page                    # dispatch stamps, jobs, unread coordination
flint orbh job list                # per-job terminal states from prior waves
flint orbh job result <job-id>     # adopt a completed job's output
flint orbh result <session-id>     # adopt a subagent's durable turn result
flint orbh result <session-id> --run <n>   # a specific historical turn
```

Adopt every result that already exists; re-dispatch only work with **no correlated result and no live run**. Re-dispatching a wave that already completed doubles cost and can double side effects. The same rule covers late adoption of orphans: results outlive their collector, so an ancestor (or the operator) can always collect by id after the dispatcher died — nothing needs re-running just because nobody was watching when it finished.

## Infrastructure: Janitor and Designated Survivor

The per-machine orchestrator provides recovery, not task planning. It:

- scans every non-terminal headless/subagent obligation and respawns a missing/dead persistent waiter;
- validates waiter leases with machine identity and Linux boot/process identity so reboot and PID reuse are safe;
- re-establishes waiters at orchestrator acquisition/startup, including after reboot;
- runs the bounded un-returned-turn reaper: at most two return-discipline resumes, then `failed-unreturned` + awaiting;
- reaps dead/timed-out background-job wrappers and stale dispatch stamps;
- keeps message-wake and job-barrier sweeps only as low-frequency retry nets behind waiter-direct delivery, after a grace window;
- retries recovery from durable spool facts, so failures delay delivery rather than lose it;
- defers idle exit while waiter obligations, awaiting sessions, barriers, retry work, or reaper work remain.

The waiter owns normal delivery; the orchestrator repairs it. The orchestrator never performs agent-level `interrupt` decisions.

```bash
flint orbh orchestrator status [--json]
flint orbh orchestrator ensure
flint orbh orchestrator reap [--json]
```

See [[dev-knw-foh-coordination]] for the full command surface, [[dev-knw-foh-page]] for waiter/attach and jobs, and [[dev-knw-foh-profiles]] for live targets.
