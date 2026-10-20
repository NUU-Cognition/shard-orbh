---
description: "Create a party with a handle, a name, and a purpose; the identity of the caller is the founder (or a person makes it with no founder outside a session); then bring the members in"
orb:
  - "@v1/nuucognition/session/df2c23ae-f402-4485-b1a3-bf5005470d4e#flint/nuu-orbh"
orbh-fleet: kinship-1020
---

> [!important] THIS FILE IS AN INSTRUCTION. WHEN REFERENCED IT IS MEANT TO BE TAKEN AS AN ACTION.

Run `flint shard start orbh` if you haven't already.

# Skill: Create Party

Make a party: a group of sessions and wisps with a handle and member notices. In a session, your identity is the founder, or `--session` or `--wisp` selects another founder. Use it when nodes work together and must know who joins and leaves. For a program of many sessions with one voice, declare a fleet ([[dev-knw-foh-fleets]]).

# Input

- The handle: 2 to 32 lower-case letters, digits, and hyphens, unique for all time in the store
- (Optional) `--name "<name>"` (the default is the handle in Title Case) and `--purpose "<one line>"`
- (Optional) `--session <id>` or `--wisp <ref>`: another founder

# Actions

1. **Look first.** Run `flint orbh party list --all`. When a party already has this intent, join it with [[dev-sk-foh-join_party]]. A closed handle cannot come back.
2. **Select the founder.**
   - In a session with no flag: your identity (your active wisp, else your session).
   - With `--session <id>` or `--wisp <ref>`: that node. For a session, `flint orbh kin <id>` prints its full id on the `id:` line. For a wisp, `flint orbh wisp show <ref>` prints it.
   - Outside a session with no flag: **no founder.** A person makes the party. It starts with 0 members. Only a person outside a session, or a member with `--force`, can close it.
3. **Create.**

   ```bash
   flint orbh party create <handle> [--name "<name>"] [--purpose "<one line>"] [--session <id> | --wisp <ref>]
   ```

4. **Check the selected founder, not the caller.**
   - Run `flint orbh party show <handle> --json`. `party.state` is `open`. `party.founder` has the `kind` and the full `id` of the selected founder, and `party.members` has that node with `role founder`.
   - For a party with no founder, `party show <handle>` prints `founder: none (a person made the party)` and `members: 0`, and the JSON has no `founder` key.
   - Only when the founder is your own identity: the `PARTY` line of your Page shows the handle.
5. **Bring the members in.** Join a node with `flint orbh party join <handle> --session <id>` (or `--wisp <ref>`), or ask it by message: `flint orbh message send <id> "Join the party <handle>: flint orbh party join <handle>"`.

# Output

- A new party spool in the `flint` Orb space, with the event `party.created`
- The founder as the first member (`role founder`), or no founder and no member when a person made the party outside a session

See [[dev-knw-foh-membership]] § Parties.
