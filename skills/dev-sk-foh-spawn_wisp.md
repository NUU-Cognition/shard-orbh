---
description: "Spawn a wisp with a purpose and a relation (child, sibling, successor, or independent), start its first sub-session, and check its origin"
orb:
  - "@v1/nuucognition/session/df2c23ae-f402-4485-b1a3-bf5005470d4e#flint/nuu-orbh"
orbh-fleet: kinship-1020
---

> [!important] THIS FILE IS AN INSTRUCTION. WHEN REFERENCED IT IS MEANT TO BE TAKEN AS AN ACTION.

Run `flint shard start orbh` if you haven't already.

# Skill: Spawn Wisp

Make a new wisp with its own purpose, and start its first sub-session. Use it for a new identity that outlives one session: a long piece of work with its own memory. To give a session that exists a wisp, use [[dev-sk-foh-gain_wisp]].

# Input

- The target (`runtime/profile`) and the purpose, in one line
- (Optional) `--prompt "<first prompt>"`
- The relation: `--child` (the default), `--sibling`, `--successor <wisp>`, or `--independent`
- (Optional) `--headless` (the default is `--interactive`), `--account <name>`, `--model <model>`

# Actions

1. **Choose the relation.**
   - `--child`: the new wisp comes from your identity: your active wisp, else your session.
   - `--sibling`: the new wisp has the same kinship parents as your identity, and your identity as its anchor.
   - `--successor <wisp>`: the new wisp continues an ended wisp. End that wisp first: `flint orbh wisp end "<reason>" --wisp <wisp>`. The verb refuses while that wisp is active.
   - `--independent`: the new wisp has no kinship parent.
2. **Spawn.**

   ```bash
   flint orbh spawn wisp <target> "<purpose>" [--prompt "<first prompt>"] [--child | --sibling | --successor <wisp> | --independent] [--headless]
   ```

3. **Read the output.** It names the new wisp (its alias and its id), its relation, its parents, its first sub-session, and the next command. With the default `--interactive`, the next command is `flint orbh attach <id>`. Give it to the person, or put it in your result.
4. **Check.**
   - `flint orbh wisp show <alias>` shows the wisp, its purpose, and its memory folder.
   - `flint orbh kin <alias>` shows its origin and its first sub-session.
5. **A wisp runs no harness.** To give it more work later, start one more sub-session with [[dev-sk-foh-embody_wisp]].

# Output

- A new wisp (a fresh UUID, a fresh alias, and the purpose) with its origin (`wisp.kinOrigin`, rite `spawn`)
- The parent side on each kinship parent, and on the anchor
- Its first sub-session: `wispId` = the new wisp, and the origin `embody`/`child` with parents [the new wisp]. Its first prompt has the purpose, the `--prompt` text, and the path of the wisp memory.
- A successor gets a fresh alias. It gets no numeral name.

See [[dev-knw-foh-kinship]] § Spawn a Wisp and § The Two Rules.
