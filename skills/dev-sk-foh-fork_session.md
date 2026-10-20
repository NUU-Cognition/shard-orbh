---
description: "Fork a session (one fork or a parallel fork) to try a side path while the source continues, and check the fork origin and its spawn group"
orb:
  - "@v1/nuucognition/session/df2c23ae-f402-4485-b1a3-bf5005470d4e#flint/nuu-orbh"
orbh-fleet: kinship-1020
---

> [!important] THIS FILE IS AN INSTRUCTION. WHEN REFERENCED IT IS MEANT TO BE TAKEN AS AN ACTION.

Run `flint shard start orbh` if you haven't already.

# Skill: Fork Session

Make a new session with a copy of the context of a session. The source continues, and its obligations stay with it. Use it to try a side path. Use `--parallel <n>` to start up to 8 sessions with the same context, each with its own prompt.

# Input

- (Optional) The target and a prompt
- (Optional) `--session <id>`: the source (the default is this session)
- (Optional) `--compact`: a distilled seed in place of the full transcript
- (Optional) `--parallel <n>` with `--prompt-file <file>` and `--fleet <handle>`

# Actions

1. **Choose one fork or a parallel fork.** With `--parallel`, give `--fleet <handle>`, so that the forks can see each other. The fleet must be open.
2. **Fork.**

   ```bash
   flint orbh fork [<target>] ["<prompt>"] [--session <id>] [--compact]
   flint orbh fork --parallel <n> [--prompt-file <file>]… [--fleet <handle>] ["<prompt>"]
   ```

3. **Read the output.** Each fork is a detached interactive session, and the next command is `flint orbh attach <id>`. When the source is in an active wisp, the fork joins it. When it does not join, the output says why.
4. **When `fork --compact` refuses with `seed-failed`,** no fork exists. Run the same fork without `--compact`.
5. **Check.** `flint orbh kin <id>` shows `origin: forked from session <source> (<title>)`, and the `KIN` line of the fork shows `forked from <source>`. The forks of one `--parallel` share one spawn group, so `kin` shows them as siblings.
6. **Later**, the source can take the work of a fork back with [[dev-wkfl-foh-consume_sessions]].

# Output

- Each fork: the origin `fork`/`child` with parents [the source], and one `group` for all forks of one `--parallel`
- The old record `forkedFrom` on each fork, and the parent side (`kinChildren`) on the source
- No obligation moves

See [[dev-knw-foh-kinship]] § Fork, and [[dev-knw-foh-identity]] § Fork and Parallel Fork.
