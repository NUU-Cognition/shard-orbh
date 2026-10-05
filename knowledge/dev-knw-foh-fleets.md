---
description: "Declared fleets — the verbs, when to declare, how to name, the charter, the voice, the Mesh field and commit trailers, peers and stations, accounts and load before each wave, the shared checkout, review and deploy, the fleet recipes, and the close-out"
orbh-sessions:
  - "[[528386a9-3de4-4ffb-9f92-dc12e4e6dcda]]"
---

# Knowledge: Declared Fleets

A **declared fleet** is a named group of Orbh sessions that acts under one name for one program. A fleet has a handle, a display name, a charter, one root session, and the person who is accountable (the principal). The acts of a member show the fleet: its updates, its Discord posts, its commits, and its Mesh edits. The root is the manager of the fleet.

Membership is separate from ancestry and from collection. A child of a member is a member from its first event. A peer or a station joins only when you tell it to. Closing a fleet does not stop, close, or kill a session.

Read this file before you run a program of many sessions. The general manager rules are in [[dev-knw-foh-orchestrator]]. The delegation verbs are in [[dev-knw-foh-coordination]].

## The Verbs

```bash
# Declare: the caller session becomes the root (outside a session, give --root <id>).
flint orbh fleet declare <handle> (--charter "<text>" | --charter-file <path>) [--name "<display name>"] \
    [--charter-ref "<Mesh path or wikilink>"] [--root <session-id>] [--room <room>] [--avatar <url>] \
    [--max-members <n>] [--budget <usd>] [--deadline <iso|+duration>] [--no-backfill] [--json]
flint orbh fleet declare <handle> --backfill-only     # no declare: stamp each unstamped session under the root of the open fleet

# Read
flint orbh fleet show [<handle>] [--members] [--json] # default: the fleet of this session
flint orbh fleet list [--all] [--json]                # open fleets; --all adds closed and abandoned fleets
flint orbh fleet updates [<handle>] [--limit <n>] [--json]   # the updates of all members in time order
flint orbh actor show [--session <id>] [--json]       # who speaks for an act now: fleet, agent, session, or person

# Change
flint orbh fleet join <handle> [--session <id> | --station <name>]   # default: this session
flint orbh fleet leave [--session <id> | --station <name>] [--reason "<why>"]
flint orbh fleet set <handle> name|charter|charter-ref|room|avatar|limits <value...>
#   `none` clears an optional field; limits: max-members=<n> budget=<usd> deadline=<iso|+duration>

# Close (only the root, or an operator outside a session; a member needs --force)
flint orbh fleet close [<handle>] "<outcome>" [--report "<Mesh path>"] [--abandon] [--force]
```

The fleet flags of other verbs:

```bash
flint orbh launch <target> "<prompt>" --declare-fleet <handle> --charter-file <path> [--fleet-name "<name>"]  # the new session is the root
flint orbh launch <target> "<duty>" --fleet <handle>        # a peer that is a member (via launch)
flint orbh worker spawn "<brief>" --fleet <handle>          # only for a worker whose parent is in no fleet
flint orbh message send fleet:<handle> "<text>"             # goes to the root session of the fleet
flint orbh message request fleet:<handle> "<question>"      # a blocking peer request to the root
flint orbh message broadcast --fleet <handle> "<text>"      # the live members; one skipped line for each other member
flint orbh list --fleet <handle>                            # the root, the stamped sessions, and the explicit members
flint orbh timeline fleet:<handle>                          # the members and their trees, archived sessions too
flint orbh update list --fleet <handle>                     # the updates of one fleet; --all for every session
```

A bare `update list --fleet` (with no handle) is the deprecated name of `update list --all`. It prints a notice.

### Membership rules

