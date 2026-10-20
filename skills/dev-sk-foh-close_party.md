---
description: "Close a party (the founder, or a person outside a session; a member only with --force), with a reason, and check that it is closed"
orb:
  - "@v1/nuucognition/session/df2c23ae-f402-4485-b1a3-bf5005470d4e#flint/nuu-orbh"
orbh-fleet: kinship-1020
---

> [!important] THIS FILE IS AN INSTRUCTION. WHEN REFERENCED IT IS MEANT TO BE TAKEN AS AN ACTION.

Run `flint shard start orbh` if you haven't already.

# Skill: Close Party

Close a party when its work is done. A closed party is terminal: it takes no join, no leave, and no second close. Its handle stays used for all time. A close does not stop, close, or kill a session.

# Input

- The handle (or the id) of an open party
- (Optional) `--reason "<why>"`
- (Optional) `--force`: close as a member that is not the founder

# Actions

1. **Read the party.** Run `flint orbh party show <handle>`. Read the founder and the members.
2. **Check that you may close it.** The founder closes the party. A person outside a session can also close it. A member that is not the founder uses `--force` only when the founder ended or the operator asks for it. A node that is not a member cannot close the party.
3. **Close.**

   ```bash
   flint orbh party close <handle> --reason "<why>" [--force]
   ```

4. **Read the output.** It names the party, the reason, the members at the close, and the sessions that got a notice.
5. **Check.** `flint orbh party list --all` shows the party as `closed`, and `flint orbh party list` no longer shows it.

# Output

- The event `party.closed` on the party spool, with the reason. `members` keeps the members at the close.
- One notice in `core:party-notices` of each other member session, and of each live sub-session of each other member wisp

See [[dev-knw-foh-membership]] § Parties.
