---
description: "Profiles — pre-configured runtime targets: discovery, exact-name resolution, the live profile set per runtime, and guidance on which profile to pick for which kind of task"
orbh-sessions:
  - "[[d1f03280-e10d-413f-a040-70c3a84feb66]]"
  - "[[1e7717cf-c6b0-4706-a149-ed479bd341cd]]"
  - "[[10efdd60-cf13-4cb2-b344-63803ba0b538]]"
  - "[[25f11f9b-67f7-46e6-ad6d-3089b3131066]]"
  - "[[1ac0e8bb-a7d6-47b6-983d-d40af40b06f8]]"
  - "[[65e535a9-3f77-404f-80b7-32bd43e9ca77]]"
  - "[[78241877-1d07-40de-882e-06a58eb86e19]]"
  - "[[3aa03722-903e-417a-aa51-1dc28bc6f162]]"
---

# Knowledge: Orbh Profiles

Profiles are pre-configured runtime targets — a bundle of model + reasoning effort + harness args under a short code. A target is `runtime/profile`, e.g. `claude/o5mx` or `codex/solxh`. `request` and `job run --agent` create collected subagents; bare `launch` creates an uncollected peer; `i` creates an interactive session. All accept these targets.

## Resolution Rules

- Profile resolution is **exact** — there is no fuzzy matching; an unknown profile name **errors**.
- Profile names are **short codes**, not `runtime/tier` slugs. WRONG names like `claude/opus-max`, `codex/high`, `claude/sonnet`, `codex/medium` **do not resolve** and will error.
- **No target** (`flint orbh i`, `flint orbh launch "<prompt>"`, `flint orbh request "<prompt>"`) selects the first available target of the **default target list** (see below).
- A **bare runtime** (`flint orbh launch claude "<prompt>"`) selects the first target of the default target list for that runtime (`claude` → `claude/o55h`). When the list has no target of that runtime, the session gets no profile args.
- The set evolves as model families ship — **always confirm live** with `flint orbh profiles`.

```bash
flint orbh profiles                              # List all profiles, grouped by runtime
flint orbh profiles claude                       # Filter to one runtime
flint orbh runtimes                              # Which runtimes are installed on this machine
flint orbh launch claude/o5mx "<prompt>"         # Launch a peer with an explicit profile
flint orbh request -q codex/solxh "<prompt>"      # Dispatch a collected subagent
```

## The Default Target List

A launch with no target takes the first **available** target of an ordered list. The shipped list is `claude/o55h`, then `codex/a6h`. A target is available when its runtime CLI is installed, its profile exists, the account of the launch exists and has no active limit marker, and its login is not known to be expired (only Claude has a local login check). The command prints `Target: <target> (default list)` and one `<target> skipped: <reason>` line for each target before it, on stderr. When no target is available, it refuses (exit 1) with the install or login command of the first target.

Three layers own the list. The highest layer with a list applies, and it replaces the lower list (no merge):

| Layer | Where | Write |
|-------|-------|-------|
| Flint | `[orbh] default = ["codex/a6h", "claude/o55h"]` in `flint.toml` | `flint orbh profiles default set --flint <target>...` / `unset --flint` |
| Machine | `defaultTargets` in `~/.nuucognition/orbh/settings.json` (`ORBH_SETTINGS_PATH` overrides the file) | `flint orbh profiles default set <target>...` / `unset`, or step 4 of `flint setup` |
| Shipped | `claude/o55h`, `codex/a6h` | — |

```bash
flint orbh profiles default [--json] [-p <dir>]          # The list, the layer of each entry, the state of each target, the selected target
flint orbh profiles default set codex/a6h claude/o55h    # The machine layer
flint orbh profiles default set --flint claude/o55h      # The Flint layer of this Flint
flint orbh profiles default unset [--flint]              # Remove a layer; the output names the list that applies then
```

Rules:

- **An explicit target never falls back.** When it is not available, the launch refuses before it makes a session: `The target <t> is not available: <reason>. An explicit target does not fall back.`
- **The account is checked.** The check uses the account of the launch: `--account`, else the account of a dispatcher of the same runtime, else the agent mind or the worker account, else the default account. An account never moves to another runtime.
- **Launch only (v1).** The selection happens once, when a session launches. A running or resumed session keeps its target; a limit in the middle of a turn does not switch it.
- `flint orbh agent`, `flint orbh worker`, the workflow `--target default` (the default), and the NUU Flint plugin (an empty profile) use the list too.
- Skip reasons and their next commands: `<cli> is not installed` → `npm install -g @anthropic-ai/claude-code` / `npm install -g @openai/codex`; `the profile <t> does not exist` → `flint orbh profiles <runtime>`; an unknown account → `flint orbh auth list <runtime>`; `the account <runtime>/<name> is limited until <time>` → `flint orbh auth usage <runtime>`; an expired Claude login → `claude auth login` (with `CLAUDE_CONFIG_DIR` of the account home for an account).

