---
description: "Gain a wisp: give a session that exists (this session or a selected one) a wisp identity with a purpose, and check the wisp origin, the WISP line, and the memory of that session"
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

1. **Select the session.** With no `--session`, the selected session is this session (`$ORBH_SESSION_ID`). With `--session <id>`, it is that session. `flint orbh kin <id>` prints its full id on the `id:` line. Use this id in each check below.
2. **Check that the selected session has no wisp.** Run `flint orbh wisp show --session <id>`. A session in a wisp shows that wisp, and a second gain refuses with `WISP_ALREADY_GAINED`. Do not run a bare `wisp show` for another session: it reads the caller.
3. **Gain.**

   ```bash
   flint orbh wisp gain --purpose "<one line>" [--session <id>]
   ```

4. **Read the output.** It names the alias, the id, the purpose, and `memory: <path>`.
5. **Check the selected session.**
   - `flint orbh wisp show --session <id>` shows the new wisp, its purpose, and its memory folder.
   - `flint orbh kin <id>` shows `acts as: wisp <Wisp Name> (<id>)`, and `flint orbh kin wisp:<alias>` shows `origin: gained by session <id>`.
   - The Page of that session (`flint orbh page <id>`) has the `WISP` line, and its title shows the wisp and its purpose: `<Initials> | <purpose>` in the pane, and `<Wisp Name> | <purpose>` in `flint orbh list`. A gained wisp alone gives the session no `KIN` line: the `WISP` line shows the wisp.
   - Only when the selected session is this session: `flint address me` gives the wisp address on its `as:` line. For another session, `address me` reads the caller, so it proves nothing.
6. **The memory.** The selected session reads `MEMORY.md` in the memory folder. Its run that was live at the gain has no `ORBH_WISP_MEMORY_DIR`. Its next run gets it.
7. **From now on,** a wisp that the selected session spawns comes from the wisp (rule 1). A session that it spawns still comes from the session.

# Output

- A new wisp with its origin: rite `gain`, relation `child`, parents [the session that gains it]
- The parent side (`kinChildren`) on the session, and the `as` link: `wispId` and `wispAlias`
- The session gets no origin: it existed before the wisp

See [[dev-knw-foh-kinship]] § Wisp Gain, and [[dev-knw-foh-identity]] § The Wisp.
