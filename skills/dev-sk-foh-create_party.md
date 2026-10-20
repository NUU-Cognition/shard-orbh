---
description: "Create a party with a handle, a name, and a purpose; the identity of the caller is the founder; then bring the members in"
orb:
  - "@v1/nuucognition/session/df2c23ae-f402-4485-b1a3-bf5005470d4e#flint/nuu-orbh"
orbh-fleet: kinship-1020
---

> [!important] THIS FILE IS AN INSTRUCTION. WHEN REFERENCED IT IS MEANT TO BE TAKEN AS AN ACTION.

Run `flint shard start orbh` if you haven't already.

# Skill: Create Party

Make a party: a group of sessions and wisps with a handle and member notices. Your identity is the founder. Use it when nodes work together and must know who joins and leaves. For a program of many sessions with one voice, declare a fleet ([[dev-knw-foh-fleets]]).

# Input

- The handle: 2 to 32 lower-case letters, digits, and hyphens, unique for all time in the store
- (Optional) `--name "<name>"` (the default is the handle in Title Case) and `--purpose "<one line>"`
- (Optional) `--session <id>` or `--wisp <ref>`: another founder. Outside a session, give one of them.

# Actions

1. **Look first.** Run `flint orbh party list --all`. When a party already has this intent, join it with [[dev-sk-foh-join_party]]. A closed handle cannot come back.
2. **Create.**

   ```bash
   flint orbh party create <handle> [--name "<name>"] [--purpose "<one line>"]
   ```

3. **Check.** `flint orbh party show <handle>` shows the party, its state `open`, and your identity as the founder. The `PARTY` line of your Page shows the handle.
4. **Bring the members in.** Join a node yourself with `flint orbh party join <handle> --session <id>` (or `--wisp <ref>`), or ask it by message: `flint orbh message send <id> "Join the party <handle>: flint orbh party join <handle>"`.

# Output

- A new party spool in the `flint` Orb space, with the event `party.created`
- The founder as the first member (`role founder`)

See [[dev-knw-foh-membership]] § Parties.