## The Machine Config

The machine config (schema `orbh-machine-config/1`) is the read model of the profiles, the accounts, and the default targets of one machine. `flint orbh machine-config --json` prints it, and `GET /orbh/machine-config` of the Flint server serves the same JSON. An app reads it to show the targets that this machine can start (for example the Generic Launcher, `@nuucognition/orbh-launcher`). It reads only local files and holds no path, email, token, usage number, or account home id.

| Field | What it holds |
|-------|---------------|
| `machine` | `name` and `displayName` (the NUU config), `platform`, `arch`, `flintVersion` |
| `runtimes` | Each runtime of a harness, and each runtime that has profiles but no harness: `runtime`, `label`, `available` (its CLI is found; never a path) |
| `profiles` | The effective profile set (`profiles.json` over `default.json`): `runtime`, `name`, `target`, and `title`, `description`, `model`, `effort`, `isDefault` when set |
| `accounts` | The accounts of each runtime with account homes: `runtime`, `name`, `isDefault` (the default of the machine), `manualOnly`. A deactivated account is left out |
| `defaultTargets` | The machine layer, else the shipped list (`layer`: `machine` or `shipped`; never the Flint layer), each target with `available`, and `selected`: the first available target, or null |
| `launcher.sessionProfiles` | The ordered allow-list of the launcher (`sessionProfiles` in `~/.nuucognition/orbh/settings.json`). Empty means all profiles |

`hash` is the sha256 of the canonical JSON of every field except `readAt` and `hash`. The same config gives the same hash. A change of a profile, an account, the default target list, or the allow-list changes it.

## The Live Profile Set (verify with `flint orbh profiles`)

As observed on 2026-09-16, regenerated from live `flint orbh profiles` after `flint orbh profiles update` reported the shared layer already up to date. The Opus 5.5 row was added on 2026-09-27. The code pattern is `<model-family><effort>`: `f51` = Fable 5.1, `f5` = Fable 5, `o55` = Opus 5.5, `o5` = Opus 5, `o48` = Opus 4.8, `s5` = Sonnet 5, `a6` = GPT-6 Astra, `sol`/`ter`/`lun` = GPT-5.6 Sol/Terra/Luna, `g46`/`g45` = Grok 4.6/4.5. Effort suffixes are `l` (low), `m` (medium), `h` (high), `xh` (xhigh), `mx` (max), `u` (ultra — Sol and Terra only), `uc` (ultracode — Claude Code multi-agent mode at xhigh).

Runtime availability on this machine (`flint orbh runtimes`, 2026-09-27): `claude`, `codex`, `cursor`, `grok`, `opencode` are installed. `agy`, `droid`, `kimi`, `muse` are registered names but are **not installed**. `agy`, `cursor`, `droid`, `kimi`, and `muse` have **no profiles** in the shared layer — do not target them with a profile.

### `claude`

| Code | Model | Effort | Notes |
|------|-------|--------|-------|
| `f51xh` / `f51h` | Fable 5.1 (`claude-fable-5-1`) | xhigh / high | Newest Claude — highest capability. Only these two efforts exist; there is no `f51m`, `f51mx`, or `f51uc` |
| `f5uc` / `f5mx` / `f5xh` / `f5h` / `f5m` / `f5l` | Fable 5 (`claude-fable-5`) | ultracode / max / xhigh / high / medium / low | Previous Fable generation; full effort ladder including ultracode |
| `o55uc` / `o55mx` / `o55xh` / `o55h` / `o55m` / `o55l` | Opus 5.5 (`claude-opus-5-5`) | ultracode / max / xhigh / high / medium / low | Newest Opus. `claude/o55h` is the first target of the shipped default target list |
| `o5uc` / `o5mx` / `o5xh` / `o5h` / `o5m` / `o5l` | Opus 5 (`claude-opus-5`) | ultracode / max / xhigh / high / medium / low | Previous-generation Opus. The workflow child target (`workflow after` / `after-procedure` `--target`) is now `default`: the default target list |
| `o48uc` / `o48mx` / `o48xh` / `o48h` / `o48m` / `o48l` | Opus 4.8 (`claude-opus-4-8`) | ultracode / max / xhigh / high / medium / low | Previous-generation Opus; strong agentic coding & enterprise work |
| `s5uc` / `s5mx` / `s5xh` / `s5h` / `s5m` / `s5l` | Sonnet 5 (`claude-sonnet-5`) | ultracode / max / xhigh / high / medium / low | Best speed/intelligence balance; everyday default |