- **Descendants are automatic.** A subagent of a member (`request`, `job run --agent`, a worker of a member) is a member from its first event (`role descendant`, `via inherit`). It needs no command.
- **Declare stamps the present tree.** `fleet declare` stamps each session under the root (`via backfill`). So a manager can declare after its first wave. The backfill does not change the actor of an update that a child already sent. Use `--no-backfill` to stamp only the root.
- **A bare peer is not a member.** `launch` with no `--fleet` gives a session in no fleet.
- **One membership for each session.** A member of an open fleet cannot declare or join another fleet. It must `fleet leave` first. A stamp of a closed fleet does not count.
- **No nested fleets.** A member cannot declare a fleet inside its fleet. A subagent never declares.
- **An old build writes no stamp.** A child that an old CLI launched has no stamp. Repair it with `flint orbh fleet declare <handle> --backfill-only`. A repeat writes nothing.
- **The run environment.** Each run of a member has `ORBH_FLEET_ID`, `ORBH_FLEET_HANDLE`, and `ORBH_FLEET_NAME`. The launcher sets them at each run start. They are hints for hooks. For a durable write, `flint orbh actor show --json` is the source of truth.

The Page of a member has one `FLEET` line with the handle, the role, and the start of the charter. The Page of the root also has the member counts and at most two warnings: every other member has ended (close the fleet), and an advisory limit is passed. `list` puts a fleet header line above the root row, with the warnings `idle — close the fleet`, `root ended`, and `over limit`. `inspect` and `peek` show the membership.

## When to Declare

Declare a fleet when one of these is true:

- You dispatch 3 or more sessions.
- You plan 2 or more waves.
- The work runs unattended for more than 1 hour.
- More than one runtime or account acts.
- The operator named a program or a mandate.

Do not declare a fleet for one `request -q` helper or for a `ping`. Declare **before the first dispatch**. A subagent never declares: it inherits the fleet of its parent.

Use one root for one fleet. When the goal changes, change the charter (`fleet set <handle> charter`) and register a new title. Do not put a second program under the root of the first one.

## How to Name

- **Handle:** `<program>-<scope>[-<mmdd>]`, lower case letters, digits, and hyphens, 2 to 32 characters (`^[a-z0-9][a-z0-9-]{1,31}$`). Example: `overnight-orbh-1006`.
- Do not put a person's name, a runtime name, or the word `fleet` in the handle.
- A handle is unique for all time in the store, also after a close. It goes into commits and Mesh files. Put the date or the task number in the handle of a program that repeats.
- **Name:** Title Case, at most 40 characters, readable in a Discord channel. Example: "Overnight Orbh Fleet". The default is the handle in Title Case.

## The Charter

- Write 1 to 5 sentences: the goal, the boundary (what the fleet must not touch), and the done condition.
- Give the Mesh source with `--charter-ref` (the task or the mandate note).
- The charter is not a prompt. Each child still gets a complete, self-contained prompt.
- When the operator changes the goal, run `fleet set <handle> charter "<text>"`. Do not start a second fleet for the same program.
- Limits (`--max-members`, `--budget`, `--deadline`) are advisory. `fleet show` and the Page of the root show each limit with its actual value. Nothing refuses a launch.

## The Voice

A fleet speaks with one voice.

- Use `flint orbh update` only for a finding, a decision, a completed unit, or a blocker. An update of a member stores the fleet as its actor at write (`Update recorded — <id> (as ⛵ <handle>)`). A later rename or close does not change a stored update.
- The manager posts the wave summaries. A leaf posts only a blocker or a finding that the operator must see.
- Do not write an update in the first person of the operator. Do not sign as the operator.
- Discord shows the fleet name. With an updates webhook, each post has the fleet name and avatar. With no webhook, the bot posts with a fleet heading. Only the operator configures the webhook: `flint orbh humanchannel webhook ensure`, `webhook set <url>`, or `webhook clear`.
- Messages and room posts show the fleet label of the sender when they are read. A message stores no actor.

### The Mesh field: `orbh-fleet`

`authors` stays the person. The fleet does not become a Mesh author.

