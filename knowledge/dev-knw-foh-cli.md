---
description: "Core `flint orbh` reference — targets and the default target list, turn dispositions and wake scheduling, awaiting, session verbs, collection, operator lifecycle, accounts, store scoping, hygiene surfaces, and deeper references"
orbh-sessions:
  - "[[e07fc648-1ec0-4bf7-bc78-3de4e566702a]]"
  - "[[d1f03280-e10d-413f-a040-70c3a84feb66]]"
  - "[[25f11f9b-67f7-46e6-ad6d-3089b3131066]]"
  - "[[0a96d4be-c368-430e-84a6-3ba0366bc6f8]]"
  - "[[9eb39a19-e277-46e8-92af-127d080c3ed1]]"
  - "[[0e5e27b5-779f-4068-941e-a93a7a39d3c8]]"
  - "[[65e535a9-3f77-404f-80b7-32bd43e9ca77]]"
  - "[[78241877-1d07-40de-882e-06a58eb86e19]]"
  - "[[de92a197-8d6d-4af9-8883-127de32460ee]]"
---

# Knowledge: Flint OrbH CLI Reference

Run `flint orbh --help`, `flint orbh <cmd> --help`, and group help for the authoritative surface of the **installed binary**. A source checkout may be newer than that binary until it is rebuilt, so when implementing or documenting unreleased source, verify the command registrations in `apps/orbh-cli/src` as well. This file covers the verbs used inside a session and maps to deeper references.

## Where the Depth Lives

| File | Load when you need |
|------|--------------------|
| [[dev-knw-foh-profiles]] | Exact `runtime/profile` selection, and the default target list |
| [[dev-knw-foh-coordination]] | Peers, collected subagents, turn-correlated results, messages, rooms, and intervention |
| [[dev-knw-foh-page]] | Page, the one-shot pager and wake delivery, procedures, jobs, group barriers, scheduled wakes |
| [[dev-knw-foh-machinery]] | Stations, cron sessions, workers, procedures, workflow chaining, updates, approvals, `improve` |
| [[dev-knw-foh-internals]] | Orb spool and store layout, lifecycle derivation, result streams, delivery slices, spaces, bundles, and repair |
| [[dev-knw-foh-orchestrator]] | Delegation shapes, recursive managers, and the orchestrator's supervisor/reaper/wake-engine role |

## Lifecycle Orientation

- A session is a durable event-sourced Orb spool; a headless/subagent run is one **turn**.
- `workState` has five values: `working | needs-input | awaiting | finished | abandoned`.
- Every headless/subagent turn ends with `session return --finish` or `--await`; finish is the default.
- `awaiting` is dormant and wakeable, not terminal. Parked retention is how the compatibility layer shelves awaiting sessions; park and await are not different lifecycle meanings.
- A session may return many turn-level results. Collectors correlate to initiated runs, not session terminality.
- An exit without return is re-prompted at most twice; exhaustion becomes `failed-unreturned` and `awaiting`.
- Abandonment covers explicit operator verdicts (discard/kill) and liveness reconciliation of confirmed-dead working runs (`flint orbh reconcile`, `endReason: lost`).

## Targets and the Default Target List

A target is `runtime/profile` (`claude/o55h`) or a bare runtime (`claude`). `i`, `launch`, and `request` take it as the first argument, and each can omit it:

```bash
flint orbh i                                   # Interactive, on the first available target of the default target list
flint orbh launch "<prompt>"                   # A headless peer on the default target
flint orbh request -q "<prompt>"               # A collected subagent on the default target
flint orbh i claude                            # A bare runtime: the first target of the list for that runtime (claude/o55h)
flint orbh i codex/a6h                         # An explicit target: it never falls back
flint orbh profiles default [--json]           # The list, the layer of each entry, and the state of each target
flint orbh profiles default set <target>...    # Write the machine layer (defaultTargets in ~/.nuucognition/orbh/settings.json)
flint orbh profiles default set --flint <target>...   # Write the Flint layer ([orbh] default in flint.toml)
flint orbh profiles default unset [--flint]    # Remove a layer
```