The `*uc` profiles pass `--settings {"ultracode":true}` in addition to `--effort xhigh`.

### `codex`

| Code | Model | Effort | Notes |
|------|-------|--------|-------|
| `a6mx` / `a6xh` / `a6h` / `a6m` / `a6l` | GPT-6 Astra (`gpt-6-astra`) | max / xhigh / high / medium / low | Most capable Codex model; no `ultra` profile. `codex/a6h` is the fallback of the shipped default target list |
| `solu` / `solmx` / `solxh` / `solh` / `solm` / `soll` | GPT-5.6 Sol (`gpt-5.6-sol`) | ultra / max / xhigh / high / medium / low | GPT-5.6 flagship — strongest 5.6 coding/agent work |
| `teru` / `termx` / `terxh` / `terh` / `term` / `terl` | GPT-5.6 Terra (`gpt-5.6-terra`) | ultra / max / xhigh / high / medium / low | Balanced everyday workhorse, lower cost than Sol |
| `lunmx` / `lunxh` / `lunh` / `lunm` / `lunl` | GPT-5.6 Luna (`gpt-5.6-luna`) | max / xhigh / high / medium / low | Fast/affordable; no `ultra` (model does not support it) |

### `gemini`

> [!warning] Profiles exist, the runtime does not
> `gemini` profiles are still in the registry, but `gemini` is **not** a registered runtime — `flint orbh runtimes` lists `agy, claude, codex, cursor, droid, grok, kimi, muse, opencode` only, and `launch --help`'s target list omits it. There is no working path to Gemini models on this machine today (the `agy` runtime that used to carry them is not installed). Do not recommend `gemini/*`.

| Code | Model | Notes |
|------|-------|-------|
| `pro` | Gemini 3.1 Pro | Complex reasoning and coding |
| `flash` | Gemini 3 Flash | Fast, lightweight tasks |

### `grok`

| Code | Model | Effort | Notes |
|------|-------|--------|-------|
| `g46xh` / `g46h` / `g46m` / `g46l` | Grok 4.6 (`grok-4.6`) | xhigh / high / medium / low | Current Grok; `g46xh` is the highest-effort Grok profile |
| `g45h` / `g45m` / `g45l` | Grok 4.5 (`grok-4.5`) | high / medium / low | Previous generation |
| `c25` | Grok Composer 2.5 Fast (`grok-composer-2.5-fast`) | — | Fast composition |

### `opencode`

| Code | Model | Notes |
|------|-------|-------|
| `fireworks-kimi` | Kimi K2.5 Turbo | Routed through the Fireworks provider (`fireworks-ai/.../routers/kimi-k2p5-turbo`) |
| `fireworks-minimax` | Minimax 2.7 | Routed through the Fireworks provider (`fireworks-ai/.../models/minimax-m2p7`) |

These are the only non-Claude, non-OpenAI, non-Grok models reachable on this machine. The earlier `opencode/solxh`, `opencode/solh`, `opencode/k3`, and `opencode/dsfmx` profiles are gone from the shared layer.

### Runtimes without profiles

`agy` (Antigravity CLI), `kimi` (Kimi Code CLI), `droid`, `cursor` (Cursor Agent CLI, command `cursor-agent`), and `muse` (command `muse`) are registered runtime names — they appear in every target list — but the shared layer defines no profiles for them. `flint orbh runtimes` shows `cursor` installed and the other four unavailable on this machine. A bare `cursor` target launches with no profile args. Their former profile codes (`agy/f36h`, `agy/p31h`, `agy/o46t`, `kimi/k3`, `kimi/k3mx`, …) no longer resolve.

## Choosing a Profile

Pick by task, not by habit. Workspace guidance:

