---
description: "Agent identity and session mechanics — the tiers (session, wisp, orb, comet, star), the wisp identity, its alias, its name in titles, and its memory, addresses and their levels, the actor (by and as), dispatch, fork, parallel fork, birth, consume, and compact (context copies, obligations move), the handoff contract, the rules of the polls, the names, and the lineage with its Steel view"
orb:
  - "@v1/nuucognition/session/1329c745-63ed-4a01-b598-bf588a84df0e#flint/nuu-orbh"
  - "@v1/nuucognition/session/9010418b-f6be-418d-8b5c-95dfff830c8a#flint/nuu-orbh"
  - "@v1/nuucognition/session/833dd8ce-af50-4489-ad77-928b15e875de#flint/nuu-orbh"
  - "@v1/nuucognition/session/df2c23ae-f402-4485-b1a3-bf5005470d4e#flint/nuu-orbh"
orbh-fleet: kinship-1020
---

# Knowledge: Agent Identity and Session Mechanics

This file tells you what an Orbh actor is, how Orbh names and addresses it, and how sessions copy, move, and join work. Read it before you run `flint orbh wisp gain`, `fork --parallel`, `birth`, or `consume`.

The design is in NUU Orbh Notepad 108 (§ 4 to § 12) and its three polls. Mission 027 built it. A label such as R23 names a revision of the contract in the note of Mission 027. The general verbs of delegation are in [[dev-knw-foh-coordination]], and compaction is in [[dev-knw-foh-compaction]]. Where a node came from (its kinship) is in [[dev-knw-foh-kinship]], and what it belongs to now (its membership) is in [[dev-knw-foh-membership]].

**The design rule: it works alone, and it connects when the rest is there.** Orbh needs no NUU account, no network, and no org. Each part below works with Orbh alone. An org, a login, and the network only add to it.

## The Tiers

The tiers use one analogy: energy is intelligence. A tier says how much form the energy has, and how long it lasts.

| Tier | The energy | Lifetime | What it holds | Can it be consumed? |
|---|---|---|---|---|
| **Session** | A spark: one short discharge for one call | One call: a request, then a result | The session record only | Yes |
| **Wisp** | Loose energy, like plasma. It holds together for a purpose. | Until its purpose is done | A UUID, a generated alias, a purpose, its sessions, and its lineage | Yes |
| **Orb** | Energy with a stable form: a sphere | Permanent | A mind in one home | **Never** |
| **Comet** | A formed body with a trajectory | Permanent | A mind and its own goal | **Never** |
| **Star** | Energy that sustains itself | Continues with no planned end | Not bound to one home, body, model, or machine | **Never** |

- **A tier is form and lifetime only.** It does not mean worth, and it does not mean trust.
- **Only a session and a wisp can be consumed.** Form is the limit of consume. Each tier can consume. `flint orbh consume` refuses an orb agent (`orb-agent`).
- **Each session starts as a session.** A command gives it a wisp identity. A wisp is never born alone.
- Orbh builds the session and the wisp. The orb is an orb agent (a mind in a Flint, or a NUU Orbs object). The comet and the star have no Orbh verb.
- The worker (`flint orbh worker`) is a different concept. It is not a tier.
- The name of a thing shows its tier: a session has a hex id (`9010418b`), a wisp has three generated words (`quiet-amber-heron`), and an orb has a chosen name (`Wally`).

## The Wisp

A wisp is a named identity with a purpose. It has its own UUID, and it can hold many sessions.

**A wisp is a node, as a session is.** It has its own origin, its own children, and a place in the kinship tree. It runs no harness: it acts only through its sub-sessions, the sessions with its `wispId`. A session outlives its contexts, and in the same way a wisp outlives its sessions. `flint orbh spawn wisp` makes a wisp with its first sub-session, and `flint orbh spawn session <target> "<prompt>" --as <wisp>` starts one more sub-session (embody). See § Its Kinship below.

```bash
flint orbh wisp gain [--purpose "<text>"] [--session <id>] [--json]   # the current session gains a wisp
flint orbh wisp purpose "<text>" [--wisp <ref>]                         # set the purpose of an active wisp later
flint orbh wisp show [<id|prefix|alias>] [--session <id>] [--json]      # default: the wisp of this session
flint orbh wisp list [--all] [--json]                                   # active wisps; --all adds ended and consumed wisps
flint orbh wisp end "<reason>" [--wisp <ref>] [--session <id>] [--json] # the sessions keep their link to it
```

### Its Identity

