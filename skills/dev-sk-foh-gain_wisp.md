---
description: "Gain a wisp: give a session that exists a wisp identity with a purpose, and check the wisp origin, the WISP line, and the memory"
orb:
  - "@v1/nuucognition/session/df2c23ae-f402-4485-b1a3-bf5005470d4e#flint/nuu-orbh"
orbh-fleet: kinship-1020
---

> [!important] THIS FILE IS AN INSTRUCTION. WHEN REFERENCED IT IS MEANT TO BE TAKEN AS AN ACTION.

Run `flint shard start orbh` if you haven't already.

# Skill: Gain Wisp

Give a session that exists a wisp identity with a purpose. The session becomes the first sub-session of the new wisp. Use it when the work of this session will outlive this session. To make a wisp with a new session, use [[dev-sk-foh-spawn_wisp]].

# Input

- The purpose, in one line
- (Optional) `--session <id>`: the session that gains the wisp (the default is this session)

# Actions

1. **Check that the session has no wisp.** Run `flint orbh wisp show`. A second gain refuses with `WISP_ALREADY_GAINED`.
2. **Gain.**

   ```bash
   flint orbh wisp gain --purpose "<one line>" [--session <id>]
   ```

3. **Read the output.** It names the alias, the id, the purpose, and `memory: <path>`.
4. **Check.**
   - The Page has the `WISP` line, and the title shows `<Wisp Name>: <title>`.
   - `flint address me` gives the wisp address on its `as:` line.
   - `flint orbh kin` shows `acts as: wisp <Wisp Name> (<id>)`, and `flint orbh kin wisp:<alias>` shows `origin: gained by session <id>`. A gained wisp alone gives the session no `KIN` line: the `WISP` line shows it.
   - Read `MEMORY.md` in the memory folder. The run that gained the wisp has no `ORBH_WISP_MEMORY_DIR`. The next run gets it.
5. **From now on,** a wisp that this session spawns comes from the wisp (rule 1). A session that it spawns still comes from the session.

# Output

- A new wisp with its origin: rite `gain`, relation `child`, parents [the session that gains it]
- The parent side (`kinChildren`) on the session, and the `as` link: `wispId` and `wispAlias`
- The session gets no origin: it existed before the wisp

See [[dev-knw-foh-kinship]] § Wisp Gain, and [[dev-knw-foh-identity]] § The Wisp.
