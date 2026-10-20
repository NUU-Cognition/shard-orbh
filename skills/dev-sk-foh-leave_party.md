---
description: "Leave a party (default: the identity of the caller and its one open party) with a reason, and check the membership after"
orb:
  - "@v1/nuucognition/session/df2c23ae-f402-4485-b1a3-bf5005470d4e#flint/nuu-orbh"
orbh-fleet: kinship-1020
---

> [!important] THIS FILE IS AN INSTRUCTION. WHEN REFERENCED IT IS MEANT TO BE TAKEN AS AN ACTION.

Run `flint shard start orbh` if you haven't already.

# Skill: Leave Party

Take a node out of a party. The default member is your identity: your active wisp, else your session. Use it when the node has no more work with the other members. The history of the party keeps the membership.

# Input

- (Optional) The handle. With no handle, the verb takes the one open party of the member.
- (Optional) `--reason "<why>"`
- (Optional) `--session <id>` or `--wisp <ref>`: another node

# Actions

1. **Read your parties.** Run `flint orbh party list --mine`. When the member is in more than one open party, give the handle.
2. **When you are the founder and the work of the party is done,** close it with [[dev-sk-foh-close_party]] in place of a leave. A founder that leaves stays the founder, and it can still close the party.
3. **Leave.**

   ```bash
   flint orbh party leave [<handle>] [--reason "<why>"] [--session <id> | --wisp <ref>]
   ```

4. **Read the output.** It names the member, the count of members after, and the sessions that got a notice. A leave of a node that is not a member refuses and lists the parties of that node. A leave of a closed party refuses.
5. **Check.** `flint orbh party list --mine` no longer lists the party.

# Output

- The event `party.left` on the party spool, with the reason in the history
- One notice in `core:party-notices` of each other member session, and of each live sub-session of each other member wisp

See [[dev-knw-foh-membership]] § Parties.
