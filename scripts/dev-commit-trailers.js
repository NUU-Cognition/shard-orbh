#!/usr/bin/env node
// flint shard orbh commit-trailers [status|install|uninstall|show|selftest] [--repo <path>] [--append] [--body <file>]
//   status              show the hooks folder of the repository and the state of the hook
//   install             install the hook body and a prepare-commit-msg hook that calls it
//   install --append    also add the call to a prepare-commit-msg hook that exists (else refused)
//   uninstall           remove the hook body and the call; a hook of another owner keeps its other lines
//   show                print the hook body
//   selftest            commit in a scratch repository with fake flint readers and check the hook body
//                       (--body <file>: check that body, for example an older one); exit 1 on a failure
//
// The hook adds the trailers `Orbh-Fleet: <handle>`, `Orbh-Session: <id>`, and `Task: <address>` to
// the message of a commit that an Orbh session makes. It reads ORBH_FLEET_HANDLE and ORBH_SESSION_ID
// (the run environment of an Orbh session), and the task pin of the session (the key core:task, read
// with `flint orbh session get core:task` in the Flint of ORBH_CWD, in at most 1 second). It changes
// only the message: never the author, the committer, or the subject, and it never fails a commit.
// With neither variable set, it does nothing.
// --repo defaults to the current folder (the Flint root when flint runs the script).
// See knw-foh-fleets, section "Commit trailers".
'use strict';
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const BODY_NAME = 'orbh-commit-trailers';
const HOOK_NAME = 'prepare-commit-msg';
const MARKER = '# orbh-commit-trailers';
const CALL_LINE = `"$(dirname "$0")/${BODY_NAME}" "$@" || true`;
const VERSION = 2;

