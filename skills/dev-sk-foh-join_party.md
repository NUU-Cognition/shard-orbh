---
description: "Join a node to an open party (default: the identity of the caller), and check the membership and the notices to the other members"
orb:
  - "@v1/nuucognition/session/df2c23ae-f402-4485-b1a3-bf5005470d4e#flint/nuu-orbh"
orbh-fleet: kinship-1020
---

> [!important] THIS FILE IS AN INSTRUCTION. WHEN REFERENCED IT IS MEANT TO BE TAKEN AS AN ACTION.

Run `flint shard start orbh` if you haven't already.

# Skill: Join Party

Join a node to a party. The default member is your identity: your active wisp, else your session. A node can be in many parties. A join writes no kinship.

# Input

- The handle (or the id) of an open party
- (Optional) `--session <id>` or `--wisp <ref>`: another node. Outside a session, give one of them.

# Actions

1. **Read the party.** Run `flint orbh party show <handle>`. Its state must be `open`: a closed party refuses a join.
2. **Choose the member.** When you act as a wisp, the default joins the wisp, and each live sub-session of the wisp gets the notices. To join this session alone, give `--session "$ORBH_SESSION_ID"`.
3. **Join.**

   ```bash
   flint orbh party join <handle> [--session <id> | --wisp <ref>]
   ```

4. **Read the output.** It names the member, the count of members, and the sessions that got a notice. When the node is a member already, nothing changes.
5. **Check.** `flint orbh party list --mine` lists the party, and the `PARTY` line of your Page shows it.

# Output

- The event `party.joined` on the party spool, with `role member`
- One notice in `core:party-notices` of each other member session, and of each live sub-session of each other member wisp. A notice wakes no session.

See [[dev-knw-foh-membership]] § Parties.
