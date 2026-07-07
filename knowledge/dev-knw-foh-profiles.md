---
description: "Profiles — pre-configured runtime targets: discovery, exact-name resolution, the live profile set per runtime, and guidance on which profile to pick for which kind of task"
orbh-sessions:
  - "[[d1f03280-e10d-413f-a040-70c3a84feb66]]"
---

# Knowledge: Orbh Profiles

Profiles are pre-configured runtime targets — a bundle of model + reasoning effort + harness args under a short code. A launch/dispatch target is `runtime/profile`, e.g. `claude/o48mx` or `codex/55xh`. Every `launch`, `request`, `i`, and `job run --agent` call takes one.

## Resolution Rules

- Profile resolution is **exact** — there is no fuzzy matching; an unknown profile name **errors**.
- Profile names are **short codes**, not `runtime/tier` slugs. WRONG names like `claude/opus-max`, `codex/high`, `claude/sonnet`, `codex/medium` **do not resolve** and will error.
- A **bare runtime** (`flint orbh launch claude "<prompt>"`) uses that runtime's `default` profile if one exists, else no profile args.
- The set evolves as model families ship — **always confirm live** with `flint orbh profiles`.

```bash
flint orbh profiles                              # List all profiles, grouped by runtime
flint orbh profiles claude                       # Filter to one runtime
flint orbh launch claude/o48mx "<prompt>"        # Launch with an explicit profile
flint orbh request -q codex/55xh "<prompt>"      # Dispatch with an explicit profile
```

## The Live Profile Set (verify with `flint orbh profiles`)

As observed at HEAD. The code pattern is `<model-family><effort>`: e.g. `o48` = Opus 4.8, `f5` = Fable 5, `54`/`55` = GPT-5.4/5.5; effort suffixes are `m` (medium), `h` (high), `xh` (xhigh), `mx` (max), `l` (low), `uc` (ultracode), `1m` (1M context variant).

### `claude`

| Code | Model | Effort | Notes |
|------|-------|--------|-------|
| `f5mx` / `f5xh` / `f5h` / `f5m` | Fable 5 | max / xhigh / high / medium | Newest, most capable Claude family |
| `f5uc` | Fable 5 | xhigh | Ultracode mode — standing dynamic-workflow orchestration |
| `o48mx` / `o48xh` / `o48h` / `o48m` | Opus 4.8 | max / xhigh / high / medium | Strong general reasoning |
| `o48uc` | Opus 4.8 | xhigh | Ultracode mode |
| `s461m` | Sonnet (1M context) | high | Balanced everyday profile, huge context |
| `o46*` / `o47*` (incl. `*1m` variants) | Opus 4.6 / 4.7 | various | Older families — avoid unless matching prior runs |

### `codex`

| Code | Model | Effort |
|------|-------|--------|
| `55xh` / `55h` / `55m` / `55l` | GPT-5.5 | xhigh / high / medium / low |
| `54xh` / `54h` / `54m` | GPT-5.4 | xhigh / high / medium |

### `gemini`

| Code | Model | Notes |
|------|-------|-------|
| `pro` | Gemini 3.1 Pro | Complex reasoning and coding |
| `flash` | Gemini 3 Flash | Fast, lightweight tasks |

### `grok`

| Code | Model | Notes |
|------|-------|-------|
| `build-max` / `build-xh` / `build-h` / `build-m` | Grok Build | max / xhigh / high / medium effort |
| `c25` | Grok Composer 2.5 Fast | Fast composition |

### `opencode`

| Code | Model |
|------|-------|
| `fireworks-kimi` | Kimi K2.5 Turbo (via Fireworks) |
| `fireworks-minimax` | Minimax 2.7 (via Fireworks) |

## Choosing a Profile

Pick by task, not by habit. Workspace guidance:

| Task Type | Suggested target | Why |
|-----------|------------------|-----|
| Implement code, refactor, write tests | `codex/55xh` (workspace default subagent; `codex/54xh` also solid) | Optimized for code edits |
| Research, design, review, Mesh artifacts | `claude/o48mx` or `claude/f5mx` (or the `xh` variants) | Strongest reasoning |
| Long standing multi-stage coding session | `claude/f5uc` / `claude/o48uc` | Ultracode: xhigh effort + standing dynamic-workflow orchestration |
| Fast / lightweight / cheap | `claude/s461m`, `gemini/flash`, `codex/55l` | Lower cost, quick turnaround |
| Very large context (whole-repo reads, long transcripts) | `claude/s461m` (1M context) | Context headroom over raw capability |
| Parallel batch throughput (wide fan-outs) | `codex/55m` / `codex/54m` | Good throughput per dollar |
| Second opinion / cross-model review | `gemini/pro`, `grok/build-xh` | Different model family, different failure modes |

Rules of thumb:

- **Default subagent for code work is `codex/55xh`** — the standard delegation target in this workspace (see [[dev-knw-foh-orchestrator]]).
- **Effort is the main dial within a family.** Drop from `xh`/`mx` to `m` when the task is mechanical or you're fanning out wide; climb to `mx` only when the task genuinely needs the strongest reasoning.
- **Don't dispatch older families** (`o46*`, `o47*`) for new work — they exist for continuity with prior runs.
- When in doubt, run `flint orbh profiles` and read the descriptions — the shared layer is the source of truth, not this table.

## Maintaining the Shared Layer

Profiles live in `~/.nuucognition/orbh/profiles.json`, synced as a shared `default.json` layer:

```bash
flint orbh profiles update      # Pull the latest shared layer
flint orbh profiles push        # Publish it (maintainers only)
```