| Task Type | Suggested target | Why |
|-----------|------------------|-----|
| Implement code, refactor, write tests | `codex/solxh` (workspace default subagent; `codex/terxh` for cheaper balanced) | GPT-5.6 Sol / Terra at xhigh |
| Research, design, review, Mesh artifacts | `claude/f51xh` (or `claude/o5mx` / `claude/f5mx`) | Strongest Claude reasoning; Fable 5.1 tops out at xhigh |
| Long standing multi-stage coding session | `claude/f5uc` / `claude/o5uc` / `claude/s5uc` | Ultracode: xhigh effort + standing dynamic-workflow orchestration (no Fable 5.1 ultracode yet) |
| Everyday balanced Claude work | `claude/s5h` or `claude/s5xh` | Sonnet 5 — speed + intelligence |
| Fast / lightweight / cheap | `claude/s5l`, `claude/s5m`, `codex/lunl` / `codex/soll` | Lower cost, quick turnaround |
| Very large context (whole-repo reads, long transcripts) | Fable / Opus / Sonnet 5 all ship 1M context | No special `[1m]` suffix needed on current models |
| Parallel batch throughput (wide fan-outs) | `codex/solm` / `codex/term` / `codex/lunm` / `claude/s5m` | Good throughput per dollar |
| Hardest single-task reasoning | `codex/a6mx` / `codex/a6xh`, `claude/f51xh`, `codex/solu` | GPT-6 Astra or Fable 5.1 at max depth, or Sol ultra (Codex auto task delegation) |
| Second opinion / cross-model review | `grok/g46xh` / `grok/g46h`, `opencode/fireworks-kimi`, `opencode/fireworks-minimax` | Different model family, different failure modes (prefer these over `gemini/*` — see the runtime caveat above) |

Rules of thumb:

- **Default subagent for code work is `codex/solxh`** — the standard delegation target in this workspace (see [[dev-knw-foh-orchestrator]]).
- **Claude tier pick:** Fable 5.1 is the newest and most capable, but ships only `h` and `xh`. Use Fable 5 or Opus 5 when you need `mx` or `uc`. Opus 4.8 remains available as the previous generation. Sonnet 5 for everyday speed/intelligence balance.
- **Codex tier pick:** Astra (GPT-6) for the hardest work; Sol for hard open-ended 5.6-class work; Terra for everyday; Luna for clear high-volume tasks. Only Sol and Terra have `ultra`.
- **Effort is the main dial within a family.** Drop from `xh`/`mx` to `m` when the task is mechanical or you're fanning out wide; climb to `mx`/`u` only when the task genuinely needs maximum depth (or ultra's subagent delegation).
- When in doubt, run `flint orbh profiles` and read the descriptions — the live listing is the source of truth, not this table.

## Managed Claude Settings (`flint orbh claude doctor | config`)

Launch profiles pick the model and effort for one session. A second, durable layer asserts a small set of `settings.json` keys on **every Claude config home** Orbh knows about: the user's `~/.claude` plus every account home from `flint orbh auth list`. This is the Claude slice of [[(Spec) Orbh Harness Configuration Management]].

Built-in policy:

| Key | Value | Since | Why |
|-----|-------|-------|-----|
| `autoMemoryEnabled` | `false` | — | Orbh sessions must not accumulate Claude auto-memory across workspaces and accounts |
| `bashEditDiffEnabled` | `false` | 2.1.271 | Bash edit diffs append unrelated file diffs to every Bash tool result |

```bash
flint orbh claude doctor [--json] [--wide]                 # installed version + one row per home, one state per key
flint orbh claude config diff [--json]                     # same inspection; exits 1 on any drift
flint orbh claude config apply [--dry-run] [--json]        # write the keys into every home
flint orbh claude config apply --account <name>            # one account only ("user" = ~/.claude)
flint orbh claude config apply --home <path>               # one arbitrary config directory
flint orbh claude config update [--dry-run] [--json]       # bring every home up to date by force, then show doctor
```

