---
description: "Kinship — the three layers (identity, kinship, membership), the node kinds, the two rules, the origin record (kinOrigin) and its parent side, the spawn relations, each rite with its verb, its record, and an example (spawn session, spawn wisp, embody, fork, birth, wisp gain, consume, compact, revive), siblings, and the views (flint orbh kin, the KIN line, inspect, peek, the lineage route, the chrome, Steel)"
orb:
  - "@v1/nuucognition/session/df2c23ae-f402-4485-b1a3-bf5005470d4e#flint/nuu-orbh"
orbh-fleet: kinship-1020
---

# Knowledge: Kinship

This file tells you where an Orbh node comes from: which rite made it, what Orbh records, and how to read it. Read it before you run `flint orbh spawn`, `fork`, `birth`, `consume`, or `wisp gain`.

The design is in NUU Orbh Notepad 109 (# 1 to # 5) and its build contract, "Kinship and Membership Contract" (K0 to K9). Task `jn7d0191` built it. The groups of a node (fleets and parties) are in [[dev-knw-foh-membership]]. The wisp, the addresses, and `by` and `as` are in [[dev-knw-foh-identity]].

## The Three Layers

| Layer | Its question | When Orbh writes it | Can it change? | The records |
|---|---|---|---|---|
| **Identity** | Who does the node act as now? | At `wisp gain`, at embody, and when a fork joins a wisp | Yes | `wispId`, and the `as` of `flint address me` |
| **Kinship** | Where did the node come from? | One time, in the rite that makes the node | No. There is no reparent (R12 of Mission 027). | `kinOrigin`, `kinChildren`, `kinRelated`, `kinRevived`, and the old records |
| **Membership** | What does the node belong to now? | At each join, leave, and close | Yes. The history stays. | The fleet stamp and the party spools ([[dev-knw-foh-membership]]) |

A simple test: a fact of kinship is true for all time. A fact of membership is true for a period. A fact of identity is true now.

## The Nodes

- **A node is a session or a wisp.** A party and a fleet are groups. They are not nodes of kinship.
- **A session** runs a harness. It has one context at a time. A compaction gives it a new context, and its id stays.
- **A wisp** is a named identity with a purpose ([[dev-knw-foh-identity]] § The Wisp). A session outlives its contexts. In the same way, a wisp outlives its sessions.
- The orb, the comet, and the star have no kinship verb now.

### Three Words for Three Relations

| Word | Meaning | Where Orbh keeps it |
|---|---|---|
| **kinship parent** | A node that the new node came from | `kinOrigin.parents` |
| **`for` parent** | The session that dispatched a session and collects its result. Only a dispatch child has one. | `parentSessionId` (this build does not change it) |
| **`by`** | The session that ran the rite. It is provenance, not kinship. It is absent when a person ran the rite outside a session. | `kinOrigin.by` |

A dispatch child has the same session as its kinship parent, its `for` parent, and its `by`. A spawned wisp has its kinship parent in the identity of the caller, no `for` parent, and the calling session as `by`. An embodied session (`spawn session --as`) has the wisp as its kinship parent and no `for` parent.

## The Two Rules

**1. A session comes from a session, and a wisp comes from an identity.** The kinship parent of a session child is the calling session. The kinship parent of a wisp child is the identity of the caller: its active wisp, else the calling session.

Example: the session `9010418b` acts as the wisp Rural Amazed Moonbeam.

```bash
flint orbh spawn session claude/o55h "Review the diff of lane L3"
# the new session: rite spawn, relation child, parents [session 9010418b], by 9010418b
flint orbh spawn wisp claude/o55h "The wisp name generation"
# the new wisp: rite spawn, relation child, parents [wisp Rural Amazed Moonbeam], by 9010418b
```

The session child owes its result to the session `9010418b`, so the session is its parent. The wisp child is a fact about two wisps, so the wisp is its parent. `by` keeps the session that ran each rite.

**2. A wisp runs no harness.** A wisp acts only through its sub-sessions: the sessions with its `wispId`. To give work to a wisp, start a sub-session for it.

Example: `flint orbh spawn wisp claude/o55h "The wisp name generation"` makes the wisp Final Sandy Origin and starts its first sub-session. That sub-session has the origin `embody`/`child` of the wisp. Later, `flint orbh spawn session claude/o55h "Polish the noun list" --as final-sandy-origin` starts one more sub-session of the same wisp.

## The Origin Record: `kinOrigin`

Each rite that makes a node writes one origin record on the new node. Orbh writes it one time and never changes it.

| Field | Value |
|---|---|
| `rite` | `spawn`, `embody`, `fork`, `birth`, or `gain` |
| `relation` | `child`, `sibling`, `successor`, or `independent` |
| `parents` | The kinship parents (`{ kind, id }`): none for `independent`, one for most rites, 1 to 8 for `birth` |
| `anchor` | For `sibling`: the node that the new node is a sibling of. For `successor`: the ended wisp that it continues. |
| `by` | The session that ran the rite (`ORBH_SESSION_ID` of the caller). Absent outside a session. |
| `at` | The time of the rite |
| `group` | The spawn group: one id for all forks of one `fork --parallel` |

```json
"kinOrigin": {
  "rite": "spawn", "relation": "child",
  "parents": [{ "kind": "session", "id": "9010418b-f6be-418d-8b5c-95dfff830c8a" }],
  "by": "9010418b-f6be-418d-8b5c-95dfff830c8a", "at": "2026-10-20T03:10:00.000Z"
}
```

- **Where it is.** A session keeps the four keys in its `metadata`: `kinOrigin`, `kinChildren`, `kinRelated`, and `kinRevived`. A wisp keeps its origin and its parent side in its spool: the event `wisp.kinOrigin` at its creation, and one `wisp.kinLink` event for each entry of its parent side. The session summary shows the keys in `relations`.
- **The parent side.** After the new node exists, Orbh appends one entry (`{ kind, id, rite, relation, at, group? }`) to `kinChildren` of each kinship parent, and to `kinRelated` of the anchor. It appends under a lock of that node, after a fresh read. A second append of the same id changes nothing. Thus each link has two sides.
- **A failure of the parent side does not undo the new node.** Orbh prints one warning. The readers still find the child from its `kinOrigin`.
- **The old records stay.** `forkedFrom`, `bornFrom`, `parentSessionId`, `wispId`, and the fleet stamp do not change. `kinOrigin` is one more record. It does not replace them.
- **A node from before this build has no `kinOrigin`.** It is valid. The readers derive its origin from the old records: `forkedFrom` gives `fork`, `bornFrom` gives `birth`, and `parentSessionId` gives `spawn`/`child`. They mark that origin as derived: `flint orbh kin` and `inspect` add `from the old records`. A node with no origin at all shows `no recorded origin`.
- **The readers ignore an item of a bad shape.** They never stop on it.

## The Spawn Relations

`flint orbh spawn` is the one front for the new rites. Give one relation flag. The flags are mutually exclusive, and the default is `--child`.

```bash
flint orbh spawn session <target> "<prompt>" [--child | --sibling | --independent | --as <wisp>] \
    [--headless | --interactive] [--account <name>] [--model <model>] [--fleet <handle>] [--json]
flint orbh spawn wisp <target> "<purpose>" [--prompt "<first prompt>"] \
    [--child | --sibling | --successor <wisp> | --independent] \
    [--headless | --interactive] [--account <name>] [--model <model>] [--json]
```

| Relation | `spawn session` | `spawn wisp` |
|---|---|---|
| `--child` (the default) | A dispatch. Parents: [the calling session]. `parentSessionId` is the caller. The child shows in the `DISPATCHES` block of the caller, and `flint orbh wait <id>` collects it. A dispatch is always headless, so `--interactive` refuses. The child inherits the fleet of its parent, so `--fleet` refuses. Outside a session it refuses: use `--independent`. | Parents: [the identity of the caller]. In a session with no wisp, the parent is the session. Outside a session it refuses: use `--independent`. |
| `--sibling` | A peer. Parents: the `kinOrigin.parents` of the caller as they are (also none). For a caller with no `kinOrigin`: [its `for` parent], else none. Anchor: the caller. Nobody owes a result. Outside a session it refuses: a sibling needs a caller. | Parents: the `kinOrigin.parents` of the identity of the caller. Anchor: the identity of the caller. Outside a session it refuses. |
| `--successor <wisp>` | — | Parents: the `kinOrigin.parents` of that wisp. Anchor: that wisp. It refuses while that wisp is active: end it first with `flint orbh wisp end`. It also works outside a session. |
| `--independent` | A peer with no kinship parent, as the bare `flint orbh launch`. It also works outside a session. | A wisp with no kinship parent. It also works outside a session. |
| `--as <wisp>` | **Embody.** A peer: `parentSessionId` is null, and nobody owes a result. Rite `embody`, parents: [the wisp]. The wisp must be active. | — |

- **The default mode** of `spawn session` is `--headless`. The default mode of `spawn wisp` is `--interactive`: its first sub-session is a detached interactive session, as `birth` starts it. `--headless` and `--interactive` together refuse.
- **A sibling, an independent session, and an embodied session are peers.** `parentSessionId` is null, and nobody collects them. They take no fleet by inheritance. `--fleet <handle>` makes the new session a member of an open fleet. The output then has the line `Fleet: <handle> (<name>) · member · via launch`.
- **The output** names the new node, its relation and its rite, its parents, its anchor, and the next command:

  ```
  spawned: session eca8d3f5-… · headless
  relation: child (rite spawn)
  parents: session 647fed45 (Orbh claude session)
  next: flint orbh wait eca8d3f5-…
  ```

  The next command is `flint orbh wait <id>` for a child, `flint orbh attach <id>` for an interactive session, and `flint orbh inspect <id>` for a headless peer.
- **`--json`** gives `{ kind, id, wispId?, alias?, origin }` for `spawn session`, and `{ kind, id, alias, sessionId, origin }` for `spawn wisp`.
- **A headless `spawn session` gets no preset title.** The new session registers its own title.
- **The old verbs stay.** `request`, `job run --agent`, and a worker of a member are a child spawn. A bare `launch` is an independent spawn. Each one writes the same origin record as its `spawn` form.

## The Rites

Each block gives when to use the rite, the command, what Orbh records, and one example. "The parent side" is the entry in `kinChildren` (or `kinRelated` for an anchor).

### Spawn a Session (dispatch, sibling, independent)

- **When:** give one task to a new session. Use `--child` when you collect the result. Use `--sibling` for a peer of the same parent. Use `--independent` for a peer with no kinship.
- **Command:** `flint orbh spawn session <target> "<prompt>" [--child | --sibling | --independent]`. The old verbs write the same record: `flint orbh request`, `job run --agent`, and a worker of a member are `spawn`/`child`. A bare `flint orbh launch` is `spawn`/`independent`.
- **Records:** `kinOrigin` with the rite `spawn` and the relation of the flag. The parent side on each kinship parent, and `kinRelated` on the anchor of a sibling. A child also has `parentSessionId`, `rootSessionId`, and `depth`, as before.
- **Example:** `flint orbh spawn session claude/o55h "Write the party skills" --sibling --fleet kinship-1020` starts a peer of the caller. It has the parents of the caller, the caller as its anchor, and the fleet `kinship-1020`. The output has `relation: sibling (rite spawn)`, the `parents:` line, `anchor: session <caller>`, and `Fleet: kinship-1020 (Kinship Fleet) · member · via launch`.
- The skill: [[dev-sk-foh-spawn_session]].

### Spawn a Wisp

- **When:** start a new identity with its own purpose, and its first sub-session.
- **Command:** `flint orbh spawn wisp <target> "<purpose>" [--prompt "<first prompt>"] [--child | --sibling | --successor <wisp> | --independent]`.
- **What it does:** Orbh makes the wisp (a fresh UUID, a fresh alias, and the purpose), writes its origin, and starts its first sub-session. The first sub-session joins the wisp before its first run, so that run has `ORBH_WISP_MEMORY_DIR`. Its title is the purpose. Its first prompt names the wisp and its parent, gives the purpose and the memory folder (read `MEMORY.md` first), and then gives the `--prompt` text.
- **The output:**

  ```
  spawned: wisp Fabled Wintry Anklet (bdf87e94-…)
  relation: child (rite spawn)
  parents: session 647fed45
  memory: <orbRoot>/spaces/flint/spools/bdf87e94-…/scratch/memory
  first sub-session: 346b0343-… · headless · embody
  ```

  With the default `--interactive`, the output also has `next: flint orbh attach <id>`.
- **When the first launch fails,** the wisp stays. The verb prints the next command (`flint orbh spawn session <target> "<prompt>" --as <alias>`) and exits 1.
- **Records:** `wisp.kinOrigin` on the new wisp, with the rite `spawn`. The parent side on each kinship parent, and on the anchor. The first sub-session gets `wispId` and its own origin: rite `embody`, relation `child`, parents [the new wisp]. `flint orbh wisp show --json` gives `kinOrigin`, `kinChildren`, and `kinRelated`.
- **A successor gets a fresh alias.** A numeral name ("… II") is not in this build.
- **Example:** an ended wisp Quiet Amber Heron had a purpose that is not done. `flint orbh spawn wisp claude/o55h "Finish the lineage view" --successor quiet-amber-heron` makes a new wisp with the parents of Quiet Amber Heron, and Quiet Amber Heron as its anchor.
- The skill: [[dev-sk-foh-spawn_wisp]].

### Embody

- **When:** give one more task to a wisp that is active. The new session acts as the wisp.
- **Command:** `flint orbh spawn session <target> "<prompt>" --as <wisp>`.
- **Records:** the new session gets `wispId` (the event `wisp.joined` with `via: 'embody'` on the wisp spool) and the origin `embody`/`child` with parents [the wisp]. The wisp gets the parent side. A headless sub-session joins the wisp before its first run. An interactive sub-session joins just after its start. Both runs get `ORBH_WISP_MEMORY_DIR`.
- **It is a peer.** `parentSessionId` is null, and nobody collects its result.
- **The live sub-sessions.** The output has the line `wisp: <Wisp Name> (<id>) · <n> live sub-session(s)`. A live sub-session is a session of the wisp whose work state is not terminal. More than one live sub-session of one wisp is permitted.
- **An ended wisp refuses:** "A session embodies an active wisp only. To continue its work, spawn a successor". An unknown wisp refuses: `No wisp has the id or alias <ref>.`
- **Example:** `flint orbh spawn session claude/o55h "Review the noun list" --as final-sandy-origin` starts a sub-session of Final Sandy Origin. Its title shows `Final Sandy Origin: <title>`.
- The skill: [[dev-sk-foh-embody_wisp]].

### Fork

- **When:** try a side path while the source continues.
- **Command:** `flint orbh fork [<target>] ["<prompt>"] [--compact]`, or `flint orbh fork --parallel <n>` ([[dev-knw-foh-identity]] § Fork and Parallel Fork).
- **Records:** the origin `fork`/`child` with parents [the source]. The forks of one `--parallel` share one `group`. The source gets the parent side. The old record `forkedFrom` stays. A fork of a session in an active wisp joins that wisp (identity). The kinship parent stays the source session.
- **Example:** `flint orbh fork --parallel 3 --fleet kinship-1020 "Try one design each"` makes three forks with one `group`. Orbh derives that they are siblings.
- The skill: [[dev-sk-foh-fork_session]].

### Birth

- **When:** start a new topic with the context of finished sessions.
- **Command:** `flint orbh birth "<topic>" [<target>] --from <id> [--from <id>…]` ([[dev-knw-foh-identity]] § Birth).
- **Records:** the origin `birth`/`child` with one parent for each `--from` (1 to 8). Each parent gets the parent side. The old record `bornFrom` stays. No obligation moves. A birth starts outside each wisp and each fleet.
- **Example:** `flint orbh birth "The party notice in Steel" --from 3d54e255 --from 32d1b8e0` makes one session with two kinship parents. Its `KIN` line shows `born from 2`.
- The skill: [[dev-sk-foh-birth_session]].

### Wisp Gain

- **When:** a session that exists takes a wisp identity for a purpose.
- **Command:** `flint orbh wisp gain [--purpose "<text>"] [--session <id>]`.
- **Records:** the new wisp gets the origin `gain`/`child` with parents [the session that gains it]. The session gets the parent side. The session gets **no** origin: it existed before the wisp. It gets the `as` link (`wispId`), as before. Thus `wisp gain` writes kinship for the wisp and identity for the session.
- **Example:** in session `9010418b`, `flint orbh wisp gain --purpose "Session lineage"` makes Rural Amazed Moonbeam. The kinship parent of the wisp is `9010418b`. From then, a wisp that this session spawns has Rural Amazed Moonbeam as its parent (rule 1).
- The skill: [[dev-sk-foh-gain_wisp]].

### Consume

- **When:** one session continues the work of sessions that have open work or a live state.
- **Command:** `flint orbh consume <id>…` ([[dev-knw-foh-identity]] § Consume).
- **Records:** consume makes no node, so it writes no `kinOrigin`. Each source ends with the reason `consumed` and records `relations.consumedInto` (the consumer). The consumer records `relations.consumed`. The lineage route shows a `consume` edge from each source to the consumer. The source keeps its own origin.
- **Membership effect:** the roles of a source move to the consumer, for example the fleet root. This is the one place where a kinship rite changes membership.
- **Example:** session `833dd8ce` runs `flint orbh consume 9010418b`. The `KIN` line of `9010418b` then has the segment `consumed into <label> <time>`, and the label names `833dd8ce`.
- The workflow: [[dev-wkfl-foh-consume_sessions]].

### Compact

- **When:** your own context is full ([[dev-knw-foh-compaction]]).
- **Records:** compaction makes no node. The same id gets a new context, so kinship and membership do not change. The wisp, its memory, and the fleet stay.

### Revive

- **When:** a person or a message starts a run on a session whose retention is `closed`: after a close or after a consume. Revive is not a verb. Orbh records it at the run start.
- **Not a revive:** a session that `finished`, or that stopped with an `error`, and runs again. That is a normal continuation, and Orbh writes no revival.
- **Records:** the run start appends one entry to `kinRevived`: `{ at, runId?, after: 'consumed' | 'ended', consumedInto?, by? }`. `after: 'ended'` means a close. For a consumed session, `consumedInto` is copied into the entry, and `consumedInto` stays as history.
- **The obligations do not come back.** They stay with the consumer. The `KIN` line of a session that was revived after a consume warns: `⚠ revived after consume: the obligations are with <ref>`. After a close, the line has `revived after an end <HH:MM>`, with no warning.
- **A run from before this build has no record.** Such a session shows `consumed into …` with no revive warning.
- **Example:** an operator resumes the session `3d54e255` after the session `833dd8ce` consumed it. The run start records `after: consumed` with `consumedInto` `833dd8ce`. `3d54e255` does not collect a child or answer a request that moved to `833dd8ce`.

### What Each Rite Does in Each Layer

| Rite | Kinship | Identity | Membership |
|---|---|---|---|
| spawn session `--child` | a new node, parent: the caller | none | the child inherits the fleet of its parent (`--fleet` refuses) |
| spawn session `--sibling`, `--independent` | a new node, parents by the relation | none | none, or `--fleet` |
| embody (`--as`) | a new node, parent: the wisp | the session acts as the wisp | none, or `--fleet` |
| spawn wisp | a new wisp and its first sub-session (embody) | the sub-session acts as the new wisp | none |
| fork | a new node, parent: the source | joins the active wisp of the source | none, or `fork --parallel --fleet` |
| birth | a new node, 1 to 8 parents | none: outside each wisp | none: outside each fleet |
| wisp gain | a new wisp, parent: the session | the session acts as the wisp | none |
| consume | the sources end into the consumer | none | the roles of the sources go to the consumer |
| compact | none: the same node | none | none |
| revive | `kinRevived` on the node | none | none |
| fleet join, party join | none | none | a new member, with or without kinship to the others |

## Siblings

Orbh derives siblings. It stores no sibling list. Two nodes are siblings when one of these is true:

- They have the same kinship parents.
- They are in the same spawn group (`group`, from `fork --parallel`).
- One node has the other as its `anchor` with the relation `sibling`.

**The sibling count can be a lower bound.** When the reader cannot decide each candidate, the views show the count as `N+` (for example `256+ siblings`), or they give no count.

Nodes that do the same work with no shared origin are not siblings. Put them in a party ([[dev-knw-foh-membership]]).

## The Views

All views read the same facts with one shared reader and one pure summary (`summarizeKinship`). Thus the Page, `kin`, `inspect`, `peek`, and the chrome agree.

### `flint orbh kin`

```bash
flint orbh kin [<ref>] [--depth <n>] [--up | --down] [--json]
```

- **The ref:** a session id or prefix; a wisp as `wisp:<ref>`, or as a bare wisp id, prefix, alias, or name; or `party:<handle>` (a bare handle works too). The default is the calling session. An unknown ref refuses: `No session, wisp, or party <ref> in this store.`
- **The sections:** IDENTITY (the node, the wisp that it acts as, its origin, its counts, and its consume), KINSHIP (the ancestry up and the descent down as trees, each edge with its kind, then the siblings), and MEMBERSHIP (the fleet with the role of the node, and each party with its count of members and the role of the node).
- **`--depth <n>`** sets how many steps the walk takes: 1 to 5, the default is 2. `--up` prints only the ancestry, and `--down` prints only the descent. Both together refuse: `Give --up or --down, not both.` When the walk stops at the depth and more relations exist, `kin` prints the next command, for example `flint orbh kin <id> --depth 3`.
- **`--json`** gives `{ root, depth, graph, summary, wisp?, party? }`. `summary` is only for a session root. A wisp root gives `wisp`, and a party root gives `party`.
- **It reads the store directly.** It needs no server, and it writes nothing. It leaves out the discarded sessions.

```
$ flint orbh kin 9010418b
IDENTITY
  session 9010418b · Kinship Fleet · working
  acts as: wisp Rural Amazed Moonbeam (6b9362be)
  origin: no recorded origin
  56 children · 0 siblings · consumed into session 833dd8ce (CONSUME NUU Orbh · nuu-night-1019) 2026-10-19T12:23:56.828Z
KINSHIP
  ancestry (up 2)
    ● session 9010418b · Kinship Fleet · working
    └─ wisp ← wisp Rural Amazed Moonbeam (6b9362be) · active
  descent (down 2)
    ● session 9010418b · Kinship Fleet · working
    ├─ birth → session 304b4004 · Wisp Name Polish · needs-input
    ├─ consume → session 833dd8ce · CONSUME NUU Orbh · nuu-night-1019 · awaiting
    ├─ dispatch → session 010a268f · M027 L6: Orbh - one handoff contract · finished
    …
  siblings (0)
MEMBERSHIP
  fleet kinship-1020 (Kinship Fleet) · role root · open
```

### The Other Views

- **The `KIN` line of the Page** shows the origin, the counts, the consume, and the revive facts. A plain dispatch child gets no `KIN` line. See [[dev-knw-foh-page]] § The KIN and PARTY Lines.
- **`flint orbh inspect <id>`** has the section "Kinship" (Origin, Parent, Wisp, Continues, Subagents, Children, Siblings, Consumed into, Consumed, and Revived) and the section "Membership" (Fleet, and one Party row for each party). **`flint orbh peek <id>`** has one `Kin:` line and one `Parties:` line, and `peek --json` has `kinship`.
- **The lineage route** (`GET /orbh/lineage/:id`, [[dev-knw-foh-identity]] § The Lineage) has the node kind `party` (`party:<handle>`) and the edge kinds `spawn` (a kinship parent → the child, when no `dispatch`, `fork`, or `birth` edge joins them), `sibling` (the anchor → a sibling with no kinship parent), `successor` (the ended wisp → its successor), and `party` (the party → each member). A session node and a wisp node have `origin: { rite, relation }`. A session node has `revived` after a revive. The root can be a session, `wisp:<id>` (an id, not an alias), a bare wisp id, or `party:<handle>`. An unknown root gives 404 with `session-not-found`, `wisp-not-found`, or `party-not-found`. The `party` edges come from the open parties. A root of a closed party gives its members at the close.
- **The Orbh chrome:** the info panel is the Session Inspect of the session. It adds the section Identity (Wisp, Purpose), and it puts its Kinship and Membership rows into the inspect sections of the same names. Each fact shows one time. A failed read shows "—". A long row ends with "…", but the revive warning wraps. The panel reads again when it opens, at each event of its own spool or of a child, and on `r`.
- **Steel:** the session info shows the three groups. The Lineage page draws the new node and edge kinds, and it opens for a wisp too.

The skill: [[dev-sk-foh-read_kinship]].
