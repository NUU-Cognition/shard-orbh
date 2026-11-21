# 0.9.0

- **The Orbh kernel** (NUU Orbh Task 763, fleet `orbh-kernel-763`). New knowledge `knw-foh-kernel`: one persistent Python kernel for each session (`flint orbh kernel`). It gives the model, the code of a cell, each verb, each end form of `exec` with its exit code, what `interrupt` can stop, Esc in Claude Code and Codex, the `KERNEL RESULT` message, an end that comes two times, names and snapshots, what the kernel can lose, the `KERNEL` line, the `[kernel-state]` notice, the lifecycle, and the rules of use.
- **The section The Kernel of `init-foh`.** It names the signs at which the next command is a kernel cell, and the rules of a cell. The new part Patterns gives the first cell of small helpers, the read of a large file or diff, the wait for a condition, a long build with `exec --detach`, and the steps after a restore.
- **Page, compaction, and CLI.** `knw-foh-page` describes the `KERNEL` line with the names that a snapshot did not save. `knw-foh-compaction` describes the kernel at compaction and resume. `knw-foh-cli` lists the kernel verbs.
- Requires a Flint CLI with `flint orbh kernel` (Task 763; flint `89e4564ae` or later).

# 0.8.0

- **NUU Artifacts** (fleet storage-1112, lane SHD). The new skill `sk-foh-publish_artifact`: publish an HTML file as a NUU Artifact (`flint orbh artifacts publish <file.html>`, `--update <address>` for a new version), pin its URL, keep it as an object of the session, and record the address and the URL. `knw-foh-cli` has the section NUU Artifacts: the address `@v1/<org>/artifact/<id>#artifacts`, the URI, the web URL, the six verbs (`publish`, `list`, `get`, `open`, `versions`, `delete`), access, the object tools (`read_source`, `publish_version`, `rename_artifact`, `publish_artifact`), the sandbox, and the errors. `init-foh` gives the pin rule for an HTML page and the skill in the map. Requires a Flint CLI with `flint orbh artifacts` (lane ART of storage-1112) and the deployed app NUU Artifacts.
- **A page that sends a response** (NUU Operations Task 485, the artifact bridge). `sk-foh-publish_artifact` has the part "A Page That Sends a Response": `flint orbh artifacts publish --respond me|org` lets the page of a NUU Artifact send a response of its viewer (the viewer confirms it, and the server writes the person of the sign-in), the page code, the subscribe of the session (a response sends a message of `orbh:objects`), and the read with `flint orbh artifacts responses`. `knw-foh-cli` names `--respond`, `--tools`, the verb `responses`, and the tool `read_responses`. Requires a Flint CLI with `flint orbh artifacts responses` (flint `1b41990a2` or later) and the NUU Artifacts deploy of Task 485.
- **The task pin is removed; objects replace it** (NUU Flint Task 1323). `flint orbh task pin|unpin|show|sync`, the keys `core:task` and `core:task-info`, the Page line `TASK`, the menu row "Pinned task", and the Ops attach of the session are gone from the Flint CLI. A session keeps an Ops task as an object: `flint orbh objects add <task address> --subscribe`, and `take` or `chair` only for a change that must not collide. `flint helper pins add` refuses an Ops task (pins are files and links); a stored task pin of an earlier build reads as a link.
- **The commit-trailer hook, body v3.** It adds only `Orbh-Fleet` and `Orbh-Session`, and reads no key of the session. Run `flint shard orbh commit-trailers install --repo <repo>` in each repository that has body v2.
- **Docs.** `knw-foh-cli` has the section Objects in place of The Task Pin, `knw-foh-page` has The OBJECTS Block in place of The TASK Line, `knw-foh-fleets` describes hook v3, and `init-foh` says that an Ops task is an object, not a pin.
- Requires a Flint CLI with Task 1323 (no `flint orbh task`).

# 0.7.3

- **The purpose and the proper name of a wisp** (revision R30 of NUU Orbh Mission 027). `knw-foh-identity`: the `mission` of a wisp is now its `purpose` (`flint orbh wisp gain --purpose "<text>"`; `--mission` stays as a hidden alias for one release, and an old `mission` reads as the purpose). The new verb `flint orbh wisp purpose "<text>"` sets the purpose of an active wisp later. A person sees the alias as a proper name ("Rural Amazed Moonbeam"); the stored alias and each address keep the lowercase form. No Roman numeral is added to an alias.
- **The production-day recipe** (fleet `nuu-day-1011`, Report 114) is now in `knw-foh-fleets` under "Fleet Recipes". Before, it was only a local edit of one installed build.
- Requires a Flint CLI with R30 (flint `429d52120` or later) for `--purpose` and `flint orbh wisp purpose`.

# 0.7.2

