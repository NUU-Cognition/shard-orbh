# 0.4.0

Full end-to-end accuracy pass against the live CLI (Mission-007 style), audited independently until clean.

- **Delivery doctrine rewritten**: the session-lifetime persistent waiter was removed from the runtime (2026-08-02); docs now teach the real model — a run-scoped one-shot `page arm` pager during live turns, and the machine orchestrator sweeps (~15 s business interval, ~6 s settling grace, 15 s/60 s scheduled-wake retry net) for awaiting-session wake delivery. All waiter-attach/`waiter run`/debounce claims purged.
- **Workflow → procedure succession**: the removed per-session `workflow start/advance/check` surface is gone from the docs; `procedure` (deterministic step register, `--enforced` return-blocking) documented in its place, and the new cross-session `workflow` chaining verb documented accurately.
- **New knowledge file `knw-foh-machinery`**: stations, cron schedules, workers, procedures, workflow chaining, and the `update`/`approval`/`improve`/`humanchannel` reporting channels.
- **Profiles regenerated from live output**: Opus 5 family added, `agy`/`kimi` runtime sections added, `opencode` table corrected, `gemini` launchability caveat, `droid` note.
- **CLI reference expanded**: `return --await --wake-at/--until-group`, `wait --next`, full `request` flags, `auth remove`/`ccusage`/`default --clear`, `--orb-root`/`--create-store`, `scope`/`context`/`peek`/`timeline`, `list`/`active` cockpit + `--json`-default caveat, seven collector outcomes, `attach --steal` deprecation, orchestrator `processes`/`launcher`.
- `auth migrate` live-turn semantics confirmed against source (killed at a deliberate boundary; the binary help string is stale).
- Close template status enum fixed to real work states; skills de-waitered; `folders: Mesh/Agents` declared.

# 0.1.0

- Initial shard scaffold