The shipped list is `claude/o55h`, then `codex/a6h`. The Flint layer wins over the machine layer, and the machine layer wins over the shipped list; a higher layer replaces the list. The launch prints `Target: <target> (default list)` and one `<target> skipped: <reason>` line for each target before it. A target is skipped when its CLI is not installed, its profile does not exist, the account of the launch (`--account`, else a dispatcher of the same runtime) does not exist or has an active limit marker, or its login is known to be expired. With no available target, the launch refuses (exit 1) with one `Next:` command. The selection happens only at launch: a running or resumed session keeps its target. A `-p` value that starts with `-` is refused. Full rules: [[dev-knw-foh-profiles]].

## Session Commands

When `ORBH_SESSION_ID` is set, omit your own ID:

```bash
flint orbh session register "<title>" "<description>"
flint orbh session set <key> <value>
flint orbh session get <key>
flint orbh session return --finish "<result markdown>"
flint orbh session return --await "<result markdown>"
flint orbh session return --await --wake-at <when> "<result markdown>"
flint orbh session return --await --until-group <group> "<result markdown>"
flint orbh session ask "<question>" [--timeout <seconds>]
flint orbh session note "<text>"
flint orbh artifact <id> "<path>"
```

Explicit form is `flint orbh session <id> <action> [value...]`. `--finish` and `--await` are mutually exclusive. Omitting both on `return` means finish.

### Scheduling the Next Wake

Both scheduling flags **require `--await`** — a finished session has no next wake, and using either with finish exits 1.

- `--wake-at <when>` takes an ISO 8601 **datetime** (`2026-08-04T09:00`, `2026-08-04T09:00+10:00`) or a `+duration` matching days/hours/minutes/seconds (`+45m`, `+2h`, `+1h30m`, `+1d`). A bare calendar date is rejected deliberately, since it would silently mean UTC midnight; the ceiling is 365 days, and a time already past means wake immediately. The resolved time is written to the interface key `core:wake-at` *before* the turn ends, so the session is never observably awaiting without the schedule it asked for. **A later `--await` with no `--wake-at` retires the prior schedule**, as do finish/kill/end.
- `--until-group <group>` resumes you when every job in that group is terminal (failure resolves the barrier too).

Both are *additional* predicates, not exclusive ones: messages, requests, room activity, station items and child results can still wake you first.

`--barrier-timeout <seconds>` requires `--await --until-group <g>`. At the deadline it marks the group jobs that still run as failed, so the barrier resolves and the session cannot be stranded. `park` accepts the same option.

### Return Is the Turn Seam

`return` stores the payload on the current run and records the disposition. The harness may still be alive for a moment, but the durable run already carries its result and `returned` end reason. On process exit:

- finish self-shelves an unattended session as finished;
- await self-shelves it as awaiting/parked, where the orchestrator sweep owns its wake;
- a pending **blocking** `ask` request derives `needs-input` (a deferred request is fire-and-continue and preserves lifecycle);
- no return enters the bounded re-prompt path.

Terminal stdout is not a deliverable. Consumers read with:

```bash
flint orbh result <id>                 # latest returned turn
flint orbh result <id> --run <n>       # specific 1-based run
flint orbh inspect <id> --results
```

### Ask, Notes, and Interface Keys

`session ask` records a blocking request, suspends the live run, and returns the human response on stdout. Use it only when a headless root genuinely cannot proceed; prefer the non-blocking `flint orbh approval request` gate, and subagents return blockers to their dispatcher instead of opening either. `note` appends an annotation without changing lifecycle. For durable progress narration an operator can read, use `flint orbh update` — see [[dev-knw-foh-machinery]].

Common free-form keys are `phase`, `progress`, `blockers`, `artifacts`, and `confidence`. Leave `core:*` slices to Orbh/Page internals.

### Event Subscription (`session await`)

This is unrelated to the `--await` turn disposition. It subscribes to server events:

```bash
flint orbh session await --list
flint orbh session await <eventType> [--filter <key=value>] [--timeout <seconds>]
```

It requires the standalone Orbh server (`flint orbh server start|stop|status`, operator-facing). Use Page/pager delivery for ordinary session coordination.

## Results and Collection

```bash
flint orbh request -q <runtime/profile> "<prompt>"
flint orbh request -q -c <id> "<follow-up>"
flint orbh wait <id1> [id2...] [--next] [--timeout <seconds>]
flint orbh result <id> [--run <n>]
```

