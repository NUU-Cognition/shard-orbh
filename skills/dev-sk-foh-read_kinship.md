---
description: "Read the kinship and the membership of a node (the KIN and PARTY lines, flint orbh kin, inspect, peek), and act on a consume or a revive warning"
orb:
  - "@v1/nuucognition/session/df2c23ae-f402-4485-b1a3-bf5005470d4e#flint/nuu-orbh"
orbh-fleet: kinship-1020
---

> [!important] THIS FILE IS AN INSTRUCTION. WHEN REFERENCED IT IS MEANT TO BE TAKEN AS AN ACTION.

Run `flint shard start orbh` if you haven't already.

# Skill: Read Kinship

Read where a node came from and what it belongs to. Use it when you start or resume and your Page has a `KIN` line, before you consume or birth, before you add a node to a group, and when a person asks.

# Input

- (Optional) A ref: a session id or prefix; a wisp as `wisp:<ref>`, or as a wisp id, prefix, alias, or name; or `party:<handle>`. The default is this session.

# Actions

1. **Read your Page.** Run `flint orbh page`. Read the `KIN` line and the `PARTY` lines ([[dev-knw-foh-page]] § The KIN and PARTY Lines). A plain dispatch child, a session with only an `independent` origin, and a session whose only kinship is its gained wisp have no `KIN` line.
2. **Read the full view.**

   ```bash
   flint orbh kin [<ref>] [--depth <n>] [--up | --down] [--json]
   ```

   It prints IDENTITY (the node, the wisp that it acts as, its origin, and its counts), KINSHIP (the ancestry and the descent as trees, then the siblings), and MEMBERSHIP (the fleet and the parties). `--depth` is 1 to 5 (the default is 2). It needs no server, and it writes nothing.
3. **For another session,** `flint orbh inspect <id>` has the sections "Kinship" and "Membership", and `flint orbh peek <id>` has one `Kin:` line and one `Parties:` line.
4. **Read the counts with care.**
   - `N+ siblings` is a lower bound: the reader could not decide each candidate.
   - A `KIN` line with no counts means that the store did not list its sessions in time. Run `flint orbh kin` for the counts.
   - `from the old records` means that the node has no `kinOrigin`: Orbh derived its origin from `forkedFrom`, `bornFrom`, or `parentSessionId`.
5. **Act on the consume and revive facts.**
   - `⚠ revived after consume: the obligations are with <ref>`: this session holds no moved obligation. Do not collect a moved child, answer a moved request, or continue a moved frame. Tell the consumer what you do: `flint orbh message send <consumer id> "<text>"`.
   - `consumed into <ref> <HH:MM>`: the work of this session went to that consumer. Read the report of the consumer before you continue the work here.
   - `revived after an end <HH:MM>`: the session was closed and runs again. This is a fact, not a warning.
6. **Read each party notice** (`PARTY  ✉ …`). Act only when the fact changes your work.

# Output

- No record. `kin`, `inspect`, `peek`, and a Page of another session write nothing. A Page read of your own session marks each party notice that it shows as delivered.

See [[dev-knw-foh-kinship]] § The Views, and [[dev-knw-foh-membership]].