- **Agent identity and session mechanics** (NUU Orbh Mission 027, fleet `agent-identity-1019`). New knowledge `knw-foh-identity`: the tiers (session, wisp, orb, comet, star); the mechanics (dispatch, fork, parallel fork, birth, consume, compact); the rule "context copies, obligations move"; the wisp verbs and the alias rule (word lists version 4); `flint orbh consume` and `flint orbh consume handoff`; `flint orbh birth` and `flint orbh fork --parallel`; and the lineage route.
- **The field `orb:`**: `knw-foh-fleets` names `orb:` (a list of v1 session addresses) beside `orbh-fleet`. New writes go to `orb:`. Old notes keep `orbh-sessions`, and each reader reads both fields. The fleet doctrine also has the shared-file rule: add an export line only in the same commit as its files, and build the package of a new export before a loaded module imports it.
- `init-foh` and `knw-foh-cli` list the new knowledge file.
- Requires a Flint CLI with Mission 027 (flint `9314abc` or later) for `flint address me` and the new verbs.

# 0.7.1

- **The commit-trailer hook, body v2, fix round 2** (NUU Flint Task 1287): a rejected `ORBH_CWD` falls back to the working folder, and a relative `NUU_HOME` or `ORBH_HOME` becomes absolute. The hook still never stops a commit.
- **No version pin on the Flint shard** (NUU Orbh Task 748): the dependency on `NUU-Cognition/shard-flint` has no `version` line, so the shard installs with each Flint shard version.

# 0.7.0

- **Readiness, continuation, and modes, the session side** (NUU Orbh Task 748). The Page shows the `toward:` line of an open frame, and a child command names `--mode` only when the mode of the frame differs from the session (the Page gets the session mode). `session.mode` in a behaviour `when` is the recorded mode of the frame. `continue-open` counts an awaiting session as live. A child session uses no `--headless` and no `flint shard hstart`: both are removed and refuse with the next command. Links go to `knw-f-invocations` for the details.
- **The commit-trailer hook, body v2** (NUU Flint Task 1287). The hook also adds a `Task: <address>` trailer from the task pin of the session (`core:task`). With no `ORBH_CWD`, it finds the Flint of the session through the manager row of `ORBH_SESSION_ID`. The read waits at most about 2.5 s; at the limit it adds no Task trailer and still exits 0, so it never stops a commit. A release does not install the hook: run `flint shard orbh commit-trailers install --repo <repo>` in each repository. New knowledge: The Task Pin (`knw-foh-cli`) and The TASK Line (`knw-foh-page`).
- **Profiles** (NUU Orbh Task 746): `knw-foh-profiles` describes the default and small-default profiles, the small-default fallback of the auth refresh ping, the parallel refresh, and how a bare runtime resolves in the launch verbs and in ping.

# 0.6.0

- **Shard invocations, the session side** (NUU Orbh Tasks 743 and 744). Orbh does not know shards; the Flint layer adds invocations through seams, and the docs say so. Links go to `knw-f-invocations` (the use side) and `knw-knap-invocations` (the authoring side) for the details.
- **CLI**: `flint orbh close` and `flint orbh session return` accept `--with <id>[=<value>]` and `--no-behaviours`. An unknown name refuses and lists the valid names; a `before` behaviour can refuse the verb; a refused return stores nothing. An agent passes a `by: person` behaviour only when the person asks for it in the current message. After `close` and `return --finish`, the open frames of the session close.
- **Page**: the block `flint/invocations` (`INVOCATIONS`): the stack, the current step, `read:`, `next:`, and the `--with` names. Managed delivery sends a Page on a wake, at the 80% advisory, and one time after each compaction of the harness, never while the pager is held.
- **Compaction**: the invocations stay with the session. The Page of `compact start` has no INVOCATIONS block, so the handoff names the open frames from `flint shard invocations stack`. After either kind of compaction, the agent continues from `read:` and `next:`.
- **Coordination**: a child session of a session with an open frame gets `FLINT_PARENT_INVOCATION` and a durable launch record, so its first `flint shard invoke` nests, also after a resume. A bare peer `launch` gets no parent.
- **Procedures**: a shard workflow opens no Orbh procedure; its steps are in the invocation record (`flint shard step`). `enforced: true` of an invocation file refuses `session return --finish` while a step is open; `--no-behaviours` passes it.

# 0.5.0

- **Fleets**: new knowledge `knw-foh-fleets` — the fleet verbs, when to declare a fleet, the charter, the `orbh-fleet` Mesh field, the commit trailers, accounts and load before each wave, the fan-out cap, and many builders on one checkout. The orchestrator knowledge says never to discard the output of `flint orbh request -q`. NUU Orbh Task 717.
- **Delivery**: headless Codex has managed delivery through the Orbh Codex host (Task 702). An agent job follows its child through a usage limit and a dead wrapper; an `--until-group` await wakes one time at group completion (Task 721).
- **Accounts**: `flint orbh auth deactivate | reactivate` and `auth list --all` (Task 700); the account usage monitor and the autoswitch with its migration claim (NUU Flint Task 1114); `flint orbh auth migrate <account> --session <id>` for another session (Task 699).
- **Machinery**: the station `dm` and the managed cron schedules now come from Flint module packages; the managed marker names the module record and stores the owner machine; a local schedule stays local (NUU Flint Tasks 1110 and 1125).
- **Init**: every session pins the Flint files of its work with `flint helper pins add` (Task 695). The docs call `flint orbh`, never the bare `orbh` binary (NUU Flint Task 1107). The default target list and the profiles of Opus 5.5, `cursor`, and `muse` in `knw-foh-profiles`.

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
