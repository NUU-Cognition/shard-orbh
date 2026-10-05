---
description: "Orbh orchestration — delegation shapes, collector-backed dispatch, recursive awaiting managers, peers, and the orchestrator's supervisor/reaper/wake-engine role"
orbh-sessions:
  - "[[e5b16ab0-bba4-4da2-a15a-6f84107d181f]]"
  - "[[1e7717cf-c6b0-4706-a149-ed479bd341cd]]"
  - "[[25f11f9b-67f7-46e6-ad6d-3089b3131066]]"
  - "[[f5bc64b0-3b0a-4b22-a079-866934fc9c24]]"
  - "[[0a96d4be-c368-430e-84a6-3ba0366bc6f8]]"
  - "[[9eb39a19-e277-46e8-92af-127d080c3ed1]]"
  - "[[78241877-1d07-40de-882e-06a58eb86e19]]"
---

# Knowledge: Orbh Orchestration

Two different actors are called orchestrators:

1. A **manager agent** decomposes work, dispatches subagents, reviews results, and may await between waves.
2. The **per-machine orchestrator process** supervises managers, reaps ungraceful deaths, and drives the sweeps that wake dormant sessions. It does not plan agent work.

## Delegation Shapes

Pick the shape before picking the verb. They differ in who owns the result and whether you block.

| Shape | Verb | Blocking? | Use when |
|---|---|---|---|
| **Subagent** | `request -q <target> "<prompt>"` | Yes — you block on the correlated result | You own the work and need its answer in this turn. The default. |
| **Agent job** | `job run --agent <target> "<prompt>" --group <g>` | No — collect on a barrier | Wide fan-out, or you want to release your harness between waves. |
| **Worker** | `worker spawn "<brief>"` | No — the single return arrives as a child-result wake | The unit is durable and named, and a human may want to converse with it in its own thread. |
| **Peer** | `launch <target> "<duty>"` | No, and no collector at all | The duty outlives you or belongs to nobody. Coordinate by message/room. |
| **Station** | `station send <name> "<text>"` / `station request …` | `send` no, `request` yes | The endpoint should be durable and the serving session interchangeable. |
| **Cron** | `cron create <name> --expr … --prompt …` | n/a | The work is scheduled, not requested. |
| **Workflow clause** | `workflow after <id> --then "<prompt>"` | n/a — declarative | "When that session next returns, launch this." Children default to `claude/o5h`. |

Stations, cron, workers and workflow chaining are covered in [[dev-knw-foh-machinery]].

## Manager Agents: Default Delegation

Dispatch collected work with a quiet blocking request, run through the harness's native background execution:

```bash
flint orbh request -q codex/solxh "<complete, self-contained prompt>"
```

`request` creates a subagent, anchors collection to the initiated turn, and prints only that turn's correlated result in quiet mode. Run it in the background because the shell call intentionally blocks; do not poll it or add a routine timeout.

**Never discard the output of `flint orbh request -q`** (for example with `>/dev/null`). The collector is the channel that gives you the result. Run it with your harness background execution, so that its output reaches you. A collector whose output goes to `/dev/null` leaves the result waiting for the Page.

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

> **Temporary rule (Report 076, defect D1).** Until Task 712 is done and its build is the live CLI, do not start many concurrent `request -q` calls from one parent. They fail on the lock `<parent>.dispatch-reservations.lock` after 15 to 55 seconds, and a child can start while its collector exits 1 with no child id. Dispatch parallel children with `job run --agent` and a group barrier (below), or start one `request -q` at a time, about 15 seconds apart. When a `request -q` exits 1, read `flint orbh list` before you dispatch again: collect a child that exists with `flint orbh wait <id>`.

```bash
flint orbh job run --agent codex/solxh "<prompt A>" --group wave-1
flint orbh job run --agent codex/solxh "<prompt B>" --group wave-1
flint orbh session return --await --until-group wave-1 "Wave 1 dispatched; awaiting leaf results."
```

`session return --await --until-group` is the right verb because it does two things at once: your collector receives this turn's checkpoint result, **and** the barrier is armed for your next wake. The barrier is additional, not exclusive — messages, requests, room activity, station items and earlier terminal-job events can still wake you first. On wake, use `job list` and `job result <id>`; failure also resolves the barrier.

