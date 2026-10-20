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

- (Optional) A ref: a session id or prefix, a wisp id or alias, or `party:<handle>`. The default is this session.

# Actions

1. **Read your Page.** Run `flint orbh page`. Read the `KIN` line and the `PARTY` lines ([[dev-knw-foh-page]] § The KIN and PARTY Lines).
2. **Read the full view.**

   ```bash
   flint orbh kin [<ref>] [--depth <n>] [--up | --down] [--json]
   ```

   It prints IDENTITY, KINSHIP (the ancestry, the node, the descent, and the siblings), and MEMBERSHIP (the fleet and the parties). It needs no server.
3. **For another session,** `flint orbh inspect <id>` has the sections "Kinship" and "Membership", and `flint orbh peek <id>` has one `Kin:` line and one `Parties:` line.
4. **Act on a warning.**
   - `⚠ revived after consume: the obligations are with <label>`: this session holds no moved obligation. Do not collect a moved child, answer a moved request, or continue a moved frame. Tell the consumer what you do: `flint orbh message send <consumer id> "<text>"`.
   - `consumed into <label> <time>`: the work of this session went to that consumer. Read the report of the consumer before you continue the work here.
5. **Read each party notice** (`PARTY  ✉ …`). Act only when the fact changes your work.

# Output

- No record. `kin`, `inspect`, `peek`, and an observer Page write nothing. A Page read of your own session marks each party notice that it shows as delivered.

See [[dev-knw-foh-kinship]] § The Views, and [[dev-knw-foh-membership]].