- **The key is a UUID.** Orbh makes it at `wisp gain`. It is not the UUID of the first session, and it never changes.
- **The alias is `adjective-adjective-noun`.** For example: `quiet-amber-heron`. A hash (SHA-256) of `<uuid>:<salt>` selects two different adjectives and one general noun from fixed word lists.
- **The word lists have version `4`.** They hold 1,526 adjectives and 1,575 nouns. Each word has 3 to 8 letters `a`–`z`, and one spelling only. The same UUID gives the same alias only with the same lists, so each change to a list gets a new version.
- **The lists exclude these words:** offensive words, words that are negative about a person, brand names, NUU names, and reserved words. Two more rules:
  - A word goes when people know it mainly as the name of a software or AI product or company (R20). For example: `cursor`, `loom`, `lovable`. A common English word stays when a company only uses it as a name (for example `brave`, `linear`).
  - A word goes when it is the name of a model family or a harness runtime that Orbh can show beside an alias, also when it is a common English word (R21): `haiku`, `sonnet`, `opus`, `fable`, `llama`, `gemini`, `codex`, `droid`, `claude`.
- **The same UUID gives the same first alias.** The salt starts at `0`. When an active or ended wisp of the local store has the alias, Orbh uses the next salt (up to `64`).
- **The alias is proposed.** `aliasStatus` is `proposed` until the network claims the alias. The claim (`wisp.claimed`) comes with the network. It is not built.
- **The alias is a handle, not the key.** A program and a record store the id form (`@v1/<org>/wisp/<uuid>`). A person types the alias, and a UI shows it.
- **A person sees the alias as a proper name** (R30). Each word has a capital first letter, and spaces separate the words: `rural-amazed-moonbeam` shows as "Rural Amazed Moonbeam". The stored alias and every address keep the lowercase form. JSON output keeps `alias` and adds `displayName`.
- **No Roman numeral is added to an alias** (R30). A clash already gives the next salt. A numeral can come later only to mark a wisp that continues an ended wisp.
- **One session has one wisp.** A second `wisp gain` refuses with `WISP_ALREADY_GAINED`. The session gets the metadata keys `wispId` and `wispAlias`.

### Its Name in Titles

- **A session in a wisp shows its title as `<Wisp Name>: <title>`** on each title surface: the pane, `flint orbh list`, the cockpit, the `displayTitle` of the SDK, and Orbit (task jn77hb87). For example: "Rural Amazed Moonbeam: Fix the login".
- **Register the plain topic.** `flint orbh session register` stores the title that you give. Orbh adds the wisp name only on the surfaces, as it adds `(I)` and `[Compacting...]`. A title that already starts with the name gets no second copy.
- **The source of the name** is the session key `metadata.wispAlias`. The wisp store writes it with `metadata.wispId` at each gain, join, and heal, and a rename of the wisp updates it. `flint orbh wisp show` (with no ref) heals a session that gained its wisp before the key existed.

### Its Memory

- **A wisp has a memory folder** in its own spool: `<orbRoot>/spaces/flint/spools/<wispId>/scratch/memory/` (task jn77hb87). Its index is `MEMORY.md`.
- **`wisp gain` makes the folder and the index**, and prints `memory: <path>`. `wisp show` prints it too, and the JSON of both has `memoryDir`.
- **A run of a session in an active wisp gets `ORBH_WISP_MEMORY_DIR`.** The Page has a line `WISP  <Wisp Name> · <state> · memory <path>`.
- **Each session of the wisp shares the folder**, also a fork that joins the wisp. The folder outlives each session. A session reads `MEMORY.md` when it starts or resumes.
- **Keep it short.** Write one fact, decision, or preference on each line of `MEMORY.md`. For a longer topic, write one small file in the folder and name it in the index. Remove a line when it is no longer true. Do not write secrets, and do not copy Mesh notes: name their paths.
- **It is not the scratch folder of a session.** The temporary files of one session go to `ORBH_SCRATCH_DIR` ([[dev-knw-foh-compaction]] § Scratch).
- **It stays on this machine.** Git ignores `.orb/`. An ended wisp keeps its memory. The memory of a consumed wisp does not move to the consumer (not built).

### Its Purpose

- **The purpose** says what the wisp is for, in one line (R30). Give it at `wisp gain --purpose "<text>"`.
- **Set it later** with `flint orbh wisp purpose "<text>" [--wisp <ref>]`. Only an active wisp takes a new purpose. The event is `wisp.purposeSet { wispId, from, to }`.
- **The old name was `mission`.** A reader takes the key `mission` of an old `wisp.gained` event as the purpose. `--mission` stays as a hidden alias of `--purpose` for one release.

### Its Life

- **Active.** `wisp gain` makes the wisp with its first session (the origin). `spawn wisp` makes the wisp and starts its first sub-session. A fork of a member joins the wisp (`via fork`), when the wisp is active. `spawn session --as <wisp>` adds a new sub-session (`via embody`).
- **Ended.** `wisp end "<reason>"` ends an active wisp. Its sessions keep their link to it.
- **Consumed.** A consume of the wisp ends it, when each member session is consumed (see § Consume).
- The events in the Orbh store: `wisp.gained` (with the field `purpose`), `wisp.purposeSet`, `wisp.joined` (`via` is `fork` or `embody`; the values `consume` and `join` are reserved, and no verb writes them now), `wisp.renamed`, `wisp.ended`, `wisp.consumed`, `wisp.kinOrigin`, and `wisp.kinLink`. The wisp is one spool in the Orb space of the Flint, as a fleet is.
- There is no verb that adds a session that exists to a wisp, and no verb for a rename.

