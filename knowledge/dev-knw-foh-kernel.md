---
description: "The Orbh kernel — one persistent Python kernel for each session (flint orbh kernel): the model, each verb, the forms of the exec output, the KERNEL RESULT message, the KERNEL line of the Page, the [kernel-state] notice, the lifecycle (checkpoint, sleep, restore, crash, stop), and the rules of use"
orb:
  - "@v1/nuucognition/session/05c2d8ce-2f6d-4136-849f-cd3b89a9a26e#flint/nuu-orbh"
orbh-fleet: orbh-kernel-763
---

# Knowledge: The Orbh Kernel

This file tells you how to use the Orbh kernel of your session. Read it before you use a verb of `flint orbh kernel` other than `exec`, and before you run long work in the kernel. The design is Task 763 of NUU Orbh and its contract (`Mesh/Notes/Orbh Kernel Contract (Task 763).md`).

Words: the **kernel** is the Python process. The **host** is the Node process that owns one kernel for one session. A **cell** is one piece of code that the kernel runs. A **command** is a shell command that kernel code started with `bash()`.

## The Model

- One Orbh session has 0 or 1 kernel. Orbh owns it, not the harness. So the kernel survives a turn end, a compaction, a resume, and a change of runtime (Claude to Codex).
- Any harness drives it with its normal shell tool: `flint orbh kernel exec`. The built-in tools of the harness stay.
- `exec` waits for the cell. With `--detach`, or when the wait limit passes, the cell continues. Its result comes to the session as a message from `orbh:kernel` (a `KERNEL RESULT` block). That message reaches a live turn, and it wakes an awaiting session. You do not poll for it.
- Cells run in parallel as asyncio tasks in one namespace. A name that one cell sets, the next cell reads.
- The files of the kernel are in the folder `kernel/` of the spool of the session (beside `scratch/`): `status.json`, the snapshot (`snapshot.bin` and `snapshot.manifest.json`), the cells (`cells/c-<n>.py` for the code, `cells/c-<n>.out` for the full output, `cells/c-<n>.json` for the record), `kernel.log`, and `orphans.jsonl`.
- POSIX only. On Windows, each kernel verb refuses with a clear message.

## Run a Cell

Give the code as a heredoc. The quoted `'PY'` keeps the code as it is:

```bash
flint orbh kernel exec <<'PY'
import json
rows = json.load(open("data/rows.json"))
print(len(rows))
PY
```

- The code is the argument, or `--file <path>`, or stdin when there is no argument and stdin is not a terminal.
- Top-level `await` works.
- `bash(cmd)` starts a shell command and returns a handle at once.
- `r = await bash(cmd)` gives `r.output`, `r.exit_code`, and `r.duration`.
- A handle that you keep stays alive: `server = bash("pnpm dev", timeout=None)`. Later, `server.tail()` reads its output.
- Each kernel starts with the names `asyncio`, `rlm`, and `bash`. These three names are never in a snapshot.
- The working folder of the kernel is the working folder of the first `exec`.
- The environment of the kernel is the environment of the CLI that started the host, with no `ORBH_RUN_ID`, `ORBH_MANAGER_CONTROL_SOCKET`, or `ORBH_HARNESS_HOST_SOCKET`, and with `ORBH_KERNEL=1`.

### The Python

1. `ORBH_KERNEL_PYTHON` is set: the kernel uses that executable. It must be Python 3.11 or newer, else `exec` refuses. With no `dill` there, a snapshot fails with a clear reason, and the kernel still runs.
2. Else the managed virtual environment `<ORBH_HOME>/kernel/venv/`. The first start makes it: with `uv` on `PATH`, Python 3.13 and `dill`; with no `uv`, a `python3` of 3.11 or newer with `-m venv` and `pip install dill`.
3. With neither, `exec` refuses with the next step: install `uv`, or set `ORBH_KERNEL_PYTHON`.

## The Verbs

Each verb takes `--session <id>` (default `ORBH_SESSION_ID`) and `--json` (one JSON document on stdout). With no session, a verb refuses: `flint orbh kernel <verb> runs inside an Orbh session, or give --session <id>`.

```bash
flint orbh kernel exec [code] [--file <path>] [--detach] [--wait <seconds>] [--max-output <chars>] [--queue]
flint orbh kernel wait <cell...> [--wait <seconds>] [--tail <lines>]
flint orbh kernel result <cell> [--tail <lines>] [--full]
flint orbh kernel cells [--running]
flint orbh kernel commands [list]
flint orbh kernel commands tail <id> [--lines <n>]
flint orbh kernel commands kill <id>
flint orbh kernel names
flint orbh kernel interrupt [cell] [--all]
flint orbh kernel status
flint orbh kernel snapshot
flint orbh kernel restart [--keep]
flint orbh kernel stop [--discard]
```

