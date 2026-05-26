---
description: "Write a session summary to Mesh/Agents/ and close the Obsidian terminal tab"
---

> [!important] THIS FILE IS AN INSTRUCTION. WHEN REFERENCED IT IS MEANT TO BE TAKEN AS AN ACTION.

# Skill: Orbh Close

Wrap up the current orbh session: write a per-session summary markdown file to the Mesh, then close the Obsidian terminal tab. The close call kills the harness, so this skill's last action is `flint orbh close <id>` — nothing runs after it.

# Input

- Your own working memory of what this session did.

# Actions

1. Immediately change the session title to "[Closing] (current title)"

2. **Resolve the machine name.** Default to the device's friendly name; fall back to hostname.

   ```bash
   MACHINE=$(scutil --get ComputerName 2>/dev/null || hostnamectl --static 2>/dev/null || hostname)
   ```

3. **Inspect the session for metadata.** Capture title, status, prompt, started, run history.

   ```bash
   flint orbh inspect <session-id>
   ```

4. **Determine the runtime folder.** Use the runtime's display name as the subfolder of `Mesh/Agents/` — e.g. `Mesh/Agents/Claude Code/`, `Mesh/Agents/Codex/`. Create the folder if it does not exist.

5. **Write the summary file** at `Mesh/Agents/<Runtime>/<session-id>.md`. Use [[dev-tmp-foh-close-v0.1]] for the structure. The machine field is required and must be the value resolved in step 1.

6. **Close the tab.** This kills the harness — do nothing after. (`flint orbh close` flips the `[Closing]` title prefix to `[Closed]`, advances the session to `finished`, then tears down the PTY.)

   ```bash
   flint orbh close <session-id>
   ```

# Output

- `Mesh/Agents/<Runtime>/<session-id>.md` — searchable, machine-attributed session record.
- Session result stored on the current run.
- Obsidian terminal tab closed; harness terminates.