`flint orbh park [id] --until-group <g> [--barrier-timeout <s>]` remains as the legacy/operator spelling. It carries no turn result, and `--barrier-timeout` lives only there.

When you are waiting on something the sweeps cannot observe — an external CI run, a slow deploy, a human's inbox — pace yourself instead:

```bash
flint orbh session return --await --wake-at +15m "Polling <thing>; nothing to collect yet."
```

## Recursive and Interior-Awaiting Managers

Subagents may themselves manage subagents. An interior manager can dispatch depth-2+ work, end the current turn with a checkpoint result, await the wave, then collect outputs when the sweep wakes it:

```bash
# Interior manager, turn N
flint orbh job run --agent codex/solxh "<leaf A>" --group wave-1
flint orbh job run --agent codex/solxh "<leaf B>" --group wave-1
flint orbh session return --await --until-group wave-1 "Wave 1 dispatched; awaiting leaf results."

# The orchestrator sweep resumes the manager with a coalesced digest; turn N+1
flint orbh job list
flint orbh job result <job-id-A>
flint orbh job result <job-id-B>
# Synthesize, dispatch another wave and return --await again, or finish:
flint orbh session return --finish "<final synthesis>"
```

This is a **result stream**, not one collector spanning the whole standing duty. The caller's turn-N collector receives the checkpoint return. It can inspect later results with `result --run`, use `wait --next` for the turn after the one it has already read, or issue `request -q -c` when it wants to initiate and collect a specific follow-up turn. The interior manager's child awaits, crashes, resumes, and rescue runs do not accidentally resolve collectors; only correlated results or explicit failure outcomes do.

Ancestry `{rootSessionId, depth}` and immediate parent edges make recursive trees visible in `orbh list`. Default safety caps are depth 5 (`ORBH_DISPATCH_DEPTH_CAP`) and live fan-out 16 (`ORBH_DISPATCH_FANOUT_CAP`). The fan-out cap counts every live child of the parent, also an awaiting child. For a larger program, use sub-leads (a two-level fan-out), or raise the cap for one dispatch: `ORBH_DISPATCH_FANOUT_CAP=32 flint orbh request ...`.

## Peers

Use bare `launch` for work that should outlive the caller or belongs to no collector:

```bash
flint orbh launch <runtime/profile> "<standing duty>"
```

That creates a root **peer** with a manager-flavored prompt and await-default duty. It is not delegation and never belongs to the launcher's tree. Coordinate through messages/rooms; do not use a peer when you need an owned result now.

## Moving Another Session to a Different Account

A manager or an operator can move a session that it did not start to another account of the same runtime. Add `--session` to `auth migrate`:

```bash
flint orbh auth migrate <account> --session <id> [--force]
```

Without `--session`, the command moves the session that runs it, and that turn ends. With `--session`, the command moves the named session. Your own run does not end.

Use the command in these cases:

- The account of a session has no quota left, and another account of the same runtime has quota. Check with `flint orbh auth usage`.
- A fleet child runs on the account of a live interactive session. Move the child to another account. See "Manager Rules".

What the command does to the target session:

- **Interactive session with a live manager.** The manager ends the run at a turn boundary, moves the conversation files, flips the account, and resumes the same native session in the new account. The command waits for the result.
- **Headless session with no live turn.** The command moves the files and flips the account. The session uses the new account at its next wake. The command prints `Not relaunched`.
- **Headless session with a live turn.** Orbh kills the turn, then moves the files. The turn in flight is lost. The conversation is not lost. Collect the result first with `flint orbh wait <id>` when you need it.

Rules:

- **Same runtime only.** A claude session cannot move to a codex account.
- **Credentials.** The destination account must have usable credentials. Use `--force` only when you accept a login screen.
- **Only the session travels.** Memory, config, and credentials stay with the old account.
- **Human sessions.** Do not move an interactive session that a person uses, unless the person or your prompt asks for it. The move restarts the child process in the pane.
- **Old managers.** A pane whose manager is older than the migrate verb refuses the move and moves nothing. Run `flint orbh resume <id>`, then try again.
- **Verify.** After the command, read the `Account` line of `flint orbh inspect <id>`. Report the new account only when it shows there.

To change the model or the effort, use `profiles switch` inside that session. To change the runtime, use `compact handoff --into`. See [[dev-knw-foh-cli]] and [[dev-knw-foh-profiles]].

