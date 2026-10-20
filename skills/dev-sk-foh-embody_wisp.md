---
description: "Embody a wisp: start a new sub-session that acts as an active wisp, and check its origin and the live sub-sessions"
orb:
  - "@v1/nuucognition/session/df2c23ae-f402-4485-b1a3-bf5005470d4e#flint/nuu-orbh"
orbh-fleet: kinship-1020
---

> [!important] THIS FILE IS AN INSTRUCTION. WHEN REFERENCED IT IS MEANT TO BE TAKEN AS AN ACTION.

Run `flint shard start orbh` if you haven't already.

# Skill: Embody Wisp

Start a new session that acts as an active wisp: a sub-session of the wisp. Use it to give one more task to a wisp. A wisp runs no harness, so a sub-session is the only way it acts. The new session is a peer: nobody collects its result.

# Input

- The wisp: its id, a prefix, or its alias. It must be active.
- The target (`runtime/profile`) and a complete prompt
- (Optional) `--interactive` (the default is `--headless`), `--account <name>`, `--model <model>`, `--fleet <handle>`

# Actions

1. **Check the wisp.** Run `flint orbh wisp show <wisp>`. Its state must be `active`. To continue an ended wisp, use [[dev-sk-foh-spawn_wisp]] with `--successor <wisp>`.
2. **Embody.**

   ```bash
   flint orbh spawn session <target> "<prompt>" --as <wisp> [--interactive]
   ```

3. **Read the output.** It has `relation: child (rite embody)`, `parents: wisp <Wisp Name>`, the next command, and the line `wisp: <Wisp Name> (<id>) · <n> live sub-session(s)`. More than one live sub-session is permitted. When two sub-sessions can edit the same files, give each one its own files in its prompt.
4. **When it refuses,** read the reason. An ended wisp refuses: "A session embodies an active wisp only. To continue its work, spawn a successor". An unknown wisp refuses: `No wisp has the id or alias <ref>.` When the wisp ends after the plan, the join is refused before the first run: Orbh abandons the new session with no run, and the command exits 1. An exit 1 with a missing record (`SpawnRecordMissingError`) means that the store does not have the join: close the session with the command that the error gives.
5. **Check.**
   - `flint orbh kin <id>` shows `origin: embodies wisp <Wisp Name> (<id>)`. The kinship parent is the wisp, not your session.
   - `flint orbh peek <id>` shows `Kin: as wisp <Wisp Name> · embodies wisp <Wisp Name> · …`.
   - The title of the new session shows `<Initials> | <title>` (the initials of the wisp name). Its run has `ORBH_WISP_MEMORY_DIR`, and its Page has the `WISP` line with the memory folder.
   - Nobody collects its result. When it returns, read the result with `flint orbh result <id>`.

# Output

- A new session with `wispId` = the wisp (the event `wisp.joined` with `via: 'embody'` on the wisp spool). The sub-session joins before its first run, in the headless and in the interactive mode.
- Its origin: rite `embody`, relation `child`, parents [the wisp]. It has no `parentSessionId`.
- The parent side on the wisp (`kinChildren`)

See [[dev-knw-foh-kinship]] § Embody, and [[dev-knw-foh-identity]] § The Wisp.
