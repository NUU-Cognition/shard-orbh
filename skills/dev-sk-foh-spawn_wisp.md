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

- The target (`runtime/profile`) of the first sub-session, and the purpose, in one line
- (Optional) `--prompt "<first prompt>"`: the task of the first sub-session
- The relation: `--child` (the default), `--sibling`, `--successor <wisp>`, or `--independent`
- (Optional) `--headless` (the default is `--interactive`), `--account <name>`, `--model <model>`

# Actions

1. **Choose the relation.**
   - `--child`: the new wisp comes from your identity: your active wisp, else your session. You must run it in a session.
   - `--sibling`: the new wisp has the same kinship parents as your identity, and your identity as its anchor. You must run it in a session.
   - `--successor <wisp>`: the new wisp continues an ended wisp. End that wisp first: `flint orbh wisp end "<reason>" --wisp <wisp>`. The verb refuses while that wisp is active. It also works outside a session.
   - `--independent`: the new wisp has no kinship parent. It also works outside a session.
2. **Spawn.**

   ```bash
   flint orbh spawn wisp <target> "<purpose>" [--prompt "<first prompt>"] [--child | --sibling | --successor <wisp> | --independent] [--headless]
   ```

3. **Read the output.**

   ```
   spawned: wisp Fabled Wintry Anklet (bdf87e94-…)
   relation: child (rite spawn)
   parents: session 647fed45
   memory: <orbRoot>/spaces/flint/spools/bdf87e94-…/scratch/memory
   first sub-session: 346b0343-… · headless · embody
   ```

   With the default `--interactive`, it also has `next: flint orbh attach <id>`. Give that command to the person, or put it in your result.
4. **When the first launch fails,** the wisp stays, and the verb exits 1. Run the next command that it prints: `flint orbh spawn session <target> "<prompt>" --as <alias>`.
5. **Check.**
   - `flint orbh wisp show <alias>` shows the wisp, its purpose, and its memory folder. `--json` adds `kinOrigin`, `kinChildren`, and `kinRelated`.
   - `flint orbh kin <alias>` shows its origin and its first sub-session.
6. **A wisp runs no harness.** To give it more work later, start one more sub-session with [[dev-sk-foh-embody_wisp]].

# Output

- A new wisp (a fresh UUID, a fresh alias, and the purpose) with its origin (`wisp.kinOrigin`, rite `spawn`)
- The parent side on each kinship parent, and on the anchor
- Its first sub-session: `wispId` = the new wisp before its first run (so the run has `ORBH_WISP_MEMORY_DIR`), the origin `embody`/`child` with parents [the new wisp], and the purpose as its title. Its first prompt names the wisp and its parent, gives the purpose and the memory folder, and then gives the `--prompt` text.
- A successor gets a fresh alias. It gets no numeral name.

See [[dev-knw-foh-kinship]] § Spawn a Wisp and § The Two Rules.
