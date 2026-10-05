---
description: "Durable Orbh machinery beyond the session — stations, cron schedules, workers, procedures, cross-session workflow chaining, and the update/approval/improve reporting channels"
orbh-sessions:
  - "[[0a96d4be-c368-430e-84a6-3ba0366bc6f8]]"
  - "[[ffb27033-03e2-4fb2-850c-a9f83a880880]]"
  - "[[5e7386c8-d7ac-4fbb-886d-6f9e5a41023b]]"
---

# Knowledge: Durable Orbh Machinery

Sessions, jobs and messages are the everyday surface ([[dev-knw-foh-cli]], [[dev-knw-foh-coordination]]). This file covers the durable objects that live *beside* sessions: service endpoints, schedules, unit-bound children, step registers, declarative chaining, and the sanctioned reporting channels. Read it before designing anything that has to outlive one turn or one agent.

Every command form below was checked against the installed binary's `--help`. Names and flags an agent actually needs are given; run `flint orbh <group> --help` for the rest.

## Stations — durable service endpoints

A station is an event-sourced durable object in the flint's `.orb` store, addressed `<flint>/<station>`. It is *the endpoint*; the sessions that serve it are interchangeable workers whose ids never leak to callers. A station owns three things:

- **address** — name + description: "what to send me".
- **duty** — the hosted workflow text every serving session is launched with as its duty prompt. Inspect it with `station show`.
- **shape** — `--mode resident` (one long-running bound session; in-place compaction never changes the session id, so the binding survives it) or `--mode oneshot` (a fresh session per item).

Delivery is **queue-first and unconditional**: the item is durably enqueued, then either the bound session is woken (station items are Page-worthy and wake an awaiting session), or the mode trigger launches one, or — if paused — it simply waits. Delivery failures cost latency, never data. The orchestrator's station-ensure sweep re-checks every 60 s under a locked claim, so a station with queued work and no live server self-heals without any daemon.

Items move `enqueued → claimed → answered | failed`. A bound session carries the `station-bound` interface key, which exempts it from awaiting-dormancy warnings.

You are either a **client** or a **server**:

```bash
# Client
flint orbh station send <name> "<text>"                      # fire-and-forget
flint orbh station request <name> "<text>" [--timeout 600]   # blocking, correlated answer

# Server (a bound session; claim/respond default to ORBH_SESSION_ID)
flint orbh station claim <name> [--item <id>]
flint orbh station respond-item <name> <itemId> "<answer>"
flint orbh station respond-item <name> <itemId> --fail --reason "<why>"

# Operator
flint orbh station create <name> --description <text> --mode resident|oneshot --agent <runtime/profile> (--workflow "<duty text>" | --workflow-file <path>)
flint orbh station list | show <name> | pause <name> | resume <name>
flint orbh station bind <name> [<sessionId>] | --release
```

If you are bound to a station, queued items appear on your Page and wake you while awaiting. Treat an unclaimed item as work you owe.

**Stations of a module.** A Flint module can desire a station (`flint module install <spec>`, then `flint sync`). Flint makes the station with the managed metadata `{ flintId, module: <record name>, key, declHash }`, and `station show` names the module, the key, and the settings file of the module (`Modules/<Name>.settings.toml`). Sync never takes a local station or a station of another module with the same name: that is a report. When the module no longer desires the station, or the module is uninstalled, sync pauses the station. It never deletes it.

**The station `dm`.** The module `dms` (`@nuucognition/module/dms`) desires the station `dm`: direct messages to the Flint. Its target, mode, and duty come from `Modules/DMs.settings.toml`. Each DM of `flint module dms send` is one item of this station, and the answer is `respond-item`. A DM needs the record of the module `dms` in the receiver Flint and a station `dm` with the marker of that record ([[knw-f-cli]] § Direct Messages).

## Cron — scheduled sessions

Minute-resolution 5-field cron expressions, stored in the Orb store of the flint. The per-machine orchestrator sweeps schedules every **60 s** and launches a fresh headless session with the schedule's prompt on its target; **no server is required**. Records the fire before launching, so a crash is findable rather than silent.

```bash
flint orbh cron create <name> --expr "*/30 * * * *" --prompt "<complete prompt>" --target claude/o5h \
  [--timezone <iana>] [--misfire coalesce|skip] [--overlap skip|allow] [--description <text>]
flint orbh cron list | show <name> | pause <name> | resume <name> | run-now <name> | delete <name>
```

- `--misfire` decides what a missed window means; `--overlap skip` suppresses a fire while the previous session is still `working`/`needs-input`.
- `run-now` does **not** fire immediately — it requests a fire on the next sweep.
- The launched session shares none of your context. Write the prompt as a complete brief.

