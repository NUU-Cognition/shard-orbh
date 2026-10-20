---
description: "Membership — the layer of what a node belongs to now: parties (the verbs, the members, the founder and the close, the notices, the store and the routes, many parties for one node), fleets as a membership, a recruit with no kinship, which group to use, and rooms later"
orb:
  - "@v1/nuucognition/session/df2c23ae-f402-4485-b1a3-bf5005470d4e#flint/nuu-orbh"
orbh-fleet: kinship-1020
---

# Knowledge: Membership

This file tells you what an Orbh node can belong to, and how it joins and leaves. Read it before you create or join a party, and before you recruit a node into a fleet.

The design is in NUU Orbh Notepad 109 (# 4 and # 5) and its build contract (K5). Where a node came from is in [[dev-knw-foh-kinship]]. The fleet doctrine is in [[dev-knw-foh-fleets]].

## The Layer

- **Membership says what a node belongs to now.** A node joins a group, leaves it, or the group closes. Each change is an event, and the history stays.
- **Membership is not kinship.** A join writes no kinship record, and it does not change the kinship of the node. A kinship rite writes no membership, with two exceptions: a dispatch child inherits the fleet of its parent at launch, and a consume moves the roles of a source (for example the fleet root) to the consumer.
- **There are two kinds of group in this build:** the fleet and the party. One model for both comes later.

| Group | For | A node can be in | Has a root | Has a charter |
|---|---|---|---|---|
| **Fleet** | One program of many sessions, with one voice | One open fleet | Yes | Yes |
| **Party** | Any nodes that work together | Many parties | No: it has a founder | No: it has an optional purpose |

## Parties

A party is a group of nodes with a handle and member notices. A member is a session or a wisp.

### The Verbs

```bash
flint orbh party create <handle> [--name "<name>"] [--purpose "<text>"] [--session <id> | --wisp <ref>] [--json]
flint orbh party join <handle> [--session <id> | --wisp <ref>] [--json]
flint orbh party leave [<handle>] [--session <id> | --wisp <ref>] [--reason "<why>"] [--json]
flint orbh party show [<handle>] [--json]
flint orbh party list [--all] [--mine] [--json]
flint orbh party close <handle> [--reason "<why>"] [--force] [--json]
```

- **The handle** has 2 to 32 lower-case letters, digits, and hyphens (`^[a-z0-9][a-z0-9-]{1,31}$`). It is unique for all time in the store, also after a close. The name is the handle in Title Case when you give no `--name`.
- **The default member** of `create` (the founder), `join`, and `leave` is the identity of the caller: its active wisp, else the calling session. `--session <id>` (an id or a prefix) and `--wisp <ref>` (an id, a prefix, or an alias) name another node. Give one of them, not both. Outside a session, give one of them.
- **`leave` with no handle** takes the one open party of the member. When the member is in more than one open party, it refuses and lists them: name one.
- **`show` with no handle** shows the parties of the identity of the caller. With one party, it shows that party. `show` lists each member with its kind, its label (the title of a session, the display name of a wisp), its state, and its role, then the last 20 events of the history.
- **`list`** shows the open parties. `--all` adds the closed parties. `--mine` shows only the parties of the identity of the caller.

### The Rules

- **A second join changes nothing.** A join of a node that is a member already prints that nothing changed.
- **A closed party is terminal.** A join, a leave, and a second close of a closed party refuse.
- **A leave of a node that is not a member refuses.** The refusal lists the parties of that node.
- **The founder closes the party.** The founder is the node that created it (the calling session or its identity). A person outside a session can also close it. A live member that is not the founder closes it only with `--force`. A node that is not a member cannot close it, also with `--force`.
- **The founder stays the founder** after it leaves, so it can still close the party.

### A Wisp as a Member

- A wisp joins as one member. Its sub-sessions do not join one by one.
- When the caller acts as a wisp, `party join <handle>` joins the wisp, not the session. To join the session alone, give `--session "$ORBH_SESSION_ID"`.
- Each live sub-session of a member wisp gets the notices of the party.

### The Notices

At each join, leave, and close, each **other** member gets a notice. The node that the event is about gets no notice: the node that joined or left, or the node that closed the party. A session that acts as that node (a sub-session of that wisp) gets no notice too.

- **A session member** gets one record in its slice `core:party-notices`: `{ id, party, event, about, aboutLabel, at, delivered }`. `event` is `joined`, `left`, or `closed`. `about` is the node that joined or left, or the node that closed the party. For a close by a person, `about` is null and `aboutLabel` is "a person".
- **A wisp member** gets the record in each of its live sub-sessions. An ended session gets no record.
- **A notice never wakes a session.** It starts no run, and it is not a message. An awaiting member sees it at its next turn.
- **A working member** sees it on its Page. With managed delivery, the manager sends a Page to a working session when it has an undelivered party notice. The orchestrator sweep and the pager never wake an awaiting session for it.
- **The Page shows each undelivered notice one time**, and then marks it delivered: `PARTY  ✉ <label> joined <handle> (<HH:MM>)`. See [[dev-knw-foh-page]] § The KIN and PARTY Lines.
- **The label is fixed at the write.** A later rename of the session or the wisp does not change it.

Use a notice for a fact that a member must know. To ask a member to act, send a message: `flint orbh message send <id> "<text>"`. A message wakes an awaiting session.

### The Store and the Routes

- Each party is one event-sourced spool in the `flint` Orb space of the Flint (the space that syncs). The id comes from the handle. The events are `party.created`, `party.joined`, `party.left`, `party.set`, and `party.closed`.
- The party spool is the source of truth. The member has no record of its parties. To find the parties of a node, Orbh reads the party spools.
- The Flint server has `GET /orbh/parties` (the open parties; `?all=1` adds the closed ones) and `GET /orbh/parties/:handle`. The SDK has `client.orbh.listParties({ all? })` and `client.orbh.getParty(handle)`.
- The lineage route shows a party as the node `party:<handle>`, with a `party` edge to each member ([[dev-knw-foh-kinship]] § The Views).

### Many Parties for One Node

A node can be in many parties at the same time. Each party has its own members and its own notices.

Example: the wisp Final Sandy Origin owns the wisp names. It reviews with a builder wisp in the party `names-review`, and it reports to the Steel lane in the party `steel-names`.

```bash
# in a sub-session of Final Sandy Origin
flint orbh party create names-review --purpose "Review each new word list"
flint orbh party join steel-names
flint orbh party show                 # both parties of the wisp
```

Each other member of `steel-names` gets one notice: `Final Sandy Origin joined steel-names`.

## Fleets as a Membership

A fleet is a membership: a group for one program, with a root, a charter, and one voice. The verbs and the rules are in [[dev-knw-foh-fleets]]. This build does not change fleets.

- **One open fleet for each session.** A member of an open fleet cannot declare or join another fleet. It must leave first. This rule does not apply to parties.
- **Most members are descendants.** A dispatch child of a member is a member from its first event (`via inherit`). That is a membership rule that rides on the dispatch.
- **A fleet can recruit any node.** `flint orbh fleet join <handle> --session <id>` adds a session that is not a descendant. `flint orbh launch <target> "<duty>" --fleet <handle>` and `flint orbh spawn session <target> "<duty>" --sibling --fleet <handle>` add a new peer.
- **A sibling takes no fleet by inheritance.** `spawn session --sibling` and `--independent` give a session in no fleet, unless you give `--fleet`.

## A Recruit With No Kinship

A recruit keeps its own kinship. `fleet join` and `party join` write no kinship record.

Example: the root of the fleet `kinship-1020` needs a reviewer. The operator started the reviewer last week with a bare `flint orbh launch`, so its origin is `spawn`/`independent`. Its id starts with `5c2e91aa`.

```bash
flint orbh fleet join kinship-1020 --session 5c2e91aa
flint orbh kin 5c2e91aa
```

`kin` then shows the origin `independent` under KINSHIP, and the fleet `kinship-1020` under MEMBERSHIP. The session is a member of the fleet now. The root is not its kinship parent, and the session owes no result to the root.

## Which Group to Use

- **A program of many sessions, with one voice and a close-out:** a fleet ([[dev-knw-foh-fleets]] § When to Declare).
- **Nodes that work together, also in many groups or for a long time:** a party.
- **Nodes with a shared origin:** no group. Orbh derives them as siblings ([[dev-knw-foh-kinship]] § Siblings).
- **A channel for messages:** a room ([[dev-knw-foh-coordination]]).

## Rooms Later

Rooms stay as they are in this build. A room is a channel for messages, not a membership of this layer. A later build can make a room the channel of a party.