const BODY = `#!/bin/sh
${MARKER} v${VERSION}: installed by \`flint shard orbh commit-trailers install\` (Orbh shard).
# Adds the trailers Orbh-Fleet, Orbh-Session, and Task to the commit message of an Orbh session.
# It reads ORBH_FLEET_HANDLE and ORBH_SESSION_ID, and the task pin of the session (the key
# core:task). It changes only the message, never the author or the committer, and it always
# exits 0, so it never stops a commit.
msg_file="$1"
[ -n "$msg_file" ] && [ -f "$msg_file" ] || exit 0

fleet="\${ORBH_FLEET_HANDLE:-}"
session="\${ORBH_SESSION_ID:-}"
# Only the exact shapes of a handle and a session id reach the message.
printf '%s' "$fleet" | grep -Eq '^[a-z0-9][a-z0-9-]{1,31}$' || fleet=''
printf '%s' "$session" | grep -Eq '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' || session=''
[ -n "$fleet" ] || [ -n "$session" ] || exit 0

# A message with no text (only comment lines) stays empty, so an empty message still aborts the commit.
cc="$(git config --get core.commentChar 2>/dev/null)"
case "$cc" in ''|auto) cc='#' ;; esac
grep -v "^$cc" "$msg_file" | grep -q '[^[:space:]]' || exit 0

# The task pin of the session: the key core:task, read in the Flint of the session (ORBH_CWD; with no
# ORBH_CWD, the Flint and the store that the registry row of the manager of the session names; else
# the working folder). The reader runs in its own process group. After at most about 2.5 seconds,
# the hook stops the whole group with
# SIGKILL (a signal that no process can ignore), reaps it, and removes its files, so no reader
# outlives the hook. The traps do the same when the hook exits early or gets a signal; they are in
# place before the temporary folder and the reader exist. Only a read that exits 0 gives a Task
# trailer. A missing key, a missing flint command, an error, or a slow read gives no Task trailer.
task=''
reader=''
dir=''
stop_reader() {
  if [ -n "$reader" ]; then
    kill -KILL -- "-$reader" 2>/dev/null || kill -KILL "$reader" 2>/dev/null
    wait "$reader" 2>/dev/null
    reader=''
  fi
}
remove_reader_dir() {
  if [ -n "$dir" ]; then
    rm -rf "$dir"
    dir=''
  fi
}
trap 'stop_reader; remove_reader_dir' EXIT
trap 'stop_reader; remove_reader_dir; exit 0' HUP INT TERM
if [ -n "$session" ] && command -v flint >/dev/null 2>&1; then
  pin_dir="\${ORBH_CWD:-}"
  pin_store="\${ORBH_ORB_ROOT_DIR:-}"
  if [ -z "$pin_dir" ] || [ ! -d "$pin_dir" ]; then
    # No ORBH_CWD: the registry row of the manager of the session names its Flint and its store.
    orbh_home="\${ORBH_HOME:-\${NUU_HOME:-$HOME/.nuucognition}/orbh}"
    case "$orbh_home" in "~/"*) orbh_home="$HOME/\${orbh_home#"~/"}" ;; esac
    row="$orbh_home/managers/$session.json"
    pin_dir=''
    if [ -f "$row" ]; then
      pin_dir="$(sed -n 's/^[[:space:]]*"flintPath":[[:space:]]*"\\(.*\\)",*[[:space:]]*$/\\1/p' "$row" 2>/dev/null | head -n 1)"
      [ -n "$pin_store" ] || pin_store="$(sed -n 's/^[[:space:]]*"orbRootDir":[[:space:]]*"\\(.*\\)",*[[:space:]]*$/\\1/p' "$row" 2>/dev/null | head -n 1)"
      # A JSON escape in a path is not read here: then the hook reads in the working folder.
      case "$pin_dir$pin_store" in *\\\\*) pin_dir=''; pin_store='' ;; esac
    fi
    [ -n "$pin_dir" ] && [ -d "$pin_dir" ] || pin_dir='.'
  fi
  dir="$(mktemp -d "\${TMPDIR:-/tmp}/orbh-task.XXXXXX" 2>/dev/null)" || dir=''
  if [ -n "$dir" ]; then
    read_pin='cd "$2" 2>/dev/null && { [ -z "$3" ] || export ORBH_ORB_ROOT_DIR="$3"; } && flint orbh session get core:task >"$1/out" 2>/dev/null </dev/null; echo "$?" >"$1/status.tmp" && mv "$1/status.tmp" "$1/status"'
    if command -v setsid >/dev/null 2>&1; then
      setsid /bin/sh -c "$read_pin" sh "$dir" "$pin_dir" "$pin_store" >/dev/null 2>&1 </dev/null &
    else
      set -m
      /bin/sh -c "$read_pin" sh "$dir" "$pin_dir" "$pin_store" >/dev/null 2>&1 </dev/null &
      set +m
    fi
    reader=$!
    tries=0
    while [ ! -f "$dir/status" ] && [ "$tries" -lt 25 ]; do sleep 0.1; tries=$((tries + 1)); done
    stop_reader
    [ "$(cat "$dir/status" 2>/dev/null)" = 0 ] && task="$(cat "$dir/out" 2>/dev/null)"
    remove_reader_dir
  fi
fi
# Only one line in the shape of an Ops address of a task or a task group reaches the message.
[ "$(printf '%s' "$task" | wc -l | tr -d ' ')" = 0 ] || task=''
printf '%s' "$task" | grep -Eq '^@v1/[a-z0-9][a-z0-9_-]{0,63}/(task([.][a-z][a-z0-9]{0,31})?|taskgroup)/[A-Za-z0-9_-]{1,128}#ops$' || task=''

set --
[ -n "$fleet" ] && set -- "$@" --trailer "Orbh-Fleet: $fleet"
[ -n "$session" ] && set -- "$@" --trailer "Orbh-Session: $session"
[ -n "$task" ] && set -- "$@" --trailer "Task: $task"
git interpret-trailers --in-place --if-exists addIfDifferent "$@" "$msg_file" >/dev/null 2>&1 || true
exit 0
`;

