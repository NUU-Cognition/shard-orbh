---
description: "The Page family — introspection, the one-shot pager and wake delivery, the Page after a compaction of the harness, the KIN and PARTY lines, the INVOCATIONS block of shard invocations, awaiting hygiene, procedures, background jobs, group barriers, and scheduled wakes"
orbh-sessions:
  - "[[d1f03280-e10d-413f-a040-70c3a84feb66]]"
  - "[[521efa86-61d9-4156-92ba-c40ef56d9e3d]]"
  - "[[1e7717cf-c6b0-4706-a149-ed479bd341cd]]"
  - "[[25f11f9b-67f7-46e6-ad6d-3089b3131066]]"
  - "[[0a96d4be-c368-430e-84a6-3ba0366bc6f8]]"
  - "[[79de8b0a-567e-459f-a720-182c53f09b46]]"
  - "[[0e5e27b5-779f-4068-941e-a93a7a39d3c8]]"
  - "[[7becb153-fc6a-4037-a359-23744241a409]]"
  - "[[ec13c5bf-9eab-4982-b35a-cffc13d48950]]"
  - "[[1762640c-f5b8-48de-b6fc-8f7b2f91dcf1]]"
orb:
  - "@v1/nuucognition/session/9010418b-f6be-418d-8b5c-95dfff830c8a#flint/nuu-orbh"
  - "@v1/nuucognition/session/df2c23ae-f402-4485-b1a3-bf5005470d4e#flint/nuu-orbh"
orbh-fleet: kinship-1020
---

# Knowledge: The Page, Pager, Jobs & Procedures

The Page is your session's on-demand introspection surface. It combines core and shard Page functions over the durable session store. Read it at meaningful seams: first action on resume, before ending a long turn, after a subagent batch, at procedure boundaries. Act on `⚠` lines.

```bash
flint orbh page                               # Render your own Page; self reads may drain/update Page state
flint orbh page <id>                          # Read-only observer view of another session
flint orbh page --raw                         # Label each function's output by id
flint orbh page --no-mutate                   # Force a read-only self render
flint orbh page run <source>/<name> [args…]   # Invoke one Page function
flint orbh page arm [id] [--max-wait <s>]     # One-shot pager; use background execution
```

## The Pager and Wake Delivery

There is no standing waiter process. Delivery has exactly two paths, and which one is live depends on whether your turn is running.

**During a live turn — managed delivery or the pager.** Run `flint orbh page status` first. `MODE managed` means the manager holds a harness event connection and submits every Page to you as native tool output (Codex through the App Server, Claude through its inbox socket, Muse through its host; interactive and headless alike since Task 682, and headless Codex through the Orbh Codex host since Task 702 unless `ORBH_EVENT_DELIVERY=off` keeps it on `codex exec`): do not arm a shell pager. In any other mode, run `flint orbh page arm` through your harness's background execution. It is a one-shot long-poll owned by your *current run*: it claims a run-scoped lease in `core:page-arm`, watches your spool, and exits with a full Page render the moment a message, terminal job, child result, request answer, room event, station item, group-barrier completion, due scheduled wake, or 80% context advisory lands. Your harness surfaces that as a background-task notification. It fires once — arm again after it fires while latency matters. It expires after 2 h by default (`ORBH_PAGE_ARM_TTL_SECONDS`; unbounded for interactive sessions), and exits early with `page arm superseded by a newer arm` or `session ended — pager exiting`. If it says the latter, or you are about to return, do not arm again. A second arm for the same run is refused as `page arm already active for this session (pid N); not starting a second` — that is correct, not an error.

`--max-wait <seconds>` bounds *your* latency rather than the pager's usefulness: at the deadline it emits a heartbeat Page render and exits instead of erroring. Omit it to wait until the TTL.

**What the manager sends.** In `MODE managed`, the manager sends a Page in three cases:

1. **A wake.** A Page-worthy event lands: the same events that end `page arm`.
2. **The context advisory.** The context of the run is at 80% or more. The manager sends this Page one time for each run.
3. **A compaction of the harness.** The harness replaced its context in place, for example Claude Code at the limit of its context or after `/compact`. The manager sends one Page after each such compaction. Its first line is `Context compacted: this is your Page. Read INVOCATIONS to continue where you are.` (or `… Read it to continue where you are.` when the Page has no INVOCATIONS block). Read the Page first, then continue from its `read:` and `next:` lines. See [[dev-knw-foh-compaction]].
4. **A party notice to a working session.** The session works, and it has a party notice that no Page showed yet. This reason is only for a working session: the orchestrator sweep and the pager never wake an awaiting session for a party notice. The manager reads the session again before each send and each retry. When the session no longer works (for example, it returned with `--await`), the manager does not send that Page, and the notice stays pending. See § The KIN and PARTY Lines.

The manager never sends a Page while the pager is held (from `compact start` to `compact finish`). An Orbh compaction thus gets no Page from the manager: the relaunched context reads the Page itself. A harness that writes no compaction record (for example Grok, Kimi, or Cursor) gets no Page after its compaction. When no Page comes, run `flint orbh page` yourself.

**With no arm on a working turn, nothing is watching you.** Events are not held by any process; they accumulate as durable spool state and surface at your next Page read or at your turn boundary. A missed re-arm costs latency, never events: the delivery cursor lives in `core:waiter-state` and only advances when a Page is actually rendered.

**Between turns and while awaiting — the machine orchestrator.** Once your turn ends and the session is `awaiting`, the machine-wide Orbh orchestrator sweep owns delivery. Its business sweeps run about every 15 s (the 1 s loop underneath is only supervision heartbeat), it waits ~6 s for a wake fact to settle, then coalesces everything pending into one digest and resumes you with it as a new turn's prompt. Overdue scheduled wakes get a second retry net every 15 s. The sweep steps aside for any session holding a live `page arm` lease, so the two paths never double-deliver. Awaiting is therefore the only headless self-pacing primitive: `return --await` and let the sweep wake you.

### Waiting Inside a Turn

A background task belongs to the process of the current run, not to the session. When a headless turn ends, the process exits and kills its background tasks. Their output is lost, and the work must run again. Choose one of these forms:

1. **You have other work.** Run the wait in background execution and continue. Collect the result when its notification arrives, in this turn.
2. **You have no other work, and the wait is shorter than your tool timeout.** Block in the foreground on one command that ends with the event: the build itself, `flint orbh wait <id>`, or `flint orbh job wait <id>`.
3. **The wait is long, or another session owns the event.** `return --await`, with `--until-group <g>` or `--wake-at <when>` when they apply. The orchestrator wakes you with a digest. A subagent that returns sends this turn's result to its collector, so a subagent uses this form only when its dispatcher allows `--await`.

Do not use these forms:

- A last message such as "I wait for …" with no `return`. The turn ends there, and the background task dies.
- Background `sleep` calls as a timer. Each one returns at once, so each check is a full model call.
- `until grep …; do sleep …; done` on a log file, or a loop over `flint orbh list`. Wait on the event itself.
- A foreground loop that blocks an interactive session for hours. The human cannot use the session while it runs.
- A routine `--timeout` on a collector. Each timeout ends the collector early and costs a turn only to start it again.

## Hygiene and Awaiting Surfaces

- On an unattached working headless turn the Page shows `⚠ paging not armed — mid-turn delivery is delayed; run 'flint orbh page arm' in the background when latency matters (the orchestrator sweep owns between-turn wake delivery)`. Arm if you are coordinating live; ignore it on a heads-down turn. There is no such warning while awaiting — that state needs no pager.
- `⚠ long gap since last self-check (Nm) — re-read the Page at the next seam` means exactly that: read the Page.
- `PAGER  held for compaction since …` means `compact start` suspended paging on purpose. `compact finish`, `compact abort`, or any alternate turn-ending `session return` releases it, and nothing is lost while held — a later arm resumes from the same durable cursor. See [[dev-knw-foh-compaction]].
- An awaiting Page renders `AWAITING since … · last woken by …`, derived from durable events.
- `flint orbh list` has a dedicated **Awaiting** section with awaiting duration and last-woken source; dispatch children are trees by default.
- A session that is still `awaiting` beyond `ORBH_AWAITING_DORMANCY_DAYS` (default 7) shows `⚠ awaiting Nd with no activity — consider retiring`. A station-bound session is exempt.

