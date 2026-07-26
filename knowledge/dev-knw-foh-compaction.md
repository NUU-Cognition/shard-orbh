---
description: "Self-compaction doctrine — the agent authors its own handoff into scratch, CONTEXT occupancy via the Page, the 80% threshold, compact handoff/finish, in-place relaunch under a stable session id"
orbh-sessions:
  - "[[411171be-587b-44fd-8c74-43f5700bb512]]"
  - "[[20c303b9-4b45-4e66-a13a-5e1a427f015a]]"
  - "[[b906e3ea-30d1-48f6-827a-89c5553e49c8]]"
---

# Knowledge: Self-Compaction at 80%

Compaction replaces the **context, not the identity**. The session is the durable endpoint, runs are its context windows, and the native harness is an interchangeable worker beneath a stable id. Compacting ends the current run (end reason `compacted`) and relaunches a **new run on the same session** with a fresh native context. The Orbh session id never changes: inbox, jobs, rooms, stations, waiter obligations, parent/child links, collector anchors, and every external reference stay valid by construction. Messages and job results that land during the relaunch window are durable in the same spool and surface to the fresh context through its page-first bootstrap.

**You write your own handoff.** There is no distiller. Nothing resurrects your dead context to reconstruct what you meant — you are alive and holding the whole thing at the moment you compact, so you write the successor note yourself, and the system validates it while you can still fix it.

## Occupancy: the Page CONTEXT line is the source of truth

Read occupancy from the **`CONTEXT` line of your Page** — `flint orbh page`, or any `page arm` delivery. It reports `used / max (pct%)` from the live transcript. Do not invent alternate token accounting. An armed pager autofires an advisory at ≥ 80%.

## The doctrine: two verbs

At **≥ 80% occupancy** (or clearly approaching it on a long turn):

1. **`flint orbh compact handoff`.** Prints the `COMPACTION_ARTIFACT_V1` contract, the exact absolute path to write your handoff to (inside your spool's `scratch/`), and your live Page so you write OPEN OBLIGATIONS from durable state rather than memory. It **records no intent, takes no claim, and kills nothing** — it is re-runnable and safe. Its one durable effect is to **hold the pager** (see below), which is also what makes the session visibly `[Compacting...]`.
2. **Write the handoff** to that exact path, with your own tools. No size limit, no shell quoting — it is a file.
3. **`flint orbh compact finish`.** Takes no arguments; the path is convention. It validates the handoff **while you are still alive**, then ends this context and relaunches the same session pointed at what you wrote. It is a **turn-ending verb**, a sibling of `return`. Do not plan work after it; there is no after.

Changed your mind between `handoff` and `finish`? **`flint orbh compact abort`** releases the hold. Ending the turn any other way (`return --finish` / `--await`) releases it automatically.

Every refusal — missing handoff, malformed handoff, a handoff belonging to another run, live subagent dispatches — is an **ordinary error while your context survives**. Fix it and retry. This is the whole point of authoring your own handoff: the feedback loop closes.

## Compaction is visible: `[Compacting...]`

From `compact handoff` until the relaunched context's run exists, every title surface prefixes the session with `[Compacting...]` — the pane title, `orbh list`, the cockpit, and Orbit. It is **derived, never stored**: the marker is the compaction pager hold read through `isSessionCompacting`, keyed to the run that took it, so a relaunch (new run id), an `abort`, a `return`, or a kill each end it as a consequence rather than through a cleanup step that could be missed. Nothing writes it into `session.title`, so a compaction that dies mid-flight cannot leave a polluted title behind.

One deliberate consequence: run `compact handoff` and then neither finish nor abort, and the marker stays. That is honest — a dangling hold is a real condition, and this is the first thing that makes it visible.

## The pager is HELD, not lost

`compact handoff` **holds** the pager and terminates any live arm, so nothing interrupts you between drafting the handoff and dying. Holding loses no events: the pager's wake baseline is the durable delivery cursor in `core:waiter-state`, which only advances when a page is actually rendered. Anything that lands while held is still pending, and the relaunched context resumes from that cursor the moment it arms. The Page shows `PAGER held for compaction` while the hold is in place.

(`held` is deliberately not called "parked" — `retention: 'parked'` and the legacy `park` spelling of `return --await` already mean other things.)

## Scratch: your durable working memory

`<orbRoot>/spaces/<space>/spools/<sessionId>/scratch/` is a reserved directory created with the spool. It is keyed to the **session id**, so its contents survive compaction by exactly the construction that keeps the inbox and jobs valid — nothing moves. The handoff lives there, and so can anything else a context wants its successor to inherit: drafts, notes, intermediate analysis. Nothing is cleaned automatically; the accumulation is traceability.

## Who executes

- **Headless/subagent:** `finish` records a moments-long durable intent (a crash-recovery token, not a queue) and spawns a detached executor — needed because the CLI dies with the harness. The executor kills the harness (run end reason `compacted` — a deliberate classification, never a crash, never reaped), takes up the handoff, and relaunches, as one synchronous pipeline. The persistent waiter and orchestrator sweep are crash backstops only.
- **Interactive:** the manager (the PTY wrapper) is the durable endpoint and owns the whole pipeline on a single control verb: it kills the harness child, shows "compacting…" in the pane, takes up the handoff, and starts the fresh child **in the same pane** — the human watches the succession live. Sockets, pane title, attach client, and `ORBH_SESSION_ID` all persist. A pane whose manager predates the verb refuses loudly (context survives); exit and `flint orbh resume <id>`.

There is **no operator-driven compaction**. `flint orbh session compact <id>` is gone: an operator in another terminal has no context to write a handoff from. Ask the session to compact itself.

## The relaunched context's duty

The relaunched run wakes with its **normal launch prompt, freshly composed** for its mode — a compacted session starts like any other session of its kind — followed by a compaction section naming the handoff path. Hard requirements: run `flint orbh page` first (this surfaces messages, job results, and notices that arrived during the relaunch window), then **read the handoff**, then **read every path in its FILES list directly before acting** — the SUMMARY is orientation, not ground truth. Preserve and execute every OPEN OBLIGATION, then resume the duty.

## Failure shape

A failed relaunch leaves the session recoverable with **the handoff already on disk** — it was written and validated before anything was killed, so there is no window in which a context has been destroyed and its replacement does not yet exist. Sessions compacted under the legacy succession model keep their `compacted-into` pointers readable; nothing creates them any more, and a session still carrying an in-flight succession checkpoint is refused rather than half-migrated. The durable `last` marker on the compaction slice records `completedAt`, the closed and relaunched run ids, and a running count.
