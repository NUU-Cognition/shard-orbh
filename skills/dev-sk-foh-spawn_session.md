---
description: "Spawn a session with a relation to the caller (child, sibling, or independent), read its origin, and collect or coordinate it"
orb:
  - "@v1/nuucognition/session/df2c23ae-f402-4485-b1a3-bf5005470d4e#flint/nuu-orbh"
orbh-fleet: kinship-1020
---

> [!important] THIS FILE IS AN INSTRUCTION. WHEN REFERENCED IT IS MEANT TO BE TAKEN AS AN ACTION.

Run `flint shard start orbh` if you haven't already.

# Skill: Spawn Session

Start a new session with a relation to the caller: a child that owes you its result, a sibling, or an independent peer. Use it to give one task to a new session. To start a session that acts as a wisp, use [[dev-sk-foh-embody_wisp]].

# Input

- The target (`runtime/profile`) and a complete, self-contained prompt. The new session shares none of your context.
- The relation: `--child` (the default), `--sibling`, or `--independent`
- (Optional) `--account <name>`, `--model <model>`
- (Optional, not with `--child`) `--interactive` (the default is `--headless`) and `--fleet <handle>`

# Actions

1. **Choose the relation.**
   - `--child`: a dispatch, as `flint orbh request` is. You collect the result. You must run it in a session. A child is always headless, and it inherits your fleet: `--interactive` and `--fleet` refuse.
   - `--sibling`: a peer with the same kinship parents as you, and you as its anchor. Nobody collects its result. You must run it in a session.
   - `--independent`: a peer with no kinship parent, as a bare `flint orbh launch` is. It also works outside a session.
2. **Spawn.**

   ```bash
   flint orbh spawn session <target> "<prompt>" [--child | --sibling | --independent] [--interactive] [--fleet <handle>]
   ```

3. **Read the output.** It names the new session, its relation and its rite, its parents, its anchor (for a sibling), and the next command:

   ```
   spawned: session eca8d3f5-… · headless
   relation: child (rite spawn)
   parents: session 647fed45 (Orbh claude session)
   next: flint orbh wait eca8d3f5-…
   ```

   With `--fleet`, the output also has `Fleet: <handle> (<name>) · member · via launch`. It shows only after Orbh stored the membership, before the first run. A second `--child` with the same prompt in the same turn starts no second child: it prints `Warning: re-attached to the open dispatch <id> of the same prompt`.
4. **Check.**
   - A child: collect its result with `flint orbh wait <id>` (in Claude Code, with `run_in_background: true`). The child shows in the `DISPATCHES` block of your Page.
   - A headless peer: the next command is `flint orbh inspect <id>`. An interactive peer: the next command is `flint orbh attach <id>`. Coordinate by message: `flint orbh message send <id> "<text>"`.
   - `flint orbh kin <id>` shows the origin under IDENTITY.
5. **When it refuses,** read the reason. A child outside a session refuses: use `--independent`. Two relation flags refuse. `--headless` and `--interactive` together refuse. A refused fleet join (for example, a closed fleet) abandons the new session with no run, and the command exits 1. `SpawnRecordMissingError` means that the store does not have the origin or the membership after the start: the spawn is not a success, and the error gives the close command. A launch host of an older build does not start the session (exit 1, no session).

# Output

- A new session with `kinOrigin`: rite `spawn` and the relation of the flag. A headless session gets no preset title: it registers its own title.
- The parent side: an entry in `kinChildren` of each kinship parent, and in `kinRelated` of the anchor of a sibling
- A child also has `parentSessionId` = the caller, and owes the caller its result. A peer has no `parentSessionId`.

See [[dev-knw-foh-kinship]] § Spawn a Session and § The Spawn Relations.