- When a member creates or edits a Mesh artifact, it adds `orbh-fleet: <handle>` to the frontmatter, beside `orbh-sessions` and `authors`. Read the handle from `ORBH_FLEET_HANDLE`, or from `flint orbh actor show --json`.
- When the field names another fleet, make it a list and append your handle, as `orbh-sessions` does:

  ```yaml
  authors:
    - "[[@Nathan]]"
  orbh-sessions:
    - "[[528386a9-3de4-4ffb-9f92-dc12e4e6dcda]]"
  orbh-fleet: overnight-orbh-1006
  ```

- A session that the Flint server launches from an artifact gets the field from code: the server writes `orbh-fleet` when the new session is a member of an open fleet.
- A session in no fleet, or a former member of a closed fleet, writes no `orbh-fleet`.

### Commit trailers: `Orbh-Fleet` and `Orbh-Session`

The author of a commit stays the person. A commit of an Orbh session gets two trailers in its message:

```
Orbh-Fleet: overnight-orbh-1006
Orbh-Session: 528386a9-3de4-4ffb-9f92-dc12e4e6dcda
```

A `prepare-commit-msg` hook adds them from `ORBH_FLEET_HANDLE` and `ORBH_SESSION_ID`. The manager installs it once in each repository that the fleet commits to:

```bash
flint shard orbh commit-trailers status --repo <repo>     # the hooks folder and the state of the hook
flint shard orbh commit-trailers install --repo <repo>    # the hook body and a prepare-commit-msg hook that calls it
flint shard orbh commit-trailers install --repo <repo> --append   # add the call to a prepare-commit-msg hook of another owner
flint shard orbh commit-trailers uninstall --repo <repo>
flint shard orbh commit-trailers show                     # print the hook body
```

What the hook does:

- It adds `Orbh-Fleet` when `ORBH_FLEET_HANDLE` is a valid handle, and `Orbh-Session` when `ORBH_SESSION_ID` is a session id. A value of another shape is ignored.
- It changes only the message. It never changes the author, the committer, or the subject. It always exits 0, so it never stops a commit.
- It does not add a trailer that the message already has with the same value (`--amend` adds no copy).
- A message with no text stays empty, so an empty message still aborts the commit.
- With neither variable set (a person in a terminal), it does nothing.
- `install` refuses when a `prepare-commit-msg` hook of another owner exists, and it prints the one line to add. `--append` adds that line to the end of that hook.

In a repository with no hook, add the trailers yourself: `git commit -m "<message>" --trailer "Orbh-Fleet: $ORBH_FLEET_HANDLE" --trailer "Orbh-Session: $ORBH_SESSION_ID" -- <path>...`. Do not do this in a repository that has the hook.

## Peers and Stations

- Launch a peer of the fleet with `flint orbh launch <target> "<duty>" --fleet <handle>`. It gets a stamp (`via launch`) and one roster event.
- Add a session that exists with `flint orbh fleet join <handle> --session <id>`.
- Add a station with `flint orbh fleet join <handle> --station <name>`.
- Start a new program as an operator in one command: `flint orbh launch <target> "<prompt>" --declare-fleet <handle> --charter-file <path> [--fleet-name "<name>"]`.

## Before Each Wave: Accounts

A wave that runs on one account stops when that account reaches its limit. Report 073 found this in 22 fleets.

- Run `flint orbh auth refresh`, then `flint orbh auth usage`. Read the 5-hour and the weekly window of each allowed account, and the reset times.
- Do not use an account that the operator excludes (for example a work account). Do not put a fleet on the account of a live interactive session of a person (the `Account` line of `flint orbh inspect <id>`).
- Spread each wave over two or more accounts with `--account <name>`. Put **at most 3 concurrent writers on one account**.
- A high-effort profile uses quota fast. In the overnight program of 2026-10-06, `o55xh` used about 16 times the quota of `o55h`: an `o55xh` fleet of 8 sessions filled one Max 5-hour window in 15 minutes. Use an `xh` profile only for code writers. Use `o55h` or a research runtime for analysis and review.
- Put the critical path on the account with the most room. Plan the waves around the reset times.
- When a child stops on a limit with a long reset, move it (`flint orbh auth migrate <account> --session <id>`), or close it and dispatch the work again on another allowed account. Do not let a lane wait for hours.