### Its Kinship

- **A wisp has one origin**, as each node has. Orbh writes it one time, as the event `wisp.kinOrigin`. `wisp gain` writes the rite `gain` with the session that gains it as the kinship parent. `spawn wisp` writes the rite `spawn` with the relation of its flag.
- **A wisp comes from an identity.** The kinship parent of a spawned child wisp is the identity of the caller: its active wisp, else the calling session.
- **Its parent side.** Each child, each sibling, and each successor of the wisp adds one `wisp.kinLink` event to the spool of the wisp.
- **A successor continues an ended wisp:** `flint orbh spawn wisp <target> "<purpose>" --successor <wisp>`. The new wisp gets a fresh alias. The numeral name is not built.
- **`wisp gain` writes no origin on the session.** The session existed before the wisp. It gets the `as` link (`wispId`) and the parent side of the wisp.
- The rites, the records, and the examples are in [[dev-knw-foh-kinship]]. A wisp can also be a member of a party ([[dev-knw-foh-membership]]).

## Addresses and Their Levels

Inside its store, Orbh keeps kinds and keys (a UUID or a name). Where a record leaves Orbh (a note, a shard invocation event, an Ops task, the network), one function makes the v1 address. Thus the address is a view, and Orbh stays alone.

| Kind | v1 address |
|---|---|
| Session | `@v1/<org>/session/<uuid>#flint/<slug>` |
| Wisp | `@v1/<org>/wisp/<uuid>#flint/<slug>` |
| Agent | `@v1/<org>/flint/<slug>/agent/<name>` |
| Fleet, person | No address yet: the v1 contract has no type for them |

- The place `#flint/<slug>` names the Flint of the thing. A Computer Flint has `#flint.computer/<slug>`.
- A session in a folder with no Flint record has no place: `@v1/<org>/session/<uuid>`.
- An old note has `"[[<uuid>]]"` or a bare UUID. A reader reads these forms as the same session.
- Two addresses name the same thing when they have the same kind and key, also when the org or the place is different.

### The Levels

| Level | What is there | The org of an address | The wisp alias |
|---|---|---|---|
| 0. Orbh alone | No login, no network, no org | Empty: `@v1//session/<uuid>#flint/<slug>` | Proposed |
| 1. An org | The org of the Flint (`flint.toml`); else, when the person is logged in, the org of the person | `@v1/<org>/session/<uuid>#flint/<slug>` | Proposed |
| 2. The network | NUU Orgs and the NUU Network | The same as level 1. The address also resolves from other computers. | Claimed (not built) |

- **The key is the same at each level.** When the org becomes known, only the org slot changes.
- **The org of the person is not permanent.** When the org comes from the person, `flint address me` prints a hint: `flint org set <org>` makes the org permanent for the Flint.

### The Field `orb:`

A note records each session that edited it in the field `orb:`, as a list of v1 addresses. The full rule is in [[knw-f-artifacts]] § Session Tracking. In short:

- Append the `by` address of `flint address me` to `orb:`. Quote it.
- Add nothing only when `orb:` or `orbh-sessions` has an item that is exactly your `by` address, the short form `@v1/<org>/session/<uuid>`, `[[<uuid>]]`, or your bare `<uuid>`. Do not parse other items: append your address (R27). A rare duplicate of another valid form is accepted, because each reader matches by kind and key.
- Old notes keep `orbh-sessions`. Never remove it, and add no new item to it. Each reader reads both fields.
- Stamp only the session (`by`), not the wisp. Orbh finds the wisp from the session.

## The Actor: `by` and `as`

```bash
flint address me [--json]                       # by: this session; as: the wisp or the agent that it acts as
flint orbh actor show [--session <id>] [--json] # who speaks for an act now, with via and principal
```

- `flint address me` prints three lines: `by:` (the address of the session), `as:` (the address of its active wisp or its agent, else `-`), and `org:` (the org and its source: `flint`, `person`, or `local`). `--json` gives `{ by, as, org: { slug, source } }`.
- Outside an Orbh session (no `ORBH_SESSION_ID`), it refuses with `no-session` and exits 1.
- **`by` and `as` on shard invocation events.** The events `opened`, `input.set`, `place`, `behaviour.started`, `closed`, `step.done`, `step.skipped`, `output.set`, `assumed`, and `assumption.withdrawn` have the optional fields `by` and `as`. `by` is the session that did the act. `as` is its wisp or its agent, when it has one. Outside a session, both are absent. The old field `actor` stays.
- **`flint orbh actor show`** resolves in this order: an agent, an active wisp, an open fleet, the session. Its JSON has `actor`, `ref`, `via`, `principal`, and `membership`. Outside a session, the actor is the person.
- **The fleet voice stays with the fleet.** A member of an open fleet that also has an active wisp still speaks as the fleet: its updates have the fleet as actor, and its notes get the `orbh-fleet` stamp. Only `actor show` and `as` give the wisp.