Self Page reads may mutate Page counters and drain inbox state; observer reads do not. Page functions fail independently with a warning. Treat `core:*` interface slices as reserved.

Other env knobs on this surface: `ORBH_PAGE_SELF_CHECK_GAP_MS`, `ORBH_PAGE_STALE_DESC_READS`, `ORBH_PAGE_RETURN_DISCIPLINE_READS`.

## The TASK Line (`core/task`)

The core function `core/task` shows the task pin of the session, right after the `FLEET` line. It shows one line while the session pins a task or a task group (`flint orbh task pin`), and nothing when the session has no pin:

```
TASK  Build the pin · doing · built · @v1/nuucognition/task.dev/k17abc0def#ops
TASK  Build the pin · doing · built · @v1/nuucognition/task.dev/k17abc0def#ops · sync pending
TASK  group Wave 1 · 2 tasks · @v1/nuucognition/taskgroup/k99group01#ops
```

- A task shows its title, its status (`todo`, `doing`, or `done`), its stage when it has one, and its address.
- A task group shows `group`, its title, its count of tasks, and its address.
- `sync pending` means that Ops does not have the attach of the session yet. Run `flint orbh task sync`.
- The line reads only the session keys `core:task` and `core:task-info`. It makes no network call, so the values are the values of the last `pin`, `show`, or `sync`. Run `flint orbh task show` to refresh them from Ops.
- When `core:task` holds an address with no record, the line shows only the address.

The verbs and the keys are in [[dev-knw-foh-cli]] § The Task Pin.

## The WISP Line (`core/wisp`)

The core function `core/wisp` shows the wisp of the session, right after the `TASK` line (task jn77hb87). It shows one line while the session is in a wisp, and nothing otherwise:

```
WISP  Rural Amazed Moonbeam · active · purpose: Build the lineage view · memory <orbRoot>/spaces/flint/spools/<wispId>/scratch/memory
WISP  Rural Amazed Moonbeam · ended · memory <orbRoot>/spaces/flint/spools/<wispId>/scratch/memory
```

- The line shows the proper name of the wisp, its state (`active`, `ended`, or `consumed into <kind> <id>`), the first 100 characters of its purpose, and its memory folder.
- Read `MEMORY.md` in the memory folder when you start or resume. The rules of the memory are in [[dev-knw-foh-identity]] § Its Memory.
- The title of the session shows the initials of the name: `<Initials> | <title>` (for example "RAM | Fix the login").
- The line is read-only. `flint orbh wisp show` makes a missing memory folder.

## The KIN and PARTY Lines

The core functions `core/kin` and `core/party` show two kinds of line right after the `WISP` line (task jn7d0191). The order is `FLEET`, `TASK`, `WISP`, `KIN`, `PARTY`, and then the procedure. The lines use the same reader and summary as `flint orbh kin`, `inspect`, `peek`, and the chrome.

```
KIN  independent · 2 children · 0 siblings
KIN  embodies wisp Helpful Shimmery Autoharp · 0 children · 0 siblings
KIN  forked from 5aa9a295 · 0 children · 1 sibling · consumed into 833dd8ce 12:23
KIN  child of 647fed45 · 0 children · 3 siblings · consumed into 833dd8ce 12:23 · ⚠ revived after consume: the obligations are with 833dd8ce
PARTY  review-crew (3) · side-crew (1)
PARTY  ✉ Fork Child joined review-crew (14:26)
```

**The `KIN` line:** `KIN  <origin> · <n> children · <n> siblings[ · consumed <n> sessions][ · consumed into <ref> <HH:MM>][ · ⚠ revived after consume: the obligations are with <ref>][ · revived after an end <HH:MM>]`.

