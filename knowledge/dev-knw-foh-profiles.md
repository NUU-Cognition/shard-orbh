---
description: "Profiles — pre-configured runtime targets: discovery, exact-name resolution, the live profile set per runtime, and guidance on which profile to pick for which kind of task"
orbh-sessions:
  - "[[d1f03280-e10d-413f-a040-70c3a84feb66]]"
  - "[[1e7717cf-c6b0-4706-a149-ed479bd341cd]]"
  - "[[25f11f9b-67f7-46e6-ad6d-3089b3131066]]"
---

# Knowledge: Orbh Profiles

Profiles are pre-configured runtime targets — a bundle of model + reasoning effort + harness args under a short code. A target is `runtime/profile`, e.g. `claude/o48mx` or `codex/solxh`. `request` and `job run --agent` create collected subagents; bare `launch` creates an uncollected peer; `i` creates an interactive session. All accept these targets.

## Resolution Rules

- Profile resolution is **exact** — there is no fuzzy matching; an unknown profile name **errors**.
- Profile names are **short codes**, not `runtime/tier` slugs. WRONG names like `claude/opus-max`, `codex/high`, `claude/sonnet`, `codex/medium` **do not resolve** and will error.
- A **bare runtime** (`flint orbh launch claude "<prompt>"`) uses that runtime's `default` profile if one exists, else no profile args.
- The set evolves as model families ship — **always confirm live** with `flint orbh profiles`.

```bash
flint orbh profiles                              # List all profiles, grouped by runtime
flint orbh profiles claude                       # Filter to one runtime
flint orbh launch claude/o48mx "<prompt>"        # Launch a peer with an explicit profile
flint orbh request -q codex/solxh "<prompt>"      # Dispatch a collected subagent
```

## The Live Profile Set (verify with `flint orbh profiles`)

As observed at HEAD. The code pattern is `<model-family><effort>`: e.g. `o48` = Opus 4.8, `f5` = Fable 5, `s5` = Sonnet 5, `sol`/`ter`/`lun` = GPT-5.6 Sol/Terra/Luna; effort suffixes are `m` (medium), `h` (high), `xh` (xhigh), `mx` (max), `l` (low), `u` (ultra — Sol/Terra), `uc` (ultracode — Claude Code multi-agent mode at xhigh).

### `claude`

| Code | Model | Effort | Notes |
|------|-------|--------|-------|
| `f5uc` / `f5mx` / `f5xh` / `f5h` / `f5m` / `f5l` | Fable 5 (`claude-fable-5`) | ultracode / max / xhigh / high / medium / low | Flagship Claude — highest capability |
| `o48uc` / `o48mx` / `o48xh` / `o48h` / `o48m` / `o48l` | Opus 4.8 (`claude-opus-4-8`) | ultracode / max / xhigh / high / medium / low | Strong agentic coding & enterprise work |
| `s5uc` / `s5mx` / `s5xh` / `s5h` / `s5m` / `s5l` | Sonnet 5 (`claude-sonnet-5`) | ultracode / max / xhigh / high / medium / low | Best speed/intelligence balance; everyday default |

### `codex`

| Code | Model | Effort | Notes |
|------|-------|--------|-------|
| `solu` / `solmx` / `solxh` / `solh` / `solm` / `soll` | GPT-5.6 Sol | ultra / max / xhigh / high / medium / low | Flagship — strongest coding/agent work |
| `teru` / `termx` / `terxh` / `terh` / `term` / `terl` | GPT-5.6 Terra | ultra / max / xhigh / high / medium / low | Balanced everyday workhorse (≈ old 5.5 class, lower cost) |
| `lunmx` / `lunxh` / `lunh` / `lunm` / `lunl` | GPT-5.6 Luna | max / xhigh / high / medium / low | Fast/affordable; no `ultra` (model does not support it) |

### `gemini`

| Code | Model | Notes |
|------|-------|-------|
| `pro` | Gemini 3.1 Pro | Complex reasoning and coding |
| `flash` | Gemini 3 Flash | Fast, lightweight tasks |

### `grok`

| Code | Model | Effort | Notes |
|------|-------|--------|-------|
| `g45h` | Grok 4.5 (`grok-4.5`) | high | Highest-effort Grok 4.5 profile in the shared layer |
| `g45m` | Grok 4.5 (`grok-4.5`) | medium | Balanced Grok 4.5 profile |
| `g45l` | Grok 4.5 (`grok-4.5`) | low | Lower-cost Grok 4.5 profile |
| `c25` | Grok Composer 2.5 Fast (`grok-composer-2.5-fast`) | — | Fast composition |

### `opencode`

| Code | Model |
|------|-------|
| `fireworks-kimi` | Kimi K2.5 Turbo (via Fireworks) |
| `fireworks-minimax` | Minimax 2.7 (via Fireworks) |

## Choosing a Profile

Pick by task, not by habit. Workspace guidance:

| Task Type | Suggested target | Why |
|-----------|------------------|-----|
| Implement code, refactor, write tests | `codex/solxh` (workspace default subagent; `codex/terxh` for cheaper balanced) | GPT-5.6 Sol / Terra at xhigh |
| Research, design, review, Mesh artifacts | `claude/o48mx` or `claude/f5mx` (or the `xh` variants) | Strongest Claude reasoning |
| Long standing multi-stage coding session | `claude/f5uc` / `claude/o48uc` / `claude/s5uc` | Ultracode: xhigh effort + standing dynamic-workflow orchestration |
| Everyday balanced Claude work | `claude/s5h` or `claude/s5xh` | Sonnet 5 — speed + intelligence |
| Fast / lightweight / cheap | `claude/s5l`, `claude/s5m`, `gemini/flash`, `codex/lunl` / `codex/soll` | Lower cost, quick turnaround |
| Very large context (whole-repo reads, long transcripts) | Fable / Opus / Sonnet 5 all ship 1M context | No special `[1m]` suffix needed on current models |
| Parallel batch throughput (wide fan-outs) | `codex/solm` / `codex/term` / `codex/lunm` / `claude/s5m` | Good throughput per dollar |
| Hardest single-task reasoning | `claude/f5mx`, `codex/solmx` or `codex/solu` | max depth, or ultra (Codex auto task delegation) |
| Second opinion / cross-model review | `gemini/pro`, `grok/g45h` | Different model family, different failure modes |

Rules of thumb:

- **Default subagent for code work is `codex/solxh`** — the standard delegation target in this workspace (see [[dev-knw-foh-orchestrator]]).
- **Claude tier pick:** Fable 5 for maximum capability, Opus 4.8 for serious agentic/enterprise work, Sonnet 5 for everyday speed/intelligence balance.
- **Codex tier pick:** Sol for hard open-ended work; Terra for everyday; Luna for clear high-volume tasks.
- **Effort is the main dial within a family.** Drop from `xh`/`mx` to `m` when the task is mechanical or you're fanning out wide; climb to `mx`/`u` only when the task genuinely needs maximum depth (or ultra's subagent delegation).
- When in doubt, run `flint orbh profiles` and read the descriptions — the shared layer is the source of truth, not this table.

## Maintaining the Shared Layer

`~/.nuucognition/orbh/default.json` is the synced canonical shared layer. `~/.nuucognition/orbh/profiles.json` is an optional local override layer; it is untouched by sync and wins for matching runtime/profile names.

```bash
flint orbh profiles update      # Replace local default.json from the canonical shared layer; preserve profiles.json
flint orbh profiles push        # Publish local default.json to the shared profiles repo (maintainers only)
```