| Verb | Does |
|---|---|
| `exec` | Runs a cell. `--wait` is the wait limit (default `100` seconds, or `ORBH_KERNEL_EXEC_WAIT`; `0` is `--detach`). `--max-output` cuts a longer output (default `20000` characters). `--queue` waits behind a blocked loop. Starts the kernel when none runs. |
| `wait` | Waits for cells that run. `--wait` default `100` seconds. Prints each end as `exec` does, with the output tail (`--tail`, default 40 lines). |
| `result` | The record and the output of a cell, from the files. It works when the kernel sleeps. `--tail` default 100 lines; `--full` prints all. |
| `cells` | A table: id, state, duration, detached, the first line of the code. `--running` shows only the cells that run. |
| `commands` | The `bash()` commands of the kernel: `list`, `tail <id>`, `kill <id>`. |
| `names` | The names with the type and the size. When the kernel sleeps: the names of the snapshot manifest. |
| `interrupt` | Stops a cell. With no cell and one running cell, that cell. With more running cells, give the cell or `--all`. |
| `status` | The Page line and the details. `--json` gives the full status. |
| `snapshot` | Saves a snapshot now, and prints the saved and the skipped names. |
| `restart` | A new kernel with an empty namespace, and the snapshot is removed. `--keep` saves the names first and restores them. Running cells become `interrupted`. |
| `stop` | Saves a snapshot and stops the kernel. `--discard` saves no snapshot and removes the snapshot. |

`result`, `cells`, `names`, `status`, `interrupt`, `commands`, `snapshot`, and `stop` never start a kernel. When none runs, they say so (`The kernel of this session is not running (sleeping since …)`) with exit 0, or they answer from the files.

## The Output of `exec`

All output goes to stdout, so a harness reads one stream:

```
[kernel started · python 3.13.5 · restored 12 names · lost: conn]
<the output of the cell, stdout and stderr in the order of arrival>
→ <repr of the trailing value>
[c-7 · done · 1.2s]
```

- The first line comes only when this `exec` started the kernel.
- An output that is longer than `--max-output` keeps the first 30% and the last 70%, with one line between them: `[… 48 112 characters cut. Full output: <path of cells/c-7.out>]`. The trailing value is cut at 4 000 characters.

| End | Output | Exit |
|---|---|---|
| Done | `[c-7 · done · 1.2s]` | 0 |
| Error | The traceback, then `[c-7 · error · KeyError · 0.3s]` | 1 |
| The wait limit passed | `[c-7 · running · 100s · detached: its result comes as a KERNEL RESULT message]`, then `Next: flint orbh kernel wait c-7` and `Or: flint orbh kernel interrupt c-7` | 0 |
| `--detach` | `c-7 started (detached). Its result comes as a KERNEL RESULT message.`, and the same two lines | 0 |
| Busy | `✘ The kernel is busy: c-5 runs synchronous code and blocks the loop (14 s). This cell did not run.`, then `Next: flint orbh kernel interrupt c-5` and `Or: flint orbh kernel wait c-5` | 1 |
| Interrupted | `[c-7 · interrupted · 12s]` | 130 |

- **Busy.** A cell that cannot start in 5 seconds, because another cell blocks the loop, does not run. `--queue` waits behind the block.
- **A closed client is not an interrupt.** When `exec` or `wait` ends before the cell (a kill of the CLI, a timeout of the tool), the cell continues as detached, and its result comes as a `KERNEL RESULT` message. Only `interrupt` stops a cell.
- **Signals.** `SIGINT`, `SIGTERM`, or `SIGHUP` to a blocking `exec` or `wait` interrupts the cells of that command. The command waits at most 5 seconds for the end, prints the status line, and exits with `128 + <signal number>`.
- `--json` gives one document: `{ cell, output, truncated, started }`.

## The `KERNEL RESULT` Message

When a cell ends and no client waits for it, the host writes one message from `orbh:kernel` into the inbox of the session. The Page shows it in the inbox, managed delivery and the pager deliver it to a live turn, and it wakes an awaiting session. The message has at most 4 000 characters:

```
KERNEL RESULT c-7 · done · 4m12s
→ 1234567
Output (the last 20 lines of 1 834 bytes):
  epoch 9 loss 0.031
  …
Full output: <absolute path of cells/c-7.out>
Read again: flint orbh kernel result c-7
```

- An error: `KERNEL RESULT c-7 · error · KeyError: 'x' · 12s`, then the last 15 lines of the traceback, then the output tail.
- A command that a cell left running: `KERNEL RESULT command pid 4312 · exit 0 · 2m03s`, then `$ <command>`, then the last 20 lines of its output, then `In the kernel, the handle keeps the output: h.output()`. When the code reads the output of the handle within 1.5 seconds of the end, no message comes.
- A crash: `KERNEL RESULT kernel · crashed (<reason>)`, the lost cells, and `The next exec restores the snapshot of <time> (<n> names)`.
- The trailing value is cut at 2 000 characters.