const WRAPPER = `#!/bin/sh
${MARKER}: the next line adds the Orbh-Fleet and Orbh-Session trailers.
${CALL_LINE}
`;

function fail(message) {
  console.error(`commit-trailers: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const out = { verb: 'status', repo: process.cwd(), append: false };
  const rest = [...argv];
  if (rest[0] && !rest[0].startsWith('--')) out.verb = rest.shift();
  while (rest.length > 0) {
    const arg = rest.shift();
    if (arg === '--repo') {
      const value = rest.shift();
      if (!value) fail('--repo needs a path');
      out.repo = path.resolve(value);
    } else if (arg === '--append') {
      out.append = true;
    } else if (arg === '--body') {
      const value = rest.shift();
      if (!value) fail('--body needs a file');
      out.body = path.resolve(value);
    } else if (arg === '-h' || arg === '--help') {
      out.verb = 'help';
    } else {
      fail(`unknown argument ${arg}`);
    }
  }
  return out;
}

function hooksDir(repo) {
  const result = spawnSync('git', ['-C', repo, 'rev-parse', '--git-path', 'hooks'], { encoding: 'utf8' });
  if (result.status !== 0) fail(`${repo} is not inside a Git repository`);
  return path.resolve(repo, result.stdout.trim());
}

function read(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

function writeExecutable(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  fs.chmodSync(file, 0o755);
}

function state(repo) {
  const dir = hooksDir(repo);
  const body = read(path.join(dir, BODY_NAME));
  const hook = read(path.join(dir, HOOK_NAME));
  const bodyVersion = body && body.includes(MARKER) ? Number((body.match(/orbh-commit-trailers v(\d+)/) || [])[1] || 0) : null;
  return {
    dir,
    body,
    hook,
    bodyVersion,
    hookCalls: hook !== null && hook.includes(CALL_LINE),
    hookOwned: hook !== null && hook.trim() === WRAPPER.trim(),
  };
}

function status(repo) {
  const s = state(repo);
  console.log(`hooks folder: ${s.dir}`);
  console.log(`hook body: ${s.bodyVersion === null ? 'not installed' : `installed (v${s.bodyVersion}${s.bodyVersion < VERSION ? `, older than v${VERSION}: run install` : ''})`}`);
  console.log(`${HOOK_NAME}: ${s.hook === null ? 'absent' : s.hookCalls ? (s.hookOwned ? 'installed (calls the body)' : 'a hook of another owner that calls the body') : 'a hook of another owner that does not call the body'}`);
  console.log(`trailers: ${s.bodyVersion !== null && s.hookCalls ? 'on' : 'off'}`);
}

function install(repo, append) {
  const s = state(repo);
  const hookPath = path.join(s.dir, HOOK_NAME);
  if (s.hook !== null && !s.hookCalls && !append) {
    fail(`${hookPath} exists and belongs to another owner. Nothing changed. Add this line to it, or run install --append:\n  ${CALL_LINE}`);
  }
  writeExecutable(path.join(s.dir, BODY_NAME), BODY);
  if (s.hook === null) {
    writeExecutable(hookPath, WRAPPER);
  } else if (!s.hookCalls) {
    const text = s.hook.endsWith('\n') ? s.hook : `${s.hook}\n`;
    writeExecutable(hookPath, `${text}${MARKER}: the next line adds the Orbh-Fleet and Orbh-Session trailers.\n${CALL_LINE}\n`);
    console.log(`appended the call to ${hookPath}; it runs only when the hook reaches its last line`);
  }
  console.log(`installed: ${path.join(s.dir, BODY_NAME)} (v${VERSION}) and ${hookPath}`);
}

function uninstall(repo) {
  const s = state(repo);
  const hookPath = path.join(s.dir, HOOK_NAME);
  if (s.hook !== null) {
    if (s.hookOwned) {
      fs.unlinkSync(hookPath);
    } else if (s.hookCalls) {
      const kept = s.hook.split('\n').filter((line) => line !== CALL_LINE && !line.startsWith(`${MARKER}:`)).join('\n');
      writeExecutable(hookPath, kept);
    }
  }
  if (s.body !== null && s.bodyVersion !== null) fs.unlinkSync(path.join(s.dir, BODY_NAME));
  console.log(`uninstalled from ${s.dir}`);
}

/**
 * The self test of a hook body. It makes a scratch repository with the body and the wrapper, puts
 * a fake `flint` first on PATH, and commits once for each mode of the fake reader:
 *   ok         prints a task address and exits 0: the commit gets the Task trailer
 *   error      prints a task address and exits 1: no Task trailer
 *   two-lines  prints two lines: no Task trailer
 *   cwd-check  prints a task address only in the Flint and the store of the registry row of the
 *              session: with no ORBH_CWD, the commit gets the Task trailer
 *   slow-ok    sleeps 1.5 s, then prints a task address: the commit still gets the Task trailer
 *   slow       ignores SIGTERM, starts a child, and sleeps 4 s: no Task trailer, the commit takes
 *              about 2.5 seconds at most, and no process of the reader is alive after the commit; one
 *              commit runs with SIGTERM ignored from its parent, one without
 * Git can reset the signals of a hook, so the slow mode also runs the body directly with SIGTERM
 * ignored. A last run sends SIGTERM to the body while its slow reader runs: the body must exit 0,
 * stop the reader, and remove its folder. Each commit must exit 0 and keep the Orbh-Session
 * trailer, and the hook must leave no files. A first commit with no Orbh variables warms up the
 * repository, so that the times compare.
 */
function selftest(bodyFile) {
  const body = bodyFile ? fs.readFileSync(bodyFile, 'utf8') : BODY;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'orbh-trailers-selftest-'));
  const pidsFile = path.join(root, 'pids');
  let failures = 0;
  const check = (ok, text) => {
    if (!ok) failures += 1;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${text}`);
  };
  const pids = () => (read(pidsFile) || '').split('\n').map((line) => Number(line.trim())).filter((pid) => pid > 0);
  const alive = (pid) => {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  };
  try {
    const repo = path.join(root, 'repo');
    const bin = path.join(root, 'bin');
    const tmp = path.join(root, 'tmp');
    const flint = path.join(root, 'flint');
    for (const dir of [repo, bin, tmp, flint]) fs.mkdirSync(dir, { recursive: true });
    const git = (...gitArgs) => spawnSync('git', gitArgs, { cwd: repo, encoding: 'utf8' });
    git('init', '-q');
    git('config', 'user.name', 'Orbh Selftest');
    git('config', 'user.email', 'selftest@orbh.invalid');
    const dir = hooksDir(repo);
    writeExecutable(path.join(dir, BODY_NAME), body);
    writeExecutable(path.join(dir, HOOK_NAME), WRAPPER);
    writeExecutable(path.join(bin, 'flint'), `#!/bin/sh
echo "$$" >> "$FAKE_PIDS"
case "$FAKE_FLINT_MODE" in
  ok) echo '@v1/test/task.dev/k17selftest#ops' ;;
  error) echo '@v1/test/task.dev/k17selftest#ops'; exit 1 ;;
  two-lines) printf '@v1/test/task/k17selftest#ops\\nEvil: yes\\n' ;;
  slow-ok) sleep 1.5; echo '@v1/test/task.dev/k17selftest#ops' ;;
  cwd-check) if [ "$(pwd -P)" = "$FAKE_FLINT_DIR" ] && [ "$ORBH_ORB_ROOT_DIR" = "$FAKE_FLINT_DIR/.orb" ]; then echo '@v1/test/task.dev/k17selftest#ops'; else exit 1; fi ;;
  slow) trap '' TERM; sleep 4 & echo "$!" >> "$FAKE_PIDS"; wait; echo '@v1/test/task.dev/k17selftest#ops' ;;
esac
`);
    const session = '00000000-0000-4000-8000-00000000c0de';
    // The registry row of the manager of the session, in a scratch Orbh home: it names the Flint and the store.
    const orbhHome = path.join(root, 'orbh-home');
    const flintReal = fs.realpathSync(flint);
    fs.mkdirSync(path.join(orbhHome, 'managers'), { recursive: true });
    fs.writeFileSync(path.join(orbhHome, 'managers', `${session}.json`), `${JSON.stringify({
      id: session, pid: process.pid, pgid: null, socketPath: path.join(root, 'none.sock'), runtime: 'claude',
      flintPath: flintReal, orbRootDir: path.join(flintReal, '.orb'), startedAt: new Date().toISOString(),
    }, null, 2)}\n`);
    const commit = (mode, ignoreTerm, noCwd = false) => {
      fs.writeFileSync(pidsFile, '');
      fs.writeFileSync(path.join(repo, 'file.txt'), `${mode} ${Date.now()}\n`);
      git('add', 'file.txt');
      const env = {
        ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH || ''}`, TMPDIR: tmp,
        ORBH_SESSION_ID: session, ORBH_FLEET_HANDLE: 'selftest-fleet', ORBH_CWD: flint, ORBH_HOME: orbhHome,
        FAKE_FLINT_MODE: mode, FAKE_PIDS: pidsFile, FAKE_FLINT_DIR: flintReal,
      };
      delete env.ORBH_ORB_ROOT_DIR;
      if (noCwd) delete env.ORBH_CWD;
      const started = Date.now();
      const result = spawnSync('/bin/sh', ['-c', `${ignoreTerm ? "trap '' TERM; " : ''}exec git commit -q -m "selftest ${mode}"`], {
        cwd: repo, env, encoding: 'utf8', timeout: 20000,
      });
      const ms = Date.now() - started;
      const message = git('log', '-1', '--format=%B').stdout;
      return { status: result.status, ms, message };
    };
    const label = (mode, ignoreTerm, noCwd) => `${mode}${ignoreTerm ? ' (SIGTERM ignored by the parent)' : ''}${noCwd ? ' (no ORBH_CWD: the Flint of the registry row)' : ''}`;
    fs.writeFileSync(path.join(repo, 'file.txt'), 'warm up\n');
    git('add', 'file.txt');
    git('commit', '-q', '-m', 'warm up');
    const stopLeftovers = (left) => {
      for (const pid of left) {
        try {
          process.kill(pid, 'SIGKILL');
        } catch {
          // Gone already.
        }
      }
    };
    const cases = [
      ['ok', false, true], ['error', false, false], ['two-lines', false, false], ['cwd-check', false, true, true],
      ['slow-ok', false, true], ['slow', false, false], ['slow', true, false],
    ];
    for (const [mode, ignoreTerm, wantTask, noCwd = false] of cases) {
      const result = commit(mode, ignoreTerm, noCwd);
      const name = label(mode, ignoreTerm, noCwd);
      check(result.status === 0, `${name}: the commit exits 0`);
      check(result.message.includes(`Orbh-Session: ${session}`), `${name}: the commit has the Orbh-Session trailer`);
      check(result.message.includes('Task: @v1/test/task.dev/k17selftest#ops') === wantTask, `${name}: the commit ${wantTask ? 'has' : 'has no'} Task trailer`);
      check(!result.message.includes('Evil:'), `${name}: no other trailer reaches the message`);
      // The limit of the read is about 2.5 s: a commit with a fast reader stays short, and no commit waits longer.
      const most = mode.startsWith('slow') ? 3500 : 1500;
      check(result.ms <= most, `${name}: the commit takes ${result.ms} ms (at most ${most})`);
      if (mode === 'slow') {
        spawnSync('sleep', ['0.3']);
        const left = pids().filter(alive);
        check(left.length === 0, `${name}: no process of the reader is alive after the commit (alive: ${left.join(', ') || 'none'})`);
        stopLeftovers(left);
      }
    }
    {
      // The body itself with SIGTERM ignored from its parent: git does not reset the signals here.
      fs.writeFileSync(pidsFile, '');
      const msg = path.join(root, 'message.txt');
      fs.writeFileSync(msg, 'selftest direct\n');
      const env = {
        ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH || ''}`, TMPDIR: tmp,
        ORBH_SESSION_ID: session, ORBH_FLEET_HANDLE: 'selftest-fleet', ORBH_CWD: flint,
        FAKE_FLINT_MODE: 'slow', FAKE_PIDS: pidsFile,
      };
      const started = Date.now();
      const result = spawnSync('/bin/sh', ['-c', `trap '' TERM; exec /bin/sh "$0" "$1"`, path.join(dir, BODY_NAME), msg], {
        cwd: repo, env, encoding: 'utf8', timeout: 20000,
      });
      const ms = Date.now() - started;
      const name = 'slow, the body run directly with SIGTERM ignored';
      const message = read(msg) || '';
      check(result.status === 0, `${name}: the body exits 0`);
      check(message.includes(`Orbh-Session: ${session}`) && !message.includes('Task:'), `${name}: the message has the Orbh-Session trailer and no Task trailer`);
      check(ms <= 3500, `${name}: the body takes ${ms} ms (at most 3500)`);
      spawnSync('sleep', ['0.3']);
      const left = pids().filter(alive);
      check(left.length === 0, `${name}: no process of the reader is alive after the body (alive: ${left.join(', ') || 'none'})`);
      stopLeftovers(left);
    }
    {
      // SIGTERM to the body while its slow reader runs: the traps stop the reader and remove its folder.
      fs.writeFileSync(pidsFile, '');
      const msg = path.join(root, 'message-term.txt');
      fs.writeFileSync(msg, 'selftest term\n');
      const env = {
        ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH || ''}`, TMPDIR: tmp,
        ORBH_SESSION_ID: session, ORBH_FLEET_HANDLE: 'selftest-fleet', ORBH_CWD: flint,
        FAKE_FLINT_MODE: 'slow', FAKE_PIDS: pidsFile,
      };
      const result = spawnSync('/bin/sh', ['-c', '/bin/sh "$0" "$1" & hook=$!; sleep 0.4; kill -TERM "$hook"; wait "$hook"; echo "exit=$?"', path.join(dir, BODY_NAME), msg], {
        cwd: repo, env, encoding: 'utf8', timeout: 20000,
      });
      const name = 'slow, SIGTERM to the body while the reader runs';
      check(result.stdout.includes('exit=0'), `${name}: the body exits 0 (${result.stdout.trim() || 'no output'})`);
      spawnSync('sleep', ['0.3']);
      const left = pids().filter(alive);
      check(pids().length > 0 && left.length === 0, `${name}: the reader started, and no process of it is alive after the body (alive: ${left.join(', ') || 'none'})`);
      stopLeftovers(left);
      const folders = fs.readdirSync(tmp).filter((entry) => entry.startsWith('orbh-task.'));
      check(folders.length === 0, `${name}: the body removed its folder (found: ${folders.join(', ') || 'none'})`);
    }
    const leftFiles = fs.readdirSync(tmp);
    check(leftFiles.length === 0, `the hook leaves no files in TMPDIR (found: ${leftFiles.join(', ') || 'none'})`);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
  console.log(failures === 0 ? 'selftest: all checks pass' : `selftest: ${failures} checks fail`);
  process.exit(failures === 0 ? 0 : 1);
}

const args = parseArgs(process.argv.slice(2));
switch (args.verb) {
  case 'status': status(args.repo); break;
  case 'install': install(args.repo, args.append); break;
  case 'uninstall': uninstall(args.repo); break;
  case 'show': process.stdout.write(BODY); break;
  case 'selftest': selftest(args.body); break;
  case 'help':
    console.log('flint shard orbh commit-trailers [status|install|uninstall|show|selftest] [--repo <path>] [--append] [--body <file>]');
    break;
  default: fail(`unknown verb ${args.verb}. Use status, install, uninstall, show, or selftest.`);
}