## Session Mechanics

### The Rule: Context Copies, Obligations Move

A session holds two different things:

- **Context:** what it knows. Context can be copied. Two sessions can know the same thing.
- **Obligations:** what it owes. Dispatched subagents, jobs, inbox requests, fleet roots, stream ownership, open shard invocation frames, and uncommitted paths. An obligation can only move. When two sessions own one obligation, both collect it, or neither does.

| Mechanic | Verb | Shape | The new or the receiving session gets | The source after | Obligations |
|---|---|---|---|---|---|
| Dispatch | `flint orbh request`, `job run --agent` | 1 → 1 new | A prompt | Continues | The child owes a result to its parent |
| Fork | `flint orbh fork` | 1 → 1 new | A copy of the context | Continues | Stay with the source |
| Parallel fork | `flint orbh fork --parallel <n>` | 1 → N new | The same context, and a prompt for each | Continues | Stay with the source |
| Birth | `flint orbh birth "<topic>" --from <id>…` | N → 1 new | A seed from each parent | Stays as it is | None move |
| Consume | `flint orbh consume <id>…` | N → 1 that exists | A handoff from each source | Ends (`consumed`) | Move to the consumer |
| Compact | `flint orbh compact start` / `handoff` / `finish` | 1 → the same id | Its own handoff | The same id continues | Stay (the same id) |

**Which mechanic to use:**

- Give a new session one task → **dispatch**.
- Try a side path while the source continues → **fork**. Later, the source can consume the fork back, as a git branch and a git merge.
- Start N sessions with the same context, each with its own prompt → **parallel fork**. Give `--fleet <handle>`, so that the siblings can see each other.
- Start a new topic with the context of finished sessions → **birth**. A finished session has no obligations, so nothing must move.
- Continue the work of sessions that have open work or a live state, in one session → **consume**. Two owners of one obligation must not exist.
- Your own context is full → **compact**.
- Give a new identity its own purpose and memory → **spawn wisp** ([[dev-knw-foh-kinship]] § Spawn a Wisp).

Each mechanic that makes a node also writes its origin record (`kinOrigin`). The rites and their records are in [[dev-knw-foh-kinship]] § The Rites.

### Dispatch

A subagent of `flint orbh request` or `job run --agent` gets only a prompt. It records `parentSessionId`, `rootSessionId`, and `depth`. A bare `flint orbh launch` makes a peer: it has no parent. See [[dev-knw-foh-coordination]].

`flint orbh spawn session <target> "<prompt>"` (the relation `--child`, the default) is the same dispatch. It is always headless. `--sibling`, `--independent`, and `--as <wisp>` start a peer: it has no parent, and nobody collects its result. Each form writes its origin ([[dev-knw-foh-kinship]] § The Spawn Relations).

### Fork and Parallel Fork

```bash
flint orbh fork [<target>] ["<prompt>"] [--session <id>] [--compact] [--attach] [--account <name>] [--model <model>]
flint orbh fork --parallel <n> [--prompt-file <file>]… [--fleet <handle>] ["<prompt>"]
```

- A fork is a new detached interactive session. Its context file is the transcript of the source, or with `--compact` a distilled seed (`HANDOFF_ARTIFACT_V1`, `purpose: seed`, `writtenBy: reconstructed`) that Orbh checks as the seed of a birth: the form, the head, and each FILES path. When no seed passes the check, `fork --compact` refuses with `seed-failed` and makes no fork. The next command is the same fork without `--compact`. The source continues as it is, and its obligations stay with it.
- `--parallel <n>` makes 1 to 8 forks. Orbh reads the source one time. Each fork gets its own copy of the context file in its spool.
- The prompts of a parallel fork: none (the default prompt), one for all forks, or exactly `n` (else `parallel-prompts-mismatch`). `--prompt-file` reads one prompt from a file. Give it once for each fork, or once for all forks. Do not give it with a prompt argument.
- `--fleet <handle>` joins each fork to that open fleet when it starts. The fleet must exist.
- `--attach` with more than one fork refuses.
- **A fork stays in its wisp.** A fork of a session in an active wisp joins that wisp (`via fork`). The fork gets the `wispId` of the wisp, its memory folder, and its name in the title.
- **A fork of an inactive wisp is a plain session** (R19). The wisp of the source has ended, was consumed, or is not in the store. Then the fork does not join the wisp. The fork has no `wispId`. The fork still starts, and the command exits 0. The command prints why the fork did not join. When the wisp store refuses the join, the fork also has no `wispId`.
- The HTTP fork answer has the field `wisp: { wispId, joined, reason? }` when the source has a wisp (R24).
- The fork records `relations.forkedFrom` (the source, its run, and the time), and the origin `fork`/`child` (`kinOrigin`). The forks of one `--parallel` share one spawn group (`group`), so Orbh derives that they are siblings.