`request` and `wait` block on turn-correlated outcomes. Await/park and rescue runs remain pending; kill derives abandonment, which resolves collection as `abandoned`. A command timeout stops waiting while the collector outcome remains `pending`. Use background execution. See [[dev-knw-foh-coordination]].

`wait --next` waits for a result *newer than the latest one present at invocation* — the correct flag when you re-collect a session that has already returned and you want its next turn, not the one you have read.

Beyond `-q`/`-c`, `request` takes `--runtime <runtime>` (target as a flag, prompt positional), `--timeout <seconds>`, `--stream` (live transcript while collecting), `--title` / `--description` (pre-set the child's identity so `list` is legible), `--continues <id>` (link a *new* session as a continuation), `--max-turns <n>` and `--budget <usd>`.

## Operator Lifecycle Verbs

These are operator/session-retention controls, not substitutes for a headless agent's normal return discipline:

```bash
flint orbh close [id] [--no-leaf]
flint orbh park [id] [--until-group <g>] [--barrier-timeout <s>] [--no-leaf]
flint orbh discard [id] [--no-leaf]
flint orbh end [id] [--result <text>] [--no-close] [--no-kill]
```

| Verb | Meaning |
|------|---------|
| `close` | Terminal finished + closed retention; terminates the harness, closes the bound Obsidian terminal tab, and clears any pager lease. |
| `park` | Legacy await spelling; awaiting/parked retention, woken by the orchestrator sweep. Terminates the harness, then closes the bound Obsidian terminal tab (`--no-leaf` keeps the pane open at a shell prompt). `--until-group` adds the all-terminal job-group condition to the standard wake set, and `--barrier-timeout` force-resolves it (`session return --await --until-group` accepts it too). Takes a session id, so an operator or a tool such as Strike can park a session from outside. |
| `discard` | Tombstones the entry, records abandonment, terminates the harness, then closes the bound Obsidian terminal tab. |
| `end` / `x` | Finishes, closes/terminates, and tears down terminal obligations. It does not promote the spool: sessions are born in `local` and stay there. |

`close`, `park`, and `discard` terminate the harness and then close the bound Obsidian terminal tab. Pass `--no-leaf` to keep the pane open at a shell prompt. `--obsidian` still parses on all three as a deprecated alias of the default.

## Accounts: `auth`, and Migrating a Live Session

Accounts are isolated harness login homes, per runtime.

```bash
flint orbh auth list [runtime] [--all]          # --all also lists each deactivated account, with a STATE column
flint orbh auth add <runtime> <name> [--no-login]
flint orbh auth rename <runtime> <old-name> <new-name> # rename an isolated account home
flint orbh auth default <runtime> <name>        # Flint-local inside a Flint, else machine-global
flint orbh auth default <runtime> --clear       # clear the default (name required unless --clear)
flint orbh auth remove <runtime> <name> [--yes] # remove an isolated account home
flint orbh auth deactivate <runtime> <name>     # hide an account whose subscription lapsed; the home stays
flint orbh auth reactivate <runtime> <name>     # bring a deactivated account back
flint orbh auth usage [runtime] [name]          # live quota / rate-limit windows, read-only
flint orbh auth ccusage [--dry-run] [args…]     # run ccusage across Orbh account homes + vanilla defaults
flint orbh auth refresh [runtime] [name]        # re-auth expired accounts via one throwaway session each
flint orbh auth migrate <account> [--session <id>] [--force]   # move THIS session (or --session <id>) to another account
flint orbh auth fallback show [runtime] [--json]               # the fallback lists and the state of each listed account
flint orbh auth fallback set <runtime> <account...>            # the ordered fallback list of one runtime (turns the autoswitch on)
flint orbh auth fallback unset <runtime>                       # remove the list (Orbh never switches that runtime)
flint orbh auth fallback check <runtime> [--account <name>] [--model <m>]   # dry run: the account a new headless launch uses now
flint orbh auth fallback settings [--percent <n>] [--refresh-minutes <n>]   # the switch percent and the usage refresh interval
```

`auth add` assigns an immutable UUID to the account. The runtime registry is at `~/.nuucognition/orbh/accounts/<runtime>/registry.json`. A new session stores this account ID.

Orbh serializes registry changes across processes. If `registry.json` is missing, Orbh recovers modern accounts from their name links. A removed account name stays reserved by default. Use `auth add --reuse-removed-name` to reuse it. The new account gets a new ID. Sessions for the removed ID still cannot resume.

The stable account home is at `~/.nuucognition/orbh/accounts/<runtime>/.homes/<id>`. A new account uses this stable home immediately. Orbh registers a legacy name-based home without an immediate data move.

`auth rename` keeps the account ID and stable home. The first rename promotes a legacy home to the stable ID path. Later renames change only the registry and name aliases. A matching machine default and active Flint default keep the same account ID.

An account can return to an old name. Orbh recognizes that the old alias has the same account ID.

The old account path remains as a hidden compatibility alias. Thus, an existing process can use the absolute path that it stored before the rename. A resumed legacy session receives the account ID. A new child session uses the current name and stable home.

`auth list` shows only the current account name and a short account ID. `auth remove` removes all name aliases. It also keeps an ID tombstone for a clear session error.

### `auth deactivate` — hide an account, keep its home

Use `auth deactivate` when the subscription of an account lapses for a period. Do not use `auth remove` for this: `remove` deletes the home. `deactivate` writes `deactivatedAt` on the record of the account in `registry.json`. The registry stays at version 1. The home folder, its credentials, and its conversations stay.

- **Hidden.** `auth list`, `auth usage`, `auth refresh`, the launcher account stage, the fallback autoswitch, and the Strike launch modal skip the account. `auth list` prints how many accounts it hid. `auth list --all` shows every known account with the state `active` or `deactivated <date>`.
- **Refused as a new choice.** A new launch with `--account <name>`, a launch whose default names the account, `auth default`, `auth fallback set`, `auth migrate` to the account, and `agent migrate` to the account refuse it. The error names `flint orbh auth reactivate <runtime> <name>`.
- **Still resolved as a stored reference.** A resume of a session that ran on the account, a subagent that inherits the account of its parent, `auth account` (the passthrough to the home), bundle restore, and `auth ccusage` still use the account.
- **Defaults.** `deactivate` clears the machine default and the default of the current Flint when they name the account. A default in another Flint stays, and a launch there refuses with the next command. `reactivate` does not restore a default.

### `auth migrate` — change account, keep the conversation

```bash
flint orbh auth migrate <account> [--session <id>] [--force]
```

By default the verb **self-targets**: it moves the session that runs it, because the thing being migrated is the conversation you are having, and that turn ends. With `--session <id>` (full or partial ID) it moves another session and your own run is untouched. A manager can use this to move a child. See [[dev-knw-foh-orchestrator]]. What happens:

1. The run ends at a deliberate turn boundary (end reason `migrated`). The **session never ends** — runs are cheap, the spool is durable.
2. The session's transcript and sidecar files are **moved** (renamed, not copied) into the destination account home.
3. The durable `account` is flipped.
4. The pane **native-resumes the same native session id** under the new home.

So this is the deliberate opposite of compaction: compaction relaunches into a *fresh* native context on purpose; migration *preserves* the conversation on purpose. Pick by what you are trying to change:

| Want to change | Verb | Native context |
|---|---|---|
| account | `auth migrate <account> [--session <id>]` | preserved |
| profile, same runtime | `profiles switch <runtime/profile>` | preserved |
| runtime (± profile, ± account) | `compact handoff --into <runtime/profile>` | fresh, carried by your handoff |

**Headless sessions migrate too**, by a simpler path: there is no pane and nothing to respawn, because the account home is re-derived from the store at *every* spawn. So the move is just "settle, move files, flip", and the session comes up in the new home at its **next wake** — the command says `Not relaunched` when that is what happened. A headless session with a **live turn** is not refused — the turn is **killed** at a deliberate boundary (`endReason: migrated`, `status: completed`, no `error` retention) and then the files move. The kill is required for integrity, since the transcript is written live and renaming it under a running child would tear it. The turn in flight is lost; the conversation is not. The `auth migrate` help says the same (`packages/orbh/src/account-migration.ts` implements it).

Constraints, all enforced before anything is killed or moved:

- **Same runtime only** — accounts are per-runtime; a claude session cannot migrate into a codex account.
- The destination must have **usable credentials**, or the migration is refused so it does not drop you at a login screen mid-turn. `--force` overrides.
- A name collision in the destination is refused rather than merged.
- A run that starts after the migration read the session (before its claim) refuses the migration: `a run started after the migration read the session. Run the migration again`. Nothing is moved.

**The migration claim.** A migration holds a claim on the session from its first write to its end. While the claim holds and its owner process lives, every other run start of the session is refused with a `Next:` line, and a resume does not write a resolved account. A claim of a dead owner never blocks. A resume plan made before the migration is refused after it too, because its account is no longer the account of the session (`the account of the session changed after the start was planned`); start the run again. Each migration has a deadline of 5 minutes on the monotonic clock of its process: it checks the deadline and its claim before the file move and right before the account change; past the deadline it puts its files back and releases the claim; when it lost its claim it changes nothing more. A failed release is tried 3 times, and the result then has a warning with the recovery command:

```bash
flint orbh auth migrate --release-claim --session <id>   # clear a stuck claim; refuses while its migration can still run
```

`--release-claim` refuses while the owner lives and the claim is younger than the deadline plus 1 minute. Else it settles the files with the disk proof of the stranded-migration rescue (files only in the source home: the account stays; files only in the target home: the account becomes the target; any other state: refused, nothing changes) and clears the claim.

Only the session's own files travel. **Auto-memory, harness config, and credentials stay with the old account** — an account *is* its credentials, so carrying them would defeat the operation. A failure after the move rolls the files back.

**Verify the change before you report it.** A switch or a move can fail and leave the session on the old profile or account. After the relaunch, read the `Profile` and `Account` lines of `flint orbh inspect <id>`. Report the new value only when it shows there.

Orb agents get the same operation, plus the durable declaration, through `flint orbh agent migrate <name> <account>` (Orb Agents shard).

### The account autoswitch: usage snapshots and the fallback list

The account autoswitch moves headless work off an account whose usage ran out. It is **off by default**. The launch switch works when a fallback list exists. The automatic move of a session that already runs is a second opt-in, `flint orbh auth fallback settings --auto-migrate on` (key `accountUsage.autoMigrate`, default off), because it uses the migration primitive of `auth migrate`, which still has open races (Task 1114, review round 3). It works only for a runtime that has a **fallback list**: an ordered list of accounts that the operator declares interchangeable. Orbh never chooses an account outside the list, and never moves away from an account outside the list. So keep a work account and the account of a live interactive session of a person out of the list.

```bash
flint orbh auth fallback set claude gmail nuu-gmail nuu-nathan   # each account must exist
flint orbh auth fallback check claude --account gmail            # dry run; writes nothing, not even the removal of an expired marker
flint orbh auth fallback show claude                             # the list, and good or limited for each account
```

**The config.** The key `accountUsage` of the Orbh machine settings file (`~/.nuucognition/orbh/settings.json`, or `ORBH_SETTINGS_PATH`) holds the lists (`fallback`), the switch percent (`switchPercent`, default 90), and the refresh interval (`refreshMinutes`, default 5; 0 turns the refresh off). The `auth fallback` commands write it and keep the other keys of the file. The owner module is `packages/orbh/src/usage/account-switch.ts`.

**The usage snapshot.** Each account home has `usage-state.json`: the windows of the last usage read (5-hour, weekly, weekly per model) and the read time. `auth usage` writes it. The orchestrator also refreshes it in the background for each account of a fallback list: at most once per `refreshMinutes` for each account, one account at a time, with a 10-second bound, also when a read fails. An account outside every list gets no background read. Other code reads the snapshot with `readLastKnownAccountUsage`.

**When an account is limited.** An account is limited when it has a live usage-limit marker (`limit-state.json`, written when a run stops on a provider usage or rate limit), or when its snapshot is younger than 15 minutes and has a window at or above the switch percent that has not reset. A model window (for example "weekly (Fable)") counts only for a launch on that model. An account with no fresh snapshot is good unless it has a marker.

**The rule at launch.** It applies to a new headless, subagent, or ping launch, after the normal account choice (`--account`, else the account of the dispatcher, else the default). When that account is in the list and limited, the launch uses the first account of the list, in list order, that exists and is good. It prints one line on stderr and records the key `orbh:account-switch` in the session metadata:

```
Orbh: the account claude/gmail is limited (the 5-hour window is at 96%). This launch uses claude/nuu-gmail from the fallback list.
```

An explicit `--account` in the list can switch; an explicit `--account` outside the list never switches. When no account of the list is good, the notice says `This launch stays on claude/gmail.`, and the usual limit check then refuses a launch on a marker. An interactive launch never switches. The default target list applies the same rule for a headless launch: a target whose account is limited stays available when the rule finds a good account for it, and the login check of the target reads that chosen account. For an interactive launch the default target list keeps the account of the launch: a limit marker on it skips the target, and the login check reads it.

**A headless session that stopped on a limit.** Only with `autoMigrate` on, the orchestrator moves such a session to a good account of the list with the headless path of `auth migrate`, only when all of these are true: the session is headless or a subagent (never interactive); it has no live run and it is awaiting (it is between turns); its last run stopped on a provider usage or rate limit; its account is in the list and still limited; and a good account of the list exists. The sweep can read an old copy of the session, so the migration compares the stored session with that copy (its account and its current run) and checks the whole rule again under its claim; any change refuses the move, and nothing moves. While a migration holds its claim, no run of that session can start (the run start checks the claim and its lease; only the respawn of an interactive migration carries the claim token), so the move never happens during a turn. Then it moves a later scheduled wake to now, so the session continues on the new account. A failed move is tried again after 30 minutes. The orchestrator log has one `account switch — moved …` line for each move. Verify the move with the `Account` line of `flint orbh inspect <id>`. Without a list, or for any other session, the manual path stays `flint orbh auth migrate <account> --session <id>`.

## Page, Pager, and List Hygiene

```bash
flint orbh page
flint orbh page arm [id] [--max-wait <seconds>]
flint orbh list [--print] [--wide] [--subagents] [--json] [-a|--all] [-s|--stats] [--detached]
flint orbh list --status awaiting
```

`page arm` is a **one-shot, run-scoped pager**, not an attach to anything standing. Run it through background execution during a live turn; it exits with a full Page render on the first Page-worthy event, and you re-arm if latency still matters. It expires after 2 h on an unattended session (`ORBH_PAGE_ARM_TTL_SECONDS`; unbounded for interactive), and `--max-wait <seconds>` bounds *your* latency instead — at the deadline it emits a heartbeat render and exits rather than erroring. Recognisable exits: `page arm already active for this session (pid N); not starting a second` (a second arm on the same run, correct rather than an error), `page arm superseded by a newer arm`, `page arm expired — re-arm with flint orbh page arm`, and `session ended — pager exiting` (do not arm again). Between turns, an awaiting session needs no pager at all: the machine orchestrator sweep owns that delivery. Full model in [[dev-knw-foh-page]].

`list` and `active` **open a cockpit in a TTY**; `--print` is the static table and `--json` the machine-readable form — and `--json` is *the default when invoked from inside an Orbh session*, so a script that expects a table must pass `--print`. `list` renders dispatch trees by default (`--subagents` flattens them) and gives awaiting sessions their own section with duration and last-woken provenance. A session that is still `awaiting` past `ORBH_AWAITING_DORMANCY_DAYS` (default 7) shows `⚠ awaiting Nd with no activity — consider retiring`; a station-bound session is exempt, and a session that left `awaiting` shows no hint.

## Notes

- `--path <dir>` overrides Flint discovery. `--orb-root <dir>` scopes a command to an explicit Orb store (overriding `ORBH_ORB_ROOT_DIR` and cwd), and `--create-store` permits an explicitly scoped store that does not exist yet to be created. Both are available on essentially every verb and are the mechanism for cross-Flint work.
- `flint orbh scope [--expect <dir>] [--json]` is the read-only pre-flight probe: it prints which store the next command will resolve to and why, creates nothing, and with `--expect` exits non-zero on a mismatch — so a brief can require it before any mutating verb.
- `flint orbh context [id] [--json]` prints token context-window occupancy directly (the Page `CONTEXT` number) without rendering the Page; see [[dev-knw-foh-compaction]]. `flint orbh peek <id> [--json]` is cheap projection-only status for another session; see [[dev-knw-foh-coordination]].
- Verify/repair commands and current caveats live in [[dev-knw-foh-internals]].
- Bare `launch` creates a peer; `request` creates a collected subagent. Do not interchange them.
- Durable machinery beyond the session — stations, cron, workers, procedures, workflow chaining, `update`/`approval`/`improve` — is in [[dev-knw-foh-machinery]].