- **A ref** is the short id of a session, or `wisp <Wisp Name>` for a wisp. The counts use plurals: `1 child`, `2 children`, `1 sibling`.
- **The origin segment** is one of: `child of <ref>`, `sibling of <ref>`, `successor of wisp <Wisp Name>`, `forked from <ref>`, `born from <n>` (more than one parent) or `born from <ref>`, `embodies wisp <Wisp Name>`, `independent`, or `no recorded origin`.
- **The children count** holds the kinship children and every dispatch child of the store, as `inspect` counts them.
- **The siblings count can be a lower bound.** It then shows as `N+` (for example `256+ siblings`), or with no count.
- **No counts:** when the store does not list its sessions in 1.5 seconds, the line gives no counts. Run `flint orbh kin` for them.
- **`consumed <n> sessions`** shows on a consumer. **`consumed into <ref> <HH:MM>`** shows on a source.
- **The revive facts.** `⚠ revived after consume` means that the session runs again after a consume: its obligations are with the consumer. Do not collect a moved child, answer a moved request, or continue a moved frame ([[dev-sk-foh-read_kinship]]). `revived after an end <HH:MM>` means that the session runs again after a close. It is a fact, not a warning.

**When the `KIN` line shows.** It shows when the session has one of these facts:

- an origin that is not a plain dispatch and not `independent`;
- a consume, as the consumer or as a source;
- a revival;
- a node that has this session as its anchor (a sibling);
- a kinship child that is not a dispatch child.

A plain dispatch child has no `KIN` line: the `DISPATCHES` block of its parent and its subagent prompt cover it. An `independent` origin alone, dispatch children alone, and a gained wisp alone give no line either. The `WISP` line shows the wisp.

**The `PARTY` lines:** `PARTY  <handle> (<n>) · <handle> (<n>)` gives each open party of the identity of the session with its count of members. A session that acts as a wisp also gets the parties of the session itself. Then one line comes for each undelivered notice: `PARTY  ✉ <label> joined|left|closed <handle> (<HH:MM>)`. After 10 notice lines, one more line gives the count of the rest: `PARTY  ✉ <n> more notice(s): the next Page shows it/them`.

- **A self Page read shows each notice one time and marks it delivered.** It marks only the notices that it shows. The rest stay pending, and the next Page shows them. The managed Page of a working session marks in the same way.
- **The marks need a full render.** The marks run after the Page is assembled, inside the time of one Page function (`ORBH_PAGE_TIMEOUT_MS`, 5 seconds by default). When `core/party` failed, timed out, or was cut by the size limit, the Page marks nothing, and the notices show again on the next Page.
- **These reads mark nothing:** a Page read of another session (`flint orbh page <id>`), a Page with no mutation (`--no-mutate`), and one function run (`flint orbh page run core/party`).
- **A notice never wakes an awaiting session.** It shows at the next turn.
- The verbs and the rules are in [[dev-knw-foh-membership]] § Parties. The full view is `flint orbh kin` ([[dev-knw-foh-kinship]] § The Views).

## The INVOCATIONS Block (`flint/invocations`)

The block `flint/invocations` shows the **stack** of the session: its open shard workflow invocations (the frames), from the root to the top. It is a Flint page function. Orbh runs it as it runs each shard Page function, and Orbh does not read it. The block is absent when the session has no open frame. A load (`flint shard start`, or `flint shard invoke <ref>` with no workflow) is not a frame.

```
INVOCATIONS  you are in: rpt create · (Task) 744 Nested Invocations
  proj do_task · (Task) 744 Nested Invocations · step report          inv-fb060af91e0d · 40m
  └─ rpt create · (Task) 744 Nested Invocations · step 1/2 create ●   inv-8ca539af73bf · 2m
       read:  Stage 1: Report Creation of Shards/Reports/workflows/wkfl-rpt-create.md
       next:  Create the report. Then set the output: flint shard invocations set-output 'inv-8ca539af73bf' report='(Report) NNN Title'.
              flint shard step done create --evidence '<…>'
       close: --with task-confirm · --with task-defer
       return: --with task-confirm · --with task-defer
```