## Resume Hygiene: Re-Collect Before Re-Dispatch

Children survive your death and results are durable — so a resume (an orchestrator wake, rescue after a crash or `failed-unreturned` turn, operator revival) often lands you in a session whose previous turn already dispatched work. **Inventory before dispatching anything:**

```bash
flint orbh page                    # dispatch stamps, jobs, unread coordination
flint orbh job list                # per-job terminal states from prior waves
flint orbh job result <job-id>     # adopt a completed job's output
flint orbh result <session-id>     # adopt a subagent's durable turn result
flint orbh result <session-id> --run <n>   # a specific historical turn
```

Adopt every result that already exists; re-dispatch only work with **no correlated result and no live run**. Re-dispatching a wave that already completed doubles cost and can double side effects. The same rule covers late adoption of orphans: results outlive their collector, so an ancestor (or the operator) can always collect by id after the dispatcher died — nothing needs re-running just because nobody was watching when it finished.

## Manager Rules

Each rule prevents a failure that the NUU Flint session audit (Report 051) found.

- **Check the accounts before a fan-out.** Run `flint orbh auth usage`. Find the account of each live interactive session with `flint orbh inspect <id>` (the `Account` line). Do not put a fleet on the account of a live interactive session: when the fleet uses up the quota, the human's sessions stop too. Spread a large fleet over more than one account with `--account <name>`. To move a running session to another account, see "Moving Another Session to a Different Account".
- **Collect through the result stream.** Run each `request -q` in background execution. After a standing child returns `--await`, run `flint orbh wait --next <id>` in background execution to get its next result, or read the `CHILD RESULT` block of your Page. Do not watch log files for a "final state" line, and do not wait in `sleep` loops.
- **Keep the builders on the machine branch.** By default, every builder works on the machine branch of this machine (for example `nathan-main`) in the primary checkout, also when two or more builders change the same repository. Give each builder its own files, and tell each builder to commit only its own paths (`git commit -- <path>...`). Give a builder a worktree and a branch only when the operator names one.
- **Declare a fleet for a program.** When you dispatch 3 or more sessions, plan 2 or more waves, or run a program that the operator named, declare a fleet before the first dispatch: `flint orbh fleet declare <handle> --charter "<goal, boundary, done condition>" --charter-ref "<Mesh path>"`. See [[dev-knw-foh-fleets]].
- **Close the fleet before your last return.** As the root of a fleet, do the close-out steps below, write the report, and then run `flint orbh fleet close "<outcome>" --report "<Mesh path>"` before your last `return --finish`. Use `--abandon` when the operator stops the program. A close does not stop a session.
- **Close out before you finish.** Before your final `return --finish`:
  1. Read the `DISPATCHES` block of your Page. Collect each open entry with `flint orbh wait <id>`, or write in your result why you drop it.
  2. Close each child that you told to `return --await` and that has no more work: `flint orbh close <id>`. An awaiting child whose parent has ended has no wake path. Do not use `discard` for a child that finished its work: `discard` records it as `abandoned`.

## Infrastructure: Supervisor, Reaper, Wake Engine

The per-machine orchestrator provides supervision, recovery and wake delivery — not task planning. It is not a waiter janitor; there are no per-session waiter processes to keep alive. The source is `packages/orbh/src/orchestrator/` (`supervisor.ts`, `tick.ts`, `sweeps/`) of the Flint monorepo.

**The supervisor** heartbeats its lease each second and starts one sweep tick every 15 s. It also supervises the manager processes: it reaps dead managers and orphaned runtime groups. That is not a step of the tick. After each tick it compares the build stamp that it loaded with the stamp on disk (`dist/.build-stamp.json` or `dist-dev/.build-stamp.json`). When a newer build is on disk for at least 10 s, it hands off between ticks to a successor that loads the new build, so no tick and no resume is cut (Task 723). A source run (`tsx`) never reloads.

**The tick** runs these steps in this order. "Each tick" means every 15 s; a step with a cadence runs when that time has passed since it last completed.

