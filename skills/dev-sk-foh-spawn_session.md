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
- (Optional) `--interactive` (the default is `--headless`), `--account <name>`, `--model <model>`, `--fleet <handle>`

# Actions

1. **Choose the relation.**
   - `--child`: you collect the result. It is a dispatch, as `flint orbh request` is. You must run it in a session.
   - `--sibling`: a peer with the same kinship parents as you, and you as its anchor. Nobody collects its result.
   - `--independent`: a peer with no kinship parent, as a bare `flint orbh launch` is. It also works outside a session.
2. **Spawn.**

   ```bash
   flint orbh spawn session <target> "<prompt>" [--child | --sibling | --independent] [--fleet <handle>]
   ```

3. **Read the output.** It names the new session, its relation, its parents, and the next command.
4. **Check.**
   - A child: collect its result with `flint orbh wait <id>` (in Claude Code, with `run_in_background: true`). The child shows in the `DISPATCHES` block of your Page. It inherits your fleet.
   - A sibling or an independent peer: `flint orbh kin <id>` shows its origin. Coordinate by message: `flint orbh message send <id> "<text>"`. It is in no fleet unless you gave `--fleet`. Then `flint orbh fleet show <handle> --members` lists it.
5. **Outside a session, `--child` refuses.** Use `--independent`.

# Output

- A new session with `kinOrigin`: rite `spawn` and the relation of the flag
- The parent side: an entry in `kinChildren` of each kinship parent, and in `kinRelated` of the anchor of a sibling
- A child also has `parentSessionId` = the caller, and owes the caller its result

See [[dev-knw-foh-kinship]] § Spawn a Session and § The Spawn Relations.