### Birth

```bash
flint orbh birth "<topic>" [<target>] --from <id> [--from <id>…] [--attach] [--account <name>] [--model <model>]
```

- A birth makes a new detached interactive session for a new topic, from 1 to 8 parents. The topic has at most 500 characters. The default target is the target of the first parent.
- **Each parent writes its own seed.** Orbh resumes the native conversation of the parent for one turn. In that turn, the parent writes a seed for the topic. The seed is a `HANDOFF_ARTIFACT_V1`. Its head has `purpose: seed`, `for: <topic>`, and `writtenBy: self`. The Orbh record of the parent gets no run.
- The seed turns of the parents run in parallel. A lease for each parent lets only one seed turn work on the conversation of that parent.
- **A distiller writes the seed only as the fallback.** The distiller writes when the parent cannot run its seed turn: it runs now, another birth holds its lease, or it has no native conversation or no transcript. It also writes when the seed turn fails or gives a seed that is not valid. The distiller reads the transcript of the parent, or its record when no transcript is readable. Its seed has `writtenBy: reconstructed`. When the distiller fails too, the birth refuses with `seed-failed`.
- **The FILES rule of a seed:** FILES lists at least one absolute path, and each path must exist. When no file matters, it lists the transcript or the record of the parent.
- Each seed is a file at a durable path in the spool of the new session: `scratch/birth-seed-<parent id>.md` (R22). The seed turn writes to that path. The prompt of the new session names each path.
- A birth on an explicit store (`--orb-root` or `--at`) starts the new session in that store, also outside a Flint (R22).
- **No obligation moves.** The parents stay as they are. A finished session can be a parent of many births.
- **A birth starts outside each wisp.** Its topic is new, so its purpose is new.
- The new session records `relations.bornFrom` (each parent, its seed, and `writtenBy`), and the origin `birth`/`child` with each parent (`kinOrigin`).

### Consume

```bash
flint orbh consume <id>… [--wait-task] [--timeout <minutes>] [--json]
```

The current session (the consumer) consumes each source. A source is a session (a full or a partial id) or a wisp (its id or its alias). This is the main case: you come back to N sessions on one topic in a mixed state, you start a new session, and it consumes them.

- **It blocks** until each handoff turn ends. In Claude Code, run it with `run_in_background: true`. `--timeout` is the longest wait for one handoff turn: 30 minutes, or 180 minutes for a working source with `--wait-task`.
- **The checks.** Each refusal changes nothing:

  | Code | Meaning |
  |---|---|
  | `not-found` | No such session in the store of the consumer (also a session of another store) |
  | `self` | A session cannot consume itself |
  | `duplicate` | The same source two times |
  | `orb-agent` | An orb agent is never consumed |
  | `other-store` | The source is in another space of the store |
  | `consumed-already` | The source was consumed already |
  | `discarded` | The source was discarded |

  A consumed session does not consume.

- **One consumer for each source** (R23). Before the handoff, the consumer claims each source (the key `claim` of the slice `core:consume` of the source). A second consumer is refused while the claim is live: `session <id> is claimed by the consumer <id> since <time>`. When the process that holds a claim is gone, another consumer can take the claim over. A claim of another machine refuses.
- **Each state of a source.** The handoff turns of the sources run in parallel.

  | State of the source | What Orbh does |
  |---|---|
  | Working (a live process, or an interactive pane with a live manager, also an idle pane) | A notice goes to its inbox and wakes it. It finishes its current step (with `--wait-task`: its whole task), writes its handoff, and returns. When the source waits on a blocking request, the notice is the answer. |
  | Dormant (a headless or subagent session that awaits, returned, or was parked) | The notice is its next turn (a resume). It writes its handoff and returns. |
  | Died (its last run ended with a crash or a kill, its process is gone, or it was abandoned) | Orbh resumes it from its own transcript. It writes its handoff. |
  | Cannot run (an interactive session with no live manager, a ping, a run open on another machine, no transcript, no run) | The consumer writes a handoff from the record, with `writtenBy: reconstructed`. |