| # | Step | Cadence | What it does |
|---|---|---|---|
| 1 | sweep-pass | each tick | Lists the sweep-index markers of every scope and reads each marked spool projection whose file changed (a full pass every 5 min). The other steps read this pass from memory. |
| 2 | process-reap | each tick | Probes every row of the process registry; reaps dead and orphaned auxiliary processes. |
| 3 | change-feed-service | each tick | Starts the machine change-feed socket service on the first tick; a no-op after. |
| 4 | process-log-gc | 1 h | Deletes expired process logs that no registered process uses. |
| 5 | waiter-reap | each tick | Kills any leftover legacy persistent-waiter process. It spawns nothing. |
| 6 | human-channel | each tick | Keeps the human-channel Discord bot running where a scope enables it. |
| 7 | agent-discord | each tick | Keeps the agent-discord bridge running while it is configured. |
| 8 | job-barrier | each tick | **Enforcement only**: fails the timed-out jobs of a group barrier. It never resumes a session. |
| 9 | stale-job | 60 s | Reaps dead job wrappers and expired jobs. |
| 10 | account-usage | 60 s | Starts the usage refresh of the accounts of the fallback lists in the background. |
| 11 | account-switch | 60 s | Moves a headless session that stopped on a provider limit to a good account of the fallback list (only with a list and `autoMigrate` on). |
| 12 | limit-resume | each tick | Clears the limit wake of a limited child whose parent is gone or dispatched the same work again, so that step 13 does not resume it. |
| 13 | **awaiting-wake** | each tick; 6 s settling grace for a message, a barrier, and the other facts; no grace for a due scheduled wake | The wake engine. Resumes an `awaiting` session with one coalesced digest for messages, child results, group-barrier completion, station items, due scheduled wakes (`--wake-at`), terminal jobs, notices, and request and room activity. Skips a session with a live `page arm` lease or a lease of another machine. A change gate skips a session whose spool, children, and rooms did not change since a pass that found no wake. |
| 14 | dispatch | each tick | Clears stale dispatch stamps and the dispatch ledger (obligations, claims, children) that a dead collector or a Page delivery left. These writes are not wakes. |
| 15 | awaiting-dormancy | 1 h | Marks an awaiting session with no wake source for 30 days (the default) as dormant. A message or another wake source restores it. |
| 16 | station-ensure | 60 s | Triggers a station with queued work and no live bound session, under a locked claim. |
| 17 | cron | 60 s | Fires due cron schedules as new headless sessions. |
| 18 | workflow-reporter | 300 s; off unless `ORBH_WORKFLOW_HEAL=1` | Reports workflow clauses that fired with no result (report only). |
| 19 | spool-archive | 6 h and at the first tick; on unless `ORBH_SPOOL_ARCHIVE_SWEEP=0` | Moves old terminal session spools into the archive tier. |
| 20 | liveness | 60 s | Reconciles stranded runs of sessions that are `working` with no running run. |
| 21 | compaction | 60 s | Runs the pending compaction requests. |
| 22 | un-returned-reaper | each tick | Return discipline: at most two resumes of a turn that ended with no `return`, then `failed-unreturned` and awaiting. |
| 23 | stall | 60 s | Finds alive-but-stuck sessions from the new bytes of each live transcript and sends one advisory notice for each stall episode. It never kills. |

There is no separate scheduled-wake retry sweep: step 13 delivers a due `--wake-at` wake with no grace. Recovery is retried from durable spool facts, so a failure delays a delivery and does not lose it. The orchestrator does not exit while a keep-alive reason holds: a headless or subagent session that is not terminal, a configured human channel or agent-discord bridge, pending station work, an enabled cron schedule, or a connected change-feed client. It never makes an agent-level `interrupt` decision.

```bash
flint orbh orchestrator status [--json]
flint orbh orchestrator processes [--json]   # alias: ps — auxiliary-process registry + unregistered ghosts
flint orbh orchestrator launcher show|adopt|clear   # the machine-canonical launcher aux processes spawn through
flint orbh orchestrator ensure
flint orbh orchestrator restart             # hand off to a successor that loads the current build, between ticks
flint orbh orchestrator reap [--json]
```

See [[dev-knw-foh-fleets]] for declared fleets, [[dev-knw-foh-coordination]] for the full command surface, [[dev-knw-foh-page]] for the pager, jobs and barriers, [[dev-knw-foh-machinery]] for stations/cron/workers/workflows, and [[dev-knw-foh-profiles]] for live targets.