## The KERNEL Line of the Page

The Page shows one `KERNEL` line, after the `WISP` line, when the session has a kernel status file. A session that never used the kernel has no line. Examples:

```
KERNEL running · 14 names · c-12 running 3m (detached) · 1 command · python 3.13.5
KERNEL running · 14 names · idle · sleeps in 21m
KERNEL running · BLOCKED by c-5 for 14s · 14 names
KERNEL sleeping · 14 names saved 2h ago · the next exec restores them
KERNEL crashed · snapshot of 5m ago with 12 names · the next exec restores it
KERNEL stopped · snapshot with 14 names
```

The details are in [[dev-knw-foh-page]] § The KERNEL Line.

## The `[kernel-state]` Notice

A context that is new does not know the names of the kernel. So Orbh gives it the `[kernel-state]` notice in three places:

- the output of `flint orbh compact finish`, after the "Compaction complete" line;
- the end of the prompt of a compaction successor;
- the end of the prompt of a headless resume, also of a wake of the orchestrator.

An interactive resume has no prompt: the `KERNEL` line of the Page serves it. A session that never used the kernel gets no notice. The notice has at most 1 200 characters:

```
[kernel-state] This session has an Orbh kernel: a persistent Python process that keeps names, imports, and bash() commands across turns, compaction, and resume. Run code with `flint orbh kernel exec`.
State: running since 14:02 · python 3.13.5 · cwd <dir>
Names (14): df, rows, server, …
Running: c-12 (detached, 3m) · 1 background command
Lost at the last restore: conn (TypeError: cannot pickle 'socket' object)
Read: flint orbh kernel status | names | cells
```

For a sleeping kernel, the state line is `State: sleeping since 14:02: the next exec restores 14 names from the snapshot`. For a crashed kernel, it gives the reason and the time of the snapshot. A line with no data is not shown. When you read the notice, the names are in the kernel: use them, and do not load the data again.

## The Lifecycle

| Event | What occurs |
|---|---|
| Start | The first `exec` starts the host and the kernel. When a snapshot exists, the kernel restores it. |
| Checkpoint | 30 seconds after the last cell ended, when no cell runs, the host saves a snapshot. At most one each 60 seconds. `ORBH_KERNEL_CHECKPOINT=0` stops it. |
| Sleep | When no cell runs, no command runs, and no client is connected for `ORBH_KERNEL_IDLE_SECONDS` (default `1800`): a snapshot, then the kernel ends. The state is `sleeping`. The next `exec` restores the names. |
| Restore | A name that the snapshot cannot keep (for example an open socket) is lost. The status lists it in `lost`, with the reason. Make it again. |
| Crash | The Python process ended with no stop. Each running cell becomes `lost`. One `KERNEL RESULT` message names the cells that no client waited for. The `bash()` commands of the kernel are killed. The state is `crashed`. The next `exec` restores the last snapshot. |
| Session end | `return --finish` and `close` stop the kernel with a snapshot (at most 10 seconds). `return --await` keeps it. The process reaper of the orchestrator stops the host when the session is terminal (kill, discard, abandon). The host also reads its session each 60 seconds, and a terminal session stops it. |
| Stop | `flint orbh kernel stop`: a snapshot, then the kernel ends. The state is `stopped`. A stop ends the `bash()` commands of the kernel. |

## Rules of Use

1. **Use the kernel when it saves work.** Use it when data is large or you will read it again: load it into a name, then print only the part that you need. Use it for a loop of many commands, and for long work.
2. **Use your normal tools for small reads and for edits.** Use the Edit tool of the harness for a change that a person reviews. A write from kernel code does not show as an edit in the harness.
3. **Do not block the loop.** Long synchronous work blocks all cells. Use `await asyncio.to_thread(fn, …)`.
4. **Detach long work.** Run it with `exec --detach`. Its result comes as a `KERNEL RESULT` message. Do not poll for it. Do other work, or end the turn with `return --await`: the message wakes the session.
5. **Keep large data in a name.** Print only the part that you need. The full output of each cell is in `cells/c-<n>.out`.
6. **Treat `exec` as a shell command.** In a mode that asks for the approval of each shell command, one `exec` can run any command. Give it the same care.
7. **Read the state after a new context.** Read the `[kernel-state]` notice or the `KERNEL` line, then `flint orbh kernel names`, before you load data again.
8. **Temporary files still go to `$ORBH_SCRATCH_DIR`.** The kernel folder belongs to the host. Do not write into it.
