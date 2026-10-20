---
description: "Consume sessions or a wisp into this session: choose and check the sources, run the consume, read and check each handoff, take each moved obligation, and record the result with the mark of each source"
orb:
  - "@v1/nuucognition/session/df2c23ae-f402-4485-b1a3-bf5005470d4e#flint/nuu-orbh"
orbh-fleet: kinship-1020
---

> [!important] THIS FILE IS AN INSTRUCTION. WHEN REFERENCED IT IS MEANT TO BE TAKEN AS AN ACTION.

Run `flint shard start orbh` if you haven't already.

# Workflow: Consume Sessions

This session (the consumer) continues the work of N sessions in one session. Each source writes a handoff, its obligations move to the consumer, and it ends with the reason `consumed`. Use it when the sources have open work or a live state. The full mechanics are in [[dev-knw-foh-identity]] § Consume. The records are in [[dev-knw-foh-kinship]] § Consume.

> [!headless]
> In a headless or subagent Orbh session, no person is at the terminal. Do each stage, and follow the `> [!headless]` callout in it.
> - Report progress with `flint orbh session set phase <phase>`.
> - A subagent consumes only the sources that the prompt of its dispatcher names. It never resolves a conflict alone: it returns each conflict to its dispatcher.

# Input

- The sources: session ids (full or partial), or a wisp (its id or its alias)
- (Optional) `--wait-task`: a working source finishes its whole task before its handoff
- (Optional) `--timeout <minutes>`: the longest wait for one handoff turn

# Actions

## Stage 1: Choose the Sources

- **Check that consume is the right rite.** A source with no open obligation and finished work: use [[dev-sk-foh-birth_session]]. A side path while the source continues: use [[dev-sk-foh-fork_session]]. Your own full context: compact ([[dev-knw-foh-compaction]]).
- **Read each source.** Run `flint orbh peek <id>` and `flint orbh kin <id>`. Note its state (working, dormant, died, or cannot run), its fleet role, and its open frames.
- **Know the refusals.** `consume` refuses a source that is not in the store of the consumer (`not-found`), this session (`self`), the same source two times (`duplicate`), an orb agent (`orb-agent`), a source in another space (`other-store`), a consumed source (`consumed-already`), and a discarded source (`discarded`). A live claim of another consumer also refuses. A consumed session does not consume.
- **A wisp as a source:** Orbh consumes each member session of the wisp that is not consumed yet. The consumer does not join the wisp.
- Tell the person the sources, and that each source ends and its obligations move to this session. Get a yes before Stage 2.
- Once the person confirms the sources, progress to the next stage.

> [!headless]
> - Set `flint orbh session set phase consume-sources`.
> - The sources come from the prompt, not from a person. Do not wait for a confirm.

## Stage 2: Consume

- **Run the consume in background execution.** It blocks until each handoff turn ends. In Claude Code, run it with `run_in_background: true`:

  ```bash
  flint orbh consume <id>… [--wait-task] [--timeout <minutes>] [--json]
  ```

- Each source gets the notice `ORBH CONSUME NOTICE`. It finishes its step, writes its handoff (`HANDOFF_ARTIFACT_V1`, `purpose: consume`), and ends its turn with `flint orbh consume handoff`. A source that cannot run gets a reconstructed handoff (`writtenBy: reconstructed`).
- While the consume runs, do not edit a file that a source can change.
- **Read the full output.** The command exits 0 only when each source is consumed. For each other status:
  - `skipped`: the turn of the source did not end in time. The notice stays in its inbox. Run `consume` again after its turn ends.
  - `failed`: an obligation did not move (`NOT moved: …`), and the source stays open. Fix the cause, then run `consume` again with the same source from this session. The second run moves the rest with no new handoff turn.
  - `refused`: read the code, and remove the source or fix the cause.
- Once each source is consumed (or you reported each other status), progress to the next stage.

