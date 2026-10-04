---
description: "Discard the current Orbh session — tombstone its history entry and terminate the harness (no Mesh summary)"
orbh-sessions:
  - "[[25f11f9b-67f7-46e6-ad6d-3089b3131066]]"
  - "[[0e5e27b5-779f-4068-941e-a93a7a39d3c8]]"
  - "[[1d490a0f-e91e-4f57-930e-350f5cbd0f18]]"
---

> [!important] THIS FILE IS AN INSTRUCTION. WHEN REFERENCED IT IS MEANT TO BE TAKEN AS AN ACTION.

# Skill: Orbh Discard

Discard the current orbh session **without** writing a Mesh summary. Use this when the session should disappear from Orbh history rather than be archived as a searchable agent record (the opposite choice from [[dev-sk-foh-close]], which leaves a record).

By default `flint orbh discard` records the tombstone, terminates the harness, and then closes the bound Obsidian terminal tab. The discard call kills the harness, so this skill's last action is `flint orbh discard` — nothing runs after it. (Pass `--no-leaf` to keep the tab open at a shell prompt. `--obsidian` is a deprecated alias of the default.)

# Input

- Human instruction to discard the current session.

# Actions

1. If useful, briefly tell the human you are discarding the session and that no summary record will be written.

2. **Discard the session.** This is an explicit terminal abandonment verdict: it appends an `orbh.session.discarded` tombstone, drops the entry out of `flint orbh list`, terminates the harness, and clears any pager state. It self-targets through `ORBH_SESSION_ID`; do nothing after.

   ```bash
   flint orbh discard
   ```

   > Works for both interactive and headless sessions. The default path records the tombstone, terminates the harness, and closes the bound Obsidian terminal tab. A session with no bound tab is discarded normally. Pass `--no-leaf` to keep the tab open at a shell prompt. There is no confirmation prompt.

# Output

- An `orbh.session.discarded` tombstone appended to the Orb control log (session hidden from `flint orbh list`).
- Harness terminated and any pager state cleared.
- The bound Obsidian terminal tab closed (with `--no-leaf`, the terminal returns to the shell).