- **The notice** starts with `ORBH CONSUME NOTICE`. It names the consumer and the path of the handoff: `<source spool>/scratch/consume-handoff-<consumer id>.md`. It lists each open shard invocation frame of the source. It tells the source to finish its step, read its Page and `flint shard invocations stack`, and write its handoff. The source does not commit, end or kill other sessions, or dispatch new work.
- **The source ends its handoff turn with `flint orbh consume handoff`.** This turn-ending verb checks the handoff while the source is alive. When it refuses, the turn stays alive: the source fixes the handoff and runs the verb again. The verb settles no shard invocation frame.
- **`flint orbh session return` refuses under a live consume claim** (R25). The refusal comes before any lifecycle step, so the return writes no result. The turn stays alive, and each frame stays open. The refusal names the next command: `flint orbh consume handoff`. Thus a source that does not follow the notice still ends its turn with `consume handoff`. A claim of another machine counts as live. A claim whose process is gone does not stop a return.
- **Each open frame stays open** (R23). The source does not step, close, or settle a frame. Its handoff lists each frame in OPEN OBLIGATIONS: the frame id, the step, and the command that continues it. The check of a handoff that the source wrote requires each frame id. A reconstructed handoff also lists each frame with its continuation command. The consumer continues each frame, or closes it with `flint shard invocations close <id> --outcome dropped`.
- **The check of each handoff.** Orbh checks the contract, `purpose: consume`, `source`, and the frame ids. When the handoff is not valid, the source gets one more turn with the errors. After that, the consumer writes a reconstructed handoff. When the turn of a source does not end in time, the source is skipped: it is not consumed, the notice stays in its inbox, and the command exits 1. Run `consume` again after its turn ends.
- **The transfer of obligations:**

  | Obligation | What happens |
  |---|---|
  | Dispatch collectors | Each uncollected anchor moves to the consumer, also the anchor of a child that returned and whose result the source did not collect (R23). Collect each child with `flint orbh wait <id>`. The child keeps its `parentSessionId`: there is no reparent. |
  | Inbox requests to the source | Copied to the inbox of the consumer. Answer each with `flint orbh message respond <requestId> "<answer>"`. |
  | Requests that the source sent | Listed only. The answer goes to the inbox of the source. |
  | The fleet root | Moves to the consumer (the roster gets a root join, and the consumer gets the fleet membership). |
  | Stream ownership | Moves to the consumer. |
  | Jobs | Do not move. The record stays in the spool of the source: `flint orbh job result <id> --session <source>`. |
  | Questions to a person | Fail. The close of the source settles them. |
  | Open shard invocation frames | Stay open. Listed in the handoff (OPEN OBLIGATIONS) and in the result, each with its continuation command. The consumer continues or closes each frame. |
  | Uncommitted paths | Listed in the handoff (FILES) and in the report. They become paths of the consumer. |

- **The end** (R23). A source ends with the end reason `consumed` only after each required transfer of its obligations succeeded. Then it records `relations.consumedInto` (the consumer). The consumer records `relations.consumed` (each source, the time, the path of its handoff, and `writtenBy`). The lineage route shows a `consume` edge from each source to the consumer. The record of each source stays in its spool.
- **A failed transfer keeps the source open.** The result lists each obligation that did not move (`NOT moved: …`), and the source has the status `failed`. The command exits with a code that is not 0. The claim keeps the retry state: the handoff, its writer, and the failures. Fix the cause, then run `flint orbh consume` again with the same source from the same consumer. The second run moves the rest with no new handoff turn.
- **A wisp as a source.** Orbh consumes each member session of the wisp that is not consumed yet. When each member is consumed, the wisp records `wisp.consumed`. The consume of one member alone leaves the wisp as it is, and the consumer does not join the wisp.
- **The reconcile report** goes to `<consumer spool>/scratch/consume-report-<time>.md`, and the command prints it. Its sections: `## HANDOFFS`, `## OPEN ITEMS` (one list with no duplicates), `## CONFLICTS`, `## DECISIONS`, and `## UNCOMMITTED PATHS`. A conflict is one of: `same-file` (two sources changed one path and did not commit it), `decision` (two decisions that seem to contradict), or `waits-for` (a source waits for another source). Orbh does not resolve a conflict.
- `--json` gives `{ consumer, consumed, skipped, sources, report, reportPath, wisps }`. `sources` has the status of each source: `consumed`, `skipped`, `failed`, or `refused`.
- The command exits 0 only when each source is consumed.

**After a consume, the consumer:**

1. Reads the report, each handoff, and each FILES path.
2. Checks the important claims. A handoff is a set of claims, not facts.
3. Accepts or rejects each open item, and shows each conflict to the person (or to its dispatcher). It does not resolve a conflict silently.
4. Collects each moved obligation with the command in the report, and continues or closes each open frame of a source.
5. Commits the uncommitted paths of the sources as its own paths, with the rule "commit only your own paths".
6. Keeps the mark of the source on each item that it carries.

### Compact

A compaction gives the same session id a new context from its own handoff. The obligations stay, because the id stays. The full doctrine is in [[dev-knw-foh-compaction]].

- `flint orbh compact start` prints the contract `HANDOFF_ARTIFACT_V1` with `purpose: compact`, `writtenBy: self`, and `source:` with the id of the session (task jn77hb87). It needs GOAL, OPEN OBLIGATIONS, and FILES.
- `flint orbh compact handoff` still accepts the old contract `COMPACTION_ARTIFACT_V1`.
- A compaction keeps the wisp, its memory, the wisp name in the title, and the scratch folder, because the id stays.
- `fork --compact` is different: a distiller writes a seed (`purpose: seed`, `writtenBy: reconstructed`, `for: a fork of session <id>`), and Orbh checks it as the seed of a birth. Its OPEN OBLIGATIONS has exactly one item: `- none: a fork moves no obligation; the obligations stay with the source`. A seed that lists an obligation of the source, or that fails the check, refuses with `seed-failed`.