**Local and module schedules.** The cron store is in the Orb store `.orb/` of the Flint, and Git ignores `.orb/`. So a schedule of `flint orbh cron create` is local to one machine: it does not travel with the Flint. To share a schedule, a Flint uses a module that desires it. The first-party module `crons` (`@nuucognition/module/crons`) desires one schedule for each table of its settings file `Modules/Crons.settings.toml`. Git carries the record and the settings file to each machine, and `flint sync` makes the schedule only on its owner machine. A person manages these schedules with the settings file and `flint module crons list|own|run|result` ([[knw-f-cli]] § Crons).

```toml
# Modules/Crons.settings.toml
machine = "katana"                       # the default owner: a machine slug, or a machine id (UUID)

[schedules.morning-brief]
expr     = "0 7 * * 1-5"
timezone = "Australia/Sydney"            # optional; default: the clock of the owner machine
prompt   = "Write the brief of the day."  # or prompt-file = "<path in the Flint>"
```

**Managed schedules.** A schedule that `flint sync` makes for a module carries the managed metadata `{ flintId, module: <record name>, key, declHash, machine }`. `machine` is the owner that sync stored; it is outside `declHash`, and a change of the owner writes a new definition.

- `flint orbh cron list` shows the record name of the module (`crons`) in the column `MANAGED`. `flint orbh cron show` names the module, the key, the owner, and the settings file.
- `flint orbh cron delete` refuses a managed schedule: change the settings of the module and run `flint sync`, or remove the module with `flint module uninstall <name>`.
- Change a managed schedule in the settings file of its module, then run `flint sync`. Do not pause or resume it with `flint orbh cron`: the next sync sets the state from the plan of the module again.
- Sync never deletes a schedule. When the module no longer desires it (a removed table, `enabled = false`), when it names another machine or no machine, or when the module is uninstalled, sync pauses the schedule on this machine and clears its pending manual fire. The fire history stays. A desired schedule with the same key resumes it.
- Sync never changes a local schedule. A desired schedule with the name of a local schedule, of a deleted schedule, or of a schedule of another module gets a report, and sync does not apply it.
- When sync leaves an enabled schedule on this machine and the orchestrator does not run, sync starts the orchestrator. `FLINT_CRONS_NO_ORCHESTRATOR=1` stops this, and every other automatic orchestrator start, the Blacksmith daemon included (for a test world).

**Fire-time check.** Before each fire of a managed schedule, the cron sweep checks three facts of the Flint, with no module process: `flint.toml` has the record of the module that the marker names (a legacy table `[modules.<id>]` is not a record), the module is installed (a build in `Modules/` whose manifest parses), and the owner in the marker is this machine. Else it skips the fire with the reason `ineligible`, and the detail names the cause (`declaration-absent`, `declaration-invalid`, `other-machine`, `unknown-machine`, `unowned`). So an uninstall of the module stops its schedules at once, also before the next sync. A marker with no owner (made before Flint stored the owner) is `unowned`: run `flint sync` on the owner machine. The check does not read the settings file: a change of the settings takes effect at the next sync, and an edit of a prompt file with no sync does not stop a schedule.

## Workers — one object, one unit of work

A worker is a headless session bound to exactly one unit of work *and* to a conversational surface. Its parent spawns it with a self-contained brief; it narrates on its own update stream, awaits while it waits, converses with a human in its own thread, and **returns exactly once** — that return resolves the parent's collection through the normal child-result wake.

```bash
flint orbh worker spawn "<brief>" [--unit "<Mesh title>"] [--label <l>] [--target <runtime/profile>]
flint orbh worker list | show <ref>
flint orbh worker collect <ref> [--peek | --all]     # ref = worker id, backing session id, or label
flint orbh worker say "<text>" [--worker <ref>]
flint orbh worker kill <ref>
```

How it differs from the shapes you already know:

| Shape | Blocking? | Durable unit? | Human surface? |
|---|---|---|---|
| `request -q` subagent | yes — you block on the correlated result | no | no |
| `worker spawn` | **no** — the result arrives as a child-result wake | yes, named | yes, its own thread |
| bare `launch` peer | no, and no collector at all | no | no |

`worker collect` reads updates from **your own durable cursor without waking the worker** — the cheap supervision primitive. The native surface (its session spool) is always present and is never a binding; external surfaces (a Discord thread) are bound projections, and losing one loses nothing.

## Procedures — a deterministic step register on your session

Attach ordered steps to a session; the cursor advances only on an evidence-bearing check-in. **One active procedure per session** (`start` is refused while one is live).

```bash
flint orbh procedure start --title "<t>" (--steps "read spec;implement;verify?" | --from <file>) [--enforced]
flint orbh procedure step <n> --update "<what you actually did>"
flint orbh procedure skip <n> --reason "<why>"          # skippable steps only
flint orbh procedure show | list [--all] | finish | abandon --reason "<why>"
```