## Fan-Out Limits and Dispatch

- **The live fan-out cap is 16** (`ORBH_DISPATCH_FANOUT_CAP`). It counts every live child of the parent, also an awaiting child. The depth cap is 5 (`ORBH_DISPATCH_DEPTH_CAP`). For a larger program, use sub-leads (a two-level fan-out), or raise the cap for one dispatch: `ORBH_DISPATCH_FANOUT_CAP=32 flint orbh request ...`.
- **Temporary rule (Report 076, defect D1).** Until Task 712 is done and its build is the live CLI, do not start many concurrent `request -q` calls from one parent. They fail on the lock `<parent>.dispatch-reservations.lock`, and a child can start while its collector exits 1 with no child id. Dispatch parallel children with `job run --agent <target> "<prompt>" --group <g>` and a barrier (`session return --await --until-group <g>`), or start one `request -q` at a time, about 15 seconds apart.
- When a `request -q` exits 1, read `flint orbh list` before you dispatch again. The child can exist and run. Collect it with `flint orbh wait <id>`; do not start a second copy.
- Each headless session costs about 150 MB of memory for its host and collector. Count it in the wave size.

## The Shared Checkout

By default, all builders of a fleet work on the machine branch (for example `nathan-main`) in the primary checkout. A worktree is used only when the operator names one. Many builders in one checkout need these rules:

- **One owner for each file.** Give each builder its own files in its prompt. Keep a FILE OWNERSHIP table in the room context (`flint orbh room context append <room> "<table>"`). A builder posts in the room before it edits a file outside its package.
- **Commit only your own paths:** `git commit -m "<message>" -- <path>...`. Never `git add -A`, `git add .`, or `git commit -a`.
- **A shared file with hunks of two builders.** The owner of each hunk commits only that hunk, with a private index, so the shared index stays as it is:

  ```bash
  git diff -- <path> > /tmp/mine.patch      # then delete the hunks of the other builder from the patch
  export GIT_INDEX_FILE="$(mktemp -u)"      # a private index
  git read-tree HEAD
  git apply --cached /tmp/mine.patch
  git commit -m "<message>"
  unset GIT_INDEX_FILE
  git reset -q -- <path>                     # the shared index entry of <path> follows the new HEAD
  ```

- **The build lock.** Run one package build at a time under the lock of the program (for example `mkdir /tmp/<program>-build.lock`, and `rmdir` when done). Do not run `pnpm install`, a full monorepo build, or a build that cleans `dist` while other builders work.
- **The load gate.** Before a heavy step (a package build, a full typecheck, a test run of more than one spec), read the 1-minute load average. Wait while it is above 2 per CPU. On an 18-CPU Mac: `until [ "$(sysctl -n vm.loadavg | awk '{print int($2)}')" -lt 36 ]; do sleep 10; done`. Run one test spec at a time. Before a full build, read the free memory (`memory_pressure | tail -1` on macOS).
- **Show a gate wait.** Set `phase gate-wait` and `blockers "<the gate>"` while you wait (Agent Rule 4 of the init).
- **Run the code from source.** A builder does not rebuild the live CLI bundle and does not restart the orchestrator or a server. Only the manager deploys.
- Do not use glob deletes in a shared temp folder. Do not kill a process that you did not start. Keep scratch files in the `scratch/` folder of your spool.

## Review and Fix Rounds