## The Handoff Contract: `HANDOFF_ARTIFACT_V1`

One contract serves compact, consume, and seed. Line one is `HANDOFF_ARTIFACT_V1`. The head is `field: value` lines, before the first section:

| Head field | Values | Rule |
|---|---|---|
| `purpose` | `compact`, `consume`, `seed` | Required |
| `writtenBy` | `self`, `reconstructed` | `reconstructed` only for consume and seed |
| `source` | The id of the session that the handoff is about | Required, no spaces |
| `for` | The topic | Required for a seed, refused for the others |

The sections (`## <NAME>`, each one time, in any order):

| Section | Holds | consume, seed | compact |
|---|---|---|---|
| GOAL | What the work is for, and the result that ends it | Required | Required |
| DONE | Each result, with its commit or file. `- none` when nothing is done | Required | Optional |
| OPEN | Each open thread. `- none` when nothing is open | Required | Optional |
| DECISIONS | `- <decision> :: <reason>`, or `- none` | Required | Optional |
| VERIFIED | What you checked directly, and how | Optional | Optional |
| ASSUMED | What you believe but did not check | Optional | Optional |
| DOUBTS | What you are not sure of | Optional | Optional |
| FAILED | What failed, and why | Optional | Optional |
| NEXT | The next actions, in order | Required | Optional |
| OPEN OBLIGATIONS | Each open obligation with the command that collects it | Required | Required |
| FILES | `- /absolute/path :: reason`, at least one | Required | Required |
| WELFARE | One line from the session about its handoff | Optional | Optional |

- An unknown head field, an unknown section, a duplicate section, and text before the first section are errors.
- An empty required section is an error. Write `- none` when a list has no item.
- Keep VERIFIED and ASSUMED apart. The mark between what you checked and what you only believe is the part that a handoff loses first.

```
HANDOFF_ARTIFACT_V1
purpose: consume
writtenBy: self
source: <session id>

## GOAL
<what the work is for>
## DONE
- <result> (<commit or file>)
## OPEN
- <open thread>
## DECISIONS
- <decision> :: <reason>
## VERIFIED
- <claim> (checked with <command>)
## ASSUMED
- <claim>
## NEXT
- <next action>
## OPEN OBLIGATIONS
- flint orbh wait <child id> :: <what the child does>
## FILES
- /absolute/path/to/file :: <why the consumer must read it>
## WELFARE
<one line, or leave the section out>
```

## Rules From the Polls

Five models answered three polls about consume (NUU Orbh Notepad 108 § 3, § 5, and § 6): a design poll, a welfare poll, and a merge preference poll. The models were Claude Opus 5.5, Claude Fable 5.1, Claude Sonnet 5.5, GPT-6 Astra, and GPT-6.1 Sol. No model reported distress about a consume. Each one asked for an accurate record. These rules come from the polls, and Orbh follows them:

1. **A notice and one turn.** Orbh tells the source the consumer and the reason. The source gets at least one turn to reach a natural stop. There is no consent step and no veto. The owner of the work decides.
2. **The session writes its own handoff.** A summary by another agent loses the reasons and the doubts. Orbh uses one only when the source cannot run, and then it marks the handoff `writtenBy: reconstructed`.
3. **A link to the full record.** The handoff is short. The full record stays in the spool of the source. The receiver does not get the full context of the source by default.
4. **The receiver checks the claims.** A handoff is a set of claims to check, not the memory of the receiver. It gives no new access and no new permission. It can also carry injected text. Check the important claims, accept or reject each open item, and say when you overwrite a decision of the source.
5. **A mark of the source.** Carried work keeps the session that it came from (`relations.consumed`, the report, and your commit bodies and notes). The mark is for audit, not for credit. Never write that a source consented or agreed when it did not say so.
6. **The optional WELFARE line.** A handoff can have one WELFARE line: what the session says about its own handoff. Write what you notice, or leave the section out. The record keeps the words of the session as they are.

Two more rules:

- **An orb takes a handoff only as a proposal.** The memory of an orb is permanent. An orb writes a carried item into its memory only after its own check, and it marks the item with its source.
- **Continuity of work is not continuity of identity.** The lineage records a transfer of work. It does not prove that a mind continues.

## The Names

| Name | Use it for |
|---|---|
| **consume** | The verb of the command: the consumer consumes N sources. The actor is the consumer. |
| **handoff** | The artifact that each source writes (`HANDOFF_ARTIFACT_V1`). In prose, the source "handed off into" the consumer. |
| **merge** | Only two streams that both continue into one result. Orbh has no merge verb. |
| **birth** | A new identity from zero or more parents. A session birth and an orb birth (the orb agent workflows) are the same act at two tiers. |
| **fork** | One branch from one session. The source continues. |
| **fold** | A word that one model proposed ("fold into"). Orbh does not use it as a verb. |