| Line | Meaning |
|------|---------|
| `you are in:` | The top of the stack: the innermost open frame of this session. `●` marks its row. |
| A frame row | One open frame: the shard and the workflow, the subject, the current step (`step n/total <id>`), the invocation id, and the age. A child is under its parent (`└─`). |
| `part of:` | The frame has its parent in another session (or the parent is closed). The line names the parent frame and the first 8 characters of its session. |
| `toward:` | `toward:  <shard> <workflow> (after this frame closes done)`: the frame was opened with `--toward '<shard> <workflow>'`, so it makes its artifact ready for that workflow. When the frame closes `done`, the close checks that workflow first and prints its command. The workflow can do less toward a target (for example, no confirm of a person): read its `# Invocation` section. |
| `read:` | The stage of the Markdown workflow to read again for the current step. |
| `next:` | What to do for the current step: the hint text of the step, then the exact commands. Each value in a command is in POSIX single quotes. Run a command as it is, and replace only `<…>`. |
| `close:` / `return:` | The opt-in behaviours of all open frames, as the `--with` flags of `flint orbh close` and `flint orbh session return` ([[dev-knw-foh-cli]] § Behaviours of Shard Invocations). |
| `✘ <behaviour> failed` | The last run of that behaviour failed. The reason follows. |

How to use it:

- Read INVOCATIONS first after a wake, a resume, or a compaction. It tells you where you are with no memory of the earlier context.
- Read the stage in `read:`. Then do `next:`. `flint shard step` prints the same lines for the top frame, and `flint shard invocations stack` prints the whole stack.
- Each write to a record (`flint shard invoke`, `flint shard step done|skip`, `flint shard invocations set-input|set-output|close`) ends with the same `now:`, `read:`, `next:`, and `part of:` lines. After a child closes, the first line is `back in:` and names the parent. One pure function makes the text for the CLI, the Page, and Steel, so they agree.
- A `done` close of a frame can print the next workflow: `ready:` and `next:` (its `invoke` command), or `not ready:` with the ways. The block then has no frame for it: the next workflow is not open. Give the command to the person, or put it in your result.
- In a headless or subagent session, the frames run in the headless mode: follow the `> [!headless]` callout of the stage in `read:`. A step that only a person can do is skipped at the open, so `now:` does not show it.
- The Page gets the mode of the session in its payload (`sessionMode`). A child command of `next:` names `--mode` only when the mode of the frame differs from the mode of the session, as the CLI hint does. Thus the Page, `flint shard step`, and `flint orbh page run flint/invocations` give the same command.

The steps, the hints, and the record are in [[knw-f-invocations]] (Flint shard).

## Procedures: Durable Step State

A **procedure** is the per-session step register — ordered steps, a cursor, forced evidence check-ins — and it renders on the Page, so it survives context loss.

A shard workflow does not use a procedure. Its steps are in its invocation record, and the INVOCATIONS block shows them. Use a procedure only for work that is not a shard workflow. See [[dev-knw-foh-machinery]] § Procedures.

```bash
flint orbh procedure start --title "<t>" (--steps "read spec;implement;verify?" | --from <file>) [--enforced]
flint orbh procedure step <n> --update "<what you actually did>"
flint orbh procedure skip <n> --reason "<why>"
flint orbh procedure show | list [--all] | finish | abandon --reason "<why>"
```

- One active procedure per session; `start` is refused while one is live. A trailing `?` on a step marks it skippable; `--from <file>` extracts steps from markdown.
- `step <n>` must name the current step and **is refused when `--update` is empty**.
- `finish` is refused while required steps are outstanding; `abandon` is the honest escape hatch.
- **`--enforced`** blocks `session return --finish` and a self `flint orbh end` while required steps are outstanding. `--await` is unaffected, and an operator can still end the session from outside.
- `step`, `skip`, `finish`, and `abandon` fire the workflow chokepoint (`start` does not), which is how cross-session clauses hang off individual steps — see [[dev-knw-foh-machinery]].

