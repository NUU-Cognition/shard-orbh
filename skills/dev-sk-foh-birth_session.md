---
description: "Birth a session for a new topic from 1 to 8 parent sessions, with a seed from each parent and no move of obligations, and check its origin"
orb:
  - "@v1/nuucognition/session/df2c23ae-f402-4485-b1a3-bf5005470d4e#flint/nuu-orbh"
orbh-fleet: kinship-1020
---

> [!important] THIS FILE IS AN INSTRUCTION. WHEN REFERENCED IT IS MEANT TO BE TAKEN AS AN ACTION.

Run `flint shard start orbh` if you haven't already.

# Skill: Birth Session

Make a new session for a new topic, from the context of 1 to 8 parent sessions. No obligation moves, and the parents stay as they are. Use it when the parents finished their work and a new topic needs what they know. When a parent has open work, use [[dev-wkfl-foh-consume_sessions]].

# Input

- The topic: at most 500 characters
- One `--from <id>` for each parent (1 to 8)
- (Optional) The target (the default is the target of the first parent), `--account <name>`, `--model <model>`, `--attach`

# Actions

1. **Check each parent.** Run `flint orbh peek <id>`. A parent can be finished, awaiting, or working. When a parent has open obligations that must continue, consume it instead.
2. **Birth.**

   ```bash
   flint orbh birth "<topic>" [<target>] --from <id> [--from <id>…]
   ```

   Each parent writes its own seed in one turn. A distiller writes the seed only when the parent cannot (`writtenBy: reconstructed`). When no seed is valid, the birth refuses with `seed-failed`, and no session exists.
3. **Read the output.** It names the new session and the path of each seed (`scratch/birth-seed-<parent id>.md` in the spool of the new session). The next command is `flint orbh attach <id>`.
4. **Check.** `flint orbh kin <id>` shows `born from <n>` and each parent. The new session is outside each wisp and each fleet. To give it a wisp, use [[dev-sk-foh-gain_wisp]] with `--session <id>`.

# Output

- A new session with the origin `birth`/`child`, with one kinship parent for each `--from`
- The old record `bornFrom` (each parent, its seed, and `writtenBy`), and the parent side (`kinChildren`) on each parent
- No obligation moves

See [[dev-knw-foh-kinship]] § Birth, and [[dev-knw-foh-identity]] § Birth.