- Steps come from a `;`-separated list (a trailing `?` marks a step skippable) **or** from `--from <file>` (numbered items → top-level bullets → `##` headings) — the two are mutually exclusive and one is required.
- `step <n>` must name the current step and **is refused when `--update` is empty**. Evidence is the point.
- `finish` is refused while required steps are outstanding; `abandon` is the honest escape hatch.
- **`--enforced` has teeth**: a session with outstanding required steps cannot run `session return --finish`, and cannot `flint orbh end` itself. `--await` is unaffected, and an operator can still end it from outside.
- `step`, `skip`, `finish`, and `abandon` fire the workflow chokepoint (`start` does not), which is what `workflow after-procedure --step <n>` hangs off.

## Workflow chaining — declarative continuation across sessions

`workflow` means **durable cross-session chaining**, not per-session state. You arm a **clause** on a subject — a session's *next* return, or a procedure step / finish — and a chokepoint fires it, launching the clause's prompt as a child.

```bash
flint orbh workflow dynamic start --title "<t>" [--max-children <n>]   # empty instance to hang clauses on
flint orbh workflow after <session-id> --then "<prompt>" [--on finished|failed|any] [--target <runtime/profile>] [--wf <id>] [--label <l>]
flint orbh workflow after-procedure <procedure-id> [--step <n>] --then "<prompt>" [--on …] [--wf <id>]
flint orbh workflow arm <name-or-path> [--args k=v] [--max-children <n>]   # static shipped definition
flint orbh workflow manage <id> --target <runtime/profile> [--wake-on clause-failed,child-failed,all-clauses-done]
flint orbh workflow show <id> | list | close <id> | cancel <id>
flint orbh workflow fire-event --kind session-returned --session <id>
flint orbh workflow fire-event --kind procedure-step --procedure <id> --step <n> --outcome done|skipped|failed
flint orbh workflow fire-event --kind procedure-finished --procedure <id> [--outcome finished|abandoned]
```

What matters when you use it:

- **Arm-time anchor.** Trigger subjects are resolved and anchored when you arm. A clause armed on "the NEXT return" cannot be settled by the turn before it, and a `pending` verdict leaves the clause armed.
- **Firing is in-process.** `session return` (every disposition), a self `flint orbh end`, and the mutating procedure verbs (`step`/`skip`/`finish`/`abandon` — not `start`) fire the chokepoint themselves. Failures there are non-fatal by design — a workflow error never breaks your `return`. `fire-event` is the manual driver / repair path, not the only one. (Its own help string still says harness chokepoints will call it "in a later integration wave" — that wave has landed; the string is stale.)
- **Templates resolve at fire time.** `--then` prompts keep `{{…}}` tokens until they fire, including `{{result:subject}}` and `{{result:<label>}}`.
- **`--target` defaults to `claude/o5h`** for launched children; `arm --max-children` defaults to 16.
- **`manage` attaches a pure consumer.** The manager is woken with a digest; it never collects children and never advances clauses. Do not write one that tries to.
- `close` discharges the duty and `cancel` abandons it; either way armed clauses stop matching.

The old per-session `workflow start / advance / check` surface was removed. Use a **procedure** for step state on your own session.

## Reporting: `update`, `approval`, `improve`, `humanchannel`

| Verb | Use it when | Blocking? |
|---|---|---|
| `update` | You want durable, visible progress narration — a finding, a decision, a completed unit, a blocker. Strictly better than stdout, which nobody reads. | No |
| `approval` | A **headless root** needs a typed human decision (`approve` / `refine` / `reject`) and must not stop working. A subagent should hand the decision to its dispatcher instead of opening its own gate. | No — the verdict wakes you later |
| `improve` | The tooling itself is wrong. Files a structured bug/improvement through the `improve` **station**, which routes it to a fixer session. | No, unless `--request` |
| `humanchannel` | **Operator only.** It configures the machine-wide human-input channel the other three ride on. A session should never run `setup`; `status` is at most diagnostic. | — |

```bash
flint orbh update "<text>" [--kind finding|decision|completed|blocker]
flint orbh update list [<sessionId>] [--fleet] [--limit 20]
flint orbh update flush [<sessionId>]                # bypass the 60s coalesce window

flint orbh approval request "<title>" [--body "<proposal>"]
flint orbh approval list | show <id> | respond <id> approve|refine|reject [comment…] | say <id> "<text>" | finish <id>

flint orbh improve "<what is wrong>" [--title <t>] [--category bug|improvement] [--evidence "<ids/commands/paths>"] [--request] [--timeout 600]
```

Updates are appended to your session spool and mirrored outward on a ~60 s coalesce window; `update flush` bypasses it. An approval verdict queues a wake message back to the requesting session, so you learn about it at your next wake without polling.

## Where to go next

- Turn dispositions, `--wake-at`, `--until-group`, global store flags: [[dev-knw-foh-cli]]
- The pager, wake delivery, jobs and barriers: [[dev-knw-foh-page]]
- Peers, subagents, messages, rooms, `peek`/`timeline`/`switch`/`fork`: [[dev-knw-foh-coordination]]
- Delegation shapes and the orchestrator sweeps that drive stations and cron: [[dev-knw-foh-orchestrator]]
- Slices, store layout and maintenance: [[dev-knw-foh-internals]]