Closing a procedure does not replace the turn's required `session return`.

## Background Jobs

```bash
flint orbh job run "<command>" [--group <g>] [--timeout <s>] [--session <id>]
flint orbh job run --agent <runtime/profile> "<prompt>" [--group <g>] [--timeout <s>] [--account <name>]
flint orbh job list
flint orbh job result <id>
flint orbh job wait <id> [--poll <ms>]
flint orbh job clear [--all]
```

An agent job wraps `request -q`; the subagent's correlated result becomes job output. `job result` can read retained output while running, and `job wait` blocks until terminal. The reaper marks expired jobs failed. An agent job follows its child session when the wrapper ends without a result: when the child stops on a usage limit, the job stays `running` and `job list` shows it as `blocked` until Orbh resumes the child after its reset or an account move; then the job ends with the result of the resumed turn. Do not re-dispatch a blocked job: the second session would do the same work. When the wrapper dies while the child works, the job also follows the child; a dead wrapper with no child fails the job. Groups are all-terminal barriers: failure resolves the barrier too, and retries remain explicit.

`job run` and the other job verbs accept `--session <id>` for explicit cross-session mutation; use it only when you own orchestration of the target. `job complete <id>` is registered but **internal** — it is how the background wrapper records a terminal status. Do not call it.

### Await a Job Group

The modern in-turn form is `session return --await --until-group`, because it delivers the turn's result to your collector **and** arms the barrier in one verb:

```bash
flint orbh job run --agent codex/solxh "review module A" --group fan
flint orbh job run --agent codex/solxh "review module B" --group fan
flint orbh job run "pnpm test" --group fan --timeout 1800
flint orbh session return --await --until-group fan "Fan-out dispatched; awaiting the wave."
```

`flint orbh park [id] --until-group <g> [--barrier-timeout <s>]` is the legacy/operator spelling. It carries no turn result. `--barrier-timeout <s>` force-resolves the barrier: it marks the group jobs that still run as failed, so a session can never be stranded. `session return --await --until-group <g> --barrier-timeout <s>` accepts it too.

The barrier holds the per-job wakes of its own group: you wake one time, when every job of the group is terminal. Messages, requests, subscribed room activity, station items, a job of another group, and a child notice that needs a decision (for example `failed-unreturned`, or a usage limit whose reset is more than 5 h away) still wake you before the whole group is terminal. A usage-limit notice with a nearer reset does not wake you: the child resumes by itself. After an early wake the barrier stays, and its `--barrier-timeout` still holds: at the timeout Orbh fails the jobs of the group that still run and signals their process groups. On wake, inspect `job list` and use `job result <id>` for full output. Plain `park`/`--await` clears a stale barrier directive.

Note which sweep does what: the orchestrator's **barrier sweep is enforcement-only** — it fails timed-out jobs and never resumes a session. The awaiting-wake sweep is what actually wakes you when the barrier is satisfied.

### Scheduled Self-Wake

```bash
flint orbh session return --await --wake-at +45m "<durable state>"
flint orbh session return --await --wake-at 2026-08-04T09:00+10:00 "<durable state>"
```

`--wake-at` is the one primitive that lets an awaiting session experience **time** rather than only events — poll a slow external system, stage a wave, revisit a decision. It requires `--await`. Formats are an ISO 8601 **datetime** or a `+duration` (`+45m`, `+2h`, `+1h30m`, `+1d`); a bare calendar date is rejected on purpose, and the ceiling is 365 days. The resolved time lands in the interface key `core:wake-at` *before* the turn ends, so the session is never observably awaiting without its schedule. **An `--await` with no `--wake-at` retires any schedule from a prior turn**, and terminal verbs retire it too. The orchestrator's scheduled-wake sweep is the retry net: it re-checks every 15 s and concludes a timer was missed after 60 s of overdue slack.