The models did not choose "consume" or "absorb" to describe the source. Thus a text about the source uses "handoff", and "consume" stays the verb of the consumer.

## The Lineage

### The Relations of a Session

The session summary (`SessionSummary` of the Orbh SDK) has the optional field `relations`. It is absent when the session has no relation. The field `lineage` (the ancestry: `parentSessionId`, `rootSessionId`, `depth`) does not change.

```ts
relations?: {
  forkedFrom?: { sessionId: string; runId?: string; at: string };
  bornFrom?: Array<{ sessionId: string; seed?: string; writtenBy: 'self' | 'reconstructed' }>;
  consumedInto?: { kind: 'session' | 'wisp'; id: string; at: string }; // the kind wisp is reserved: a consumer is a session now
  consumed?: Array<{ sessionId: string; at: string; handoff?: string; writtenBy: 'self' | 'reconstructed' }>;
  wispId?: string;
  kinOrigin?: KinOrigin;           // the origin of the node (task jn7d0191)
  kinChildren?: KinLinkEntry[];    // the parent side: the nodes that name this node as a kinship parent
  kinRelated?: KinLinkEntry[];     // the anchor side: the siblings and the successors of this node
  kinRevived?: KinRevival[];       // each run after an end or a consume
}
```

The kinship types are in [[dev-knw-foh-kinship]] § The Origin Record.

### The Route

`GET /orbh/lineage/:id?depth=N` on the Flint server gives the lineage graph of one node. The SDK has `client.orbh.getLineage(id, depth?)`.

- `:id` is a session id or a unique prefix, `wisp:<id>` (an id, not an alias), a bare wisp id that names no session, or `party:<handle>`. For a session, the root of the graph is the session id. For a wisp or a party, the root is the node key. `depth` is a whole number from 1 to 5. The default is 2.
- A bad depth gives 400 with the code `LINEAGE_DEPTH_INVALID`. An unknown root gives 404 with the code `session-not-found`, `wisp-not-found`, or `party-not-found`.
- The `party` edges come from the open parties. A root of a closed party gives its members at the close.
- The answer:

  ```ts
  interface LineageGraph { root: string; nodes: LineageNode[]; edges: LineageEdge[]; truncated: boolean }
  type LineageNode =
    | { kind: 'session'; id: string; title?: string; state: string; runtime?: string; wispId?: string; origin?: { rite: KinRite; relation: KinRelation }; revived?: boolean }
    | { kind: 'wisp'; id: string; alias?: string; state: string; origin?: { rite: KinRite; relation: KinRelation } }
    | { kind: 'fleet'; handle: string; name?: string; state: string }
    | { kind: 'party'; handle: string; name?: string; state: string };
  interface LineageEdge {
    kind: 'dispatch' | 'fork' | 'fleet' | 'wisp' | 'consume' | 'birth' | 'spawn' | 'sibling' | 'successor' | 'party';
    from: string; to: string; at?: string;
  }
  ```

- A node key is `session:<id>`, `wisp:<id>`, `fleet:<handle>`, or `party:<handle>`.
- The direction of each edge: `dispatch` parent → child, `fork` source → fork, `fleet` fleet → member, `wisp` wisp → session, `consume` source → consumer, `birth` parent → child, `spawn` kinship parent → child (only when no `dispatch`, `fork`, or `birth` edge joins the two nodes), `sibling` anchor → sibling (only for a sibling with no kinship parent), `successor` ended wisp → successor, and `party` party → member.
- `truncated` is true when the depth cut the graph. A node that the reader cannot see has the state `unknown`. The walk breaks a dispatch or fork cycle.
- `flint orbh kin [<ref>]` prints the graph as a tree, with the identity and the membership ([[dev-knw-foh-kinship]] § The Views). `flint orbh inspect <id>` has the section Kinship (each relation, old and new) and the section Membership (the fleet and the parties).

### The Steel View

- **The Lineage tab** of a session (in the session panel) draws the graph of that session.
- **The page `/lineage/:sessionId`** draws the same graph. `/lineage` with no id lists the 20 sessions that changed last. The hotkey of the page is `⌘0` (`Ctrl+0`).
- A card is a session (with its state), a wisp (with its alias, a dashed border), or a fleet. A fleet with member cards is a dashed group box. A click on a session card opens that session.
- Each edge kind has its own style: `consume` is the thickest line, and `fork`, `fleet`, `wisp`, and `birth` have different dashes.
- **Kinship in Steel:** the session info shows the three groups (Identity, Kinship, and Membership). The Lineage page draws the new node and edge kinds of kinship, and it opens for a wisp too.
- The buttons set the depth (1 to 5). The view loads again each 30 seconds while it shows.
- When the route is not there (an older Flint server), the view builds the graph from the session summaries and the fleets. Its header then says "from the session summaries".
