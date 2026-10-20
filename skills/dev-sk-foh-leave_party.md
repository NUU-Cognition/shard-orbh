---
description: "Leave a party (default: the identity of the caller and its one open party) with a reason, and check the membership of the selected node after"
orb:
  - "@v1/nuucognition/session/df2c23ae-f402-4485-b1a3-bf5005470d4e#flint/nuu-orbh"
orbh-fleet: kinship-1020
---

> [!important] THIS FILE IS AN INSTRUCTION. WHEN REFERENCED IT IS MEANT TO BE TAKEN AS AN ACTION.

Run `flint shard start orbh` if you haven't already.

# Skill: Leave Party

Take a node out of a party. The default member is your identity: your active wisp, else your session. `--session` or `--wisp` selects another node. Use it when the node has no more work with the other members. The history of the party keeps the membership.

# Input

- (Optional) The handle. With no handle, the verb takes the one open party of the selected node.
- (Optional) `--reason "<why>"`
- (Optional) `--session <id>` or `--wisp <ref>`: another node. Outside a session, give one of them: a leave needs a named member.

# Actions

1. **Read the parties of the selected node.** For your own identity, run `flint orbh party list --mine`. For another node, run `flint orbh kin <ref>` (for a wisp: `flint orbh kin wisp:<ref>`) and read MEMBERSHIP. When the node is in more than one open party, give the handle.
2. **When the selected node is the founder and the work of the party is done,** close the party with [[dev-sk-foh-close_party]] in place of a leave. A founder that leaves stays the founder, and it can still close the party.
3. **Leave.**

   ```bash
   flint orbh party leave [<handle>] [--reason "<why>"] [--session <id> | --wisp <ref>]
   ```

4. **Read the output.** It names the member, the count of members after, and the sessions that got a notice. A leave of a node that is not a member refuses and lists the parties of that node. A leave of a closed party refuses.
5. **Check the selected node, not the caller.**
   - Run `flint orbh party show <handle> --json`. `party.members` must have no entry with the `kind` and the full `id` of the selected node. `party.history` has its `left` event.
   - Only when the selected node is your own identity: `flint orbh party list --mine` no longer lists the party. When another node left, your own list can still show the party, because you are still a member.

# Output

- The event `party.left` on the party spool, with the reason in the history
- One notice in `core:party-notices` of each other member session, and of each live sub-session of each other member wisp

See [[dev-knw-foh-membership]] § Parties.