- Give each finished task one code review by a second runtime (for example a Codex review). Write the findings into the Notes of the task. Send them back to the same builder for one fix round (`flint orbh request -q -c <builder-id> "<findings>"`).
- Use the same reviewer session for one feature over its rounds. A fresh reviewer for each round costs more and loses the context.
- Give each review a stop rule (for example: stop at no high finding, or after 3 rounds).
- Use neutral words in a review prompt ("correctness review"), not "attack", "adversarial", or "exploit".
- Send one consolidated correction, not five small ones.

## Deploy at a Quiet Point

The live CLI bundle is built from the whole working tree, with the uncommitted edits of every builder. Deploy only at a quiet point:

1. The builders of the deployed tasks committed, and their reviews passed.
2. `git status` of the deployed packages shows no half-done edit of a running builder.
3. Build the live bundle under the build lock.
4. An orchestrator that has the build reload of Task 723 loads the new build by itself within one tick. Else run `flint orbh orchestrator restart` between ticks.
5. Check `flint orbh orchestrator status` (the build, and `stale: no`), `flint server list`, and one smoke dispatch.

## Rooms

- Join the fleet room with `--notify mentions`. An unaddressed post then does not wake an awaiting member.
- Use the room for contracts and file ownership, not for status. Status goes into updates and results.
- The manager reads the room at seams (`flint orbh room read <room> --limit 20`). When the managed Page repeats many unread room posts, the manager can leave the room and read it by hand.
- Do not send a message to a member that already returned. Check the state of each child (`flint orbh peek <id>`) before a broadcast. `message broadcast --fleet <handle>` sends only to the live members, and it prints one `skipped` line with the reason for each other member.

## Fleet Recipes

These shapes worked in past fleets (Report 073):

1. **Contracts first, then a wide build wave.** A foundation session writes the contract (an interface file, a task section, or a `CONTRACTS.md`) and the file ownership by wave. The builders start only after the contract is frozen. Put the text of the contract in each brief, not only its name.
2. **Wide, short fan-out with a fixed return shape.** Many small self-contained briefs, each with one return grammar (for example `FILES / NEW / SUMMARY`).
3. **Persistent fixers with fresh reviewers.** A few fixers keep their context over the rounds; cheap reviewers read each round fresh. Stop when no high finding is left.
4. **Research, builders, and an independent verifier.** A verifier that did not build the code runs every gate again at the end and drives the real surface.
5. **Two-level fan-out for bulk work.** Sub-leads each manage about 5 helpers. This keeps each parent under the fan-out cap.
6. **Serial steps with a verify step every five.**

Also: probe a new runtime with one `flint orbh ping` before a wave on it. Write the reports into the Mesh. Compact at 80% or above ([[dev-knw-foh-compaction]]). A manager never blocks on a human: use `flint orbh approval request`, and put the expiry in `blockers`.

## Close Out

No past fleet closed its tree on purpose; about 120 sessions were left awaiting (Report 073). The root closes the fleet before its last return:

1. Read the `DISPATCHES` block of your Page. Collect each open dispatch with `flint orbh wait <id>`, or write in your result why you drop it.
2. Close each awaiting child that has no more work: `flint orbh close <id>`. Close a replaced or a failed child in the same step. Do not use `discard` for a child that finished its work.
3. Write the report or the task log into the Mesh.
4. Run `flint orbh fleet close "<outcome>" --report "<Mesh path>"`.
5. Run `flint orbh session return --finish "<result>"`.

When the operator stops the program, run `flint orbh fleet close --abandon "<reason>"`.

What `fleet close` does:

- It refuses when a member other than the caller is `working`, and it lists those members. `--force` closes the fleet anyway and warns for each working member.
- It warns for each `awaiting` member. It never stops, closes, or kills a session: step 2 does that.
- After the close, `join`, `set`, and a second `close` refuse. `fleet list` shows the fleet only with `--all`. A former member speaks as its session again.
- There is no automatic close. `list` shows an open fleet whose members are all terminal as `idle — close the fleet`, and an open fleet whose root ended as `root ended`. The Page of the root warns when every other member has ended.