`config update` is the one-shot verb: it force-applies to every home (refreshes each home's provenance even when no key changed, and replaces an unreadable `settings.json` after moving it aside as `settings.json.orbh-broken.<timestamp>`), then prints the doctor table and exits 1 if any home is still not in sync. `--no-force` limits it to homes that drift. `config apply --force` gives the same force behaviour for one account or path.

Key states are a **content comparison** between the policy and the file on disk, never a timestamp: `in-sync`, `drifted` (present, different value), `unmanaged` (absent), `inert` (binary older than `since`), `unreadable` (settings.json is not valid JSON). A hand edit to any home shows as `drifted` on the next `diff` or `doctor`. `apply` rewrites only the managed keys, atomically, and leaves every other key alone. It also writes `<home>/orbh-managed.json` with the apply time, Claude version, keys, and a content hash — provenance for the APPLIED column, not the source of truth.

**Launch injection.** Independently of `apply`, every Orbh launch, resume, and interactive spawn of Claude folds the managed keys into the `--settings` argument, merged with any profile-supplied settings JSON (for example the ultracode profiles' `{"ultracode":true}`) into one flag. CLI flags outrank every settings file, so an un-applied or hand-edited home cannot turn the keys back on for an Orbh session. Set `ORBH_CLAUDE_MANAGED_SETTINGS=0` in the environment to skip injection.

**Extending the policy.** Create `~/.nuucognition/orbh/policies/claude.json`:

```json
{ "settings": { "cleanupPeriodDays": 30, "bashEditDiffEnabled": null }, "since": { "cleanupPeriodDays": "2.0.0" } }
```

`settings` adds or overrides keys; `null` removes a built-in key from management. `since` marks the first Claude version that honours a key. The file is merged over the built-in policy at every read.

## Changing the Profile of an Existing Session

Which verb you want depends on **one question: same runtime, or different?**

```bash
# SAME runtime — keeps the conversation
flint orbh profiles switch <runtime/profile>

# DIFFERENT runtime — discards the native context, carries your handoff
flint orbh compact start
flint orbh compact handoff --into <runtime/profile> [--account <name>]
```

### `profiles switch` — same runtime, conversation preserved

A self-target verb, the sibling of `auth migrate` (which also takes `--session <id>` for another session; `profiles switch` does not). It closes the run at a turn boundary, commits the new profile (and the model that profile pins), and **resumes the same native session id** under the new model/effort. Nothing on disk moves; the account home is unchanged.

- **Interactive**: the pane swaps its child in place and you keep talking.
- **Headless / subagent**: nothing is respawned — the stored profile is reapplied at every spawn, so the switch lands at the session's next wake. A live turn is **killed** at a deliberate boundary (`endReason: profile-switched`) rather than refused: a running child's argv is already fixed, so leaving it alive would record a profile it is not using.
- **Cross-runtime is refused**, with the compaction commands printed. A conversation cannot cross runtimes; that is not a limitation of the verb but of what a native transcript is.
- A bare runtime is refused — the target must be an explicit `runtime/profile` registry key.

The run it ends is stamped `endReason: 'profile-switched'` — a deliberate boundary like `compacted`, `switched`, and `migrated`, so it never mints a liveness notice or enters the un-returned reaper.

### `compact handoff --into` — different runtime

Still the right verb when the runtime itself must change, and the only one that can. Full doctrine in [[dev-knw-foh-compaction]]. It also accepts `--account`, so a cross-runtime move can pick the destination account in the same step.

### Orb agents

```bash
flint orbh agent profile <name> <runtime/profile>   # declaration + live body
```

Writes `target:` in the agent's mind **and** switches the live body when the target is same-runtime. The declaration is what the agent's *next* body uses; the switch is what the *current* one does. The output always says which parts landed, because they can legitimately diverge — a cross-runtime target reaches only the next body. `--mind-only` writes the declaration alone.

### Accounts are the neighbouring case

`flint orbh auth migrate <account>` moves a session to another account of the same runtime, also preserving the conversation — see [[dev-knw-foh-cli]].

## Maintaining the Shared Layer

`~/.nuucognition/orbh/default.json` is the synced canonical shared layer, pulled from `https://github.com/NUU-Cognition/orbh-profiles.git`. `~/.nuucognition/orbh/profiles.json` is an optional local override layer; it is untouched by sync and wins for matching runtime/profile names. Never add personal profiles to `default.json` — `profiles update` overwrites it.

The header line of `flint orbh profiles` names the override path (`profiles.json`) even when that file does not exist. On this machine there is **no** `profiles.json`, so the effective set **is** the shared `default.json`. A machine with an override will show a different set; the live listing on that machine, not any table (including the one above), is the source of truth.

```bash
flint orbh profiles update      # Replace local default.json from the canonical shared layer; preserve profiles.json
flint orbh profiles push        # Publish local default.json to the shared profiles repo (maintainers only)
```