> [!headless]
> - Set `flint orbh session set phase consuming`.
> - Do not end the turn while the consume runs: the end of the turn kills the background task (Agent Rule 1 of the init). When you have no other work and the wait is shorter than your tool timeout, run the consume in the foreground.

## Stage 3: Read and Check

- **Read the reconcile report.** The command prints it, and it is in `<consumer spool>/scratch/consume-report-<time>.md`. Its sections: `## HANDOFFS`, `## OPEN ITEMS`, `## CONFLICTS`, `## DECISIONS`, and `## UNCOMMITTED PATHS`.
- **Read each handoff** (`<source spool>/scratch/consume-handoff-<consumer id>.md`) and each path in its FILES.
- **Check the important claims.** A handoff is a set of claims, not facts. Trust VERIFIED more than ASSUMED, and a handoff with `writtenBy: self` more than one with `writtenBy: reconstructed`. Check each claim that your next step depends on.
- **Accept or reject each open item.** Write the reason for each rejection.
- **Show each conflict to the person:** `same-file`, `decision`, or `waits-for`. Do not resolve a conflict silently. Say when you overwrite a decision of a source.
- Once the person decided each conflict, progress to the next stage.

> [!headless]
> - Set `flint orbh session set phase consume-check`.
> - A subagent puts each conflict and each rejected item in its result. A headless root asks with `flint orbh approval request "<conflict>" --body "<the options>"`, and it continues the parts that the conflict does not block.

## Stage 4: Take the Obligations

Do each item that the report lists:

- **Dispatch collectors:** collect each moved child with `flint orbh wait <id>`. The child keeps its `parentSessionId`: there is no reparent.
- **Inbox requests to a source:** answer each copied request with `flint orbh message respond <requestId> "<answer>"`.
- **Requests that a source sent:** the answer goes to the inbox of the source. Read it there when you need it.
- **Open shard invocation frames:** continue each frame with the command in the handoff, or close it with `flint shard invocations close <id> --outcome dropped`.
- **Jobs** stay with the source: `flint orbh job result <id> --session <source>`.
- **The fleet root and stream ownership** move to this session. When you are the root now, read `flint orbh fleet show` and follow [[dev-knw-foh-fleets]].
- **Uncommitted paths** become your paths. Check each diff, then commit only those paths, with the rule of the init ("commit only your own paths"). Name the source in the commit body, for example `Carried from session <source id>.`
- **The party memberships** of a source do not move. To take its place in a party, join with [[dev-sk-foh-join_party]].
- Once each moved obligation is collected, answered, continued, or closed, progress to the next stage.

> [!headless]
> Set `flint orbh session set phase consume-obligations`. Do not wait on a person for an item that you can do alone.

## Stage 5: Record and Report

- **Check the kinship.** `flint orbh kin --up` shows each source in the ancestry of this session, with a `consume` edge. The `KIN` line of this session shows `consumed <n> sessions`, and the `KIN` line of each source shows `consumed into <ref> <HH:MM>`.
- **Keep the mark of each source** on each item that you carry: in the commit bodies, the notes, and the result. The mark is for audit, not for credit. Never write that a source consented or agreed when it did not say so.
- **A source that runs again** (revive) holds no moved obligation. Its `KIN` line warns: `⚠ revived after consume: the obligations are with <ref>`. The obligations stay with this session.
- Give the person a summary: the sources, what moved, the conflicts and the decisions, the commits, and the open items. When the work needs a Mesh record, write a note and stamp `orb:`.

> [!headless]
> - Set `flint orbh session set phase complete`.
> - Put the summary in the result. A subagent returns with `flint orbh session return --finish "<summary>"`.

# Output

- Each source ended with the reason `consumed`, with `relations.consumedInto` = this session
- `relations.consumed` on this session, and the reconcile report in its scratch folder
- Each moved obligation collected, answered, continued, or closed, and the carried paths committed with the mark of their source
