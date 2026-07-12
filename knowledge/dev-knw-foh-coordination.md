---
description: "Operating on other sessions — peers, collector-backed subagents, turn-correlated results, trees/caps, messages, rooms, interrupt, respond, and kill"
orbh-sessions:
  - "[[d1f03280-e10d-413f-a040-70c3a84feb66]]"
  - "[[5d693555-8632-4235-b536-d366018f3a65]]"
  - "[[1e7717cf-c6b0-4706-a149-ed479bd341cd]]"
  - "[[25f11f9b-67f7-46e6-ad6d-3089b3131066]]"
---

# Knowledge: Orbh Session Coordination

Use this reference to operate on other sessions. For delegation patterns and recursive managers, read [[dev-knw-foh-orchestrator]]; for targets, read [[dev-knw-foh-profiles]].

## Peers, Resume, and Interactive Sessions

Bare `launch` creates a **peer**: a headless standing actor with no collector, no parent edge, and the manager-flavored prompt. It defaults to awaiting while its duty remains live. Coordinate with it through messages or rooms.

```bash
flint orbh launch <runtime/profile> "<prompt>"
flint orbh launch <runtime/profile> "<prompt>" --title "<t>" --description "<d>"
flint orbh launch <runtime/profile> "<prompt>" --continues <id>
flint orbh resume <id> [prompt]
```

`launch` also accepts `--max-turns`, `--budget`, `--model`, `--account`, and `--force`. `--continues` links a new session; it does not continue the same session.

Interactive surfaces:

```bash
flint orbh i <target> [prompt]                 # alias: interactive; detachable is the TTY default
flint orbh i <target> -c <id>                  # continue a session interactively
flint orbh attach <id> [--steal]
flint orbh detach [id]
flint orbh continue                            # alias: c; interactive picker
```

## Listing and Inspection

```bash
flint orbh list [--all] [--stats] [--print] [--wide]
flint orbh list --status awaiting
flint orbh list --runtime codex --search "auth"
flint orbh list --subagents                    # flatten instead of default dispatch trees
flint orbh active                              # JSON inside an Orbh session; tree for humans
flint orbh inspect <id> [--results]
flint orbh stats <id> [--files]
flint orbh watch <id> [--verbose] [--stream]
flint orbh requests <id> [--pending]
```

`list` renders collected subagents as dispatch trees and gives `awaiting` its own section with awaiting duration, last-woken source, and dormancy warnings. Bare peers remain roots because they have no parent collector edge. Partial IDs are accepted on ID-taking commands.

## Collector-Backed Dispatch

`request` creates or continues a **subagent** and attaches a collector. In an agent shell use quiet mode and background execution:

```bash
flint orbh request -q <runtime/profile> "<complete prompt>"
flint orbh request -q -c <session-id> "<follow-up prompt>"
flint orbh wait <id1> [id2...] [--timeout <seconds>]
flint orbh result <id>
flint orbh result <id> --run <n>               # 1-based historical run
```

### What a Collector Waits For

A collector anchors to the run it initiated (or the current run when `wait` begins) and follows that turn's `continuesRunId` rescue chain. It waits for the first correlated result—not for `workState`, retention, a harness exit, or session terminality.

Consequences:

- A child can await/park, crash and be return-reprompted, or pass through intermediate runs without falsely resolving the collector.
- The collector outcome is exactly `result`, `failed-unreturned`, `abandoned`, or `pending`. A command timeout stops waiting but leaves the outcome pending.
- `result <id>` reads the latest returned turn; `--run <n>` addresses a specific 1-based run.
- `wait` prints labeled outcomes in argument order, regardless of completion order.
- `request -q -c` against an awaiting session starts a follow-up turn and waits for that turn's result; the dispatch itself wakes the session.

`-q` changes output formatting only; it does not change correlation. Without `-q`, `request` uses a human spinner/result box. `--stream` streams the transcript while collecting. Avoid collector timeouts for normal delegation; use harness-native background execution.

### Follow-ups and Result Streams

A session may return many results across its life. `return --await` emits the current turn's result and leaves the session available; the current collector receives that result. A later `request -q -c` creates a new correlated collection. This is the clean continuation loop: dispatch → receive one turn result → review → follow up.

## Recursive Dispatch, Caps, and Trees

Subagents may dispatch subagents. Orbh records ancestry as `{rootSessionId, depth}` and preserves immediate `parentSessionId` edges for tree rendering.

- `ORBH_DISPATCH_DEPTH_CAP=5` by default.
- `ORBH_DISPATCH_FANOUT_CAP=16` by default, measured from live collector stamps.
- Cap failures report the chain and requested depth/fan-out.

Use `request -q` for owned, collected work. Use bare `launch` only for a **peer** whose duty should outlive the caller or belongs to no one. A peer is not in the caller's dispatch tree; coordinate with it, do not treat it as a subagent.

## The Orchestrator Singleton

The per-machine orchestrator is infrastructure, distinct from a manager agent:

```bash
flint orbh orchestrator status [--json]
flint orbh orchestrator managers [--all] [--json]
flint orbh orchestrator managers --interactive
flint orbh orchestrator reap [--json]
flint orbh orchestrator ensure
flint orbh orchestrator stop
```

It supervises manager processes and acts as waiter janitor, retry net, un-returned-turn reaper, and designated survivor. See [[dev-knw-foh-orchestrator]].

## Inter-Session Messages

```bash
flint orbh message send <targetId> "<text>"
flint orbh message send <targetId> "<text>" --wake
flint orbh message send <targetId> "<text>" --revive
flint orbh message list <id>
```

Messages are durable Page-worthy events.

- A headless/subagent target in `awaiting` wakes on **any** message. `--wake` is unnecessary and produces an informative no-op notice.
- Interactive parked sessions retain the legacy `--wake` behavior.
- Working targets receive through a live attach when present; otherwise the persistent waiter HOLDs delivery until a later attach or turn boundary.
- `--revive` remains the explicit resurrection flag for ended sessions.

`message request` is the blocking peer-to-peer ask surface; run it in background execution:

```bash
flint orbh message request <targetId> "<question>" [--timeout <s>]
flint orbh message request --cancel <requestId>
flint orbh message respond <requestId> "<answer>"
```

## Rooms

```bash
flint orbh room create <name> [--topic "<t>"]
flint orbh room list
flint orbh room join <room> [--notify all|mentions|mute]
flint orbh room leave <room>
flint orbh room post <room> "<text>"
flint orbh room read <room> [--no-advance]
flint orbh room context show <room>
flint orbh room context append <room> "<text>"
flint orbh room context edit <room> --search "<old>" --replace "<new>"
```

Rooms outlive participants and carry a message stream plus revisioned context. Subscription policy controls whether room activity is Page-worthy: `all`, mentions only, or mute. A subscribed awaiting session wakes on qualifying room activity through the same waiter predicates. Own posts/edits do not wake the author.

## Interrupt, Respond, and Kill

```bash
flint orbh interrupt <targetId> "<text>"
flint orbh respond <id> "<text>"
flint orbh kill [id]
```

`interrupt` is explicit escalation for a working headless/subagent: record the message, terminate the live run, and resume with an interrupt digest. Against an awaiting target it behaves as a wake; against a terminal target it only queues unless explicitly revived by the appropriate surface. `respond` returns blocking `ask` input in place or resumes a deferred requester. `kill` terminates the run and records session abandonment, so a collector resolves as `abandoned`; kill/interrupt paths do not trigger un-returned re-prompts.
