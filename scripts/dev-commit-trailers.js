#!/usr/bin/env node
// flint shard orbh commit-trailers [status|install|uninstall|show|selftest] [--repo <path>] [--append] [--body <file>]
//   status              show the hooks folder of the repository and the state of the hook
//   install             install the hook body and a prepare-commit-msg hook that calls it
//   install --append    also add the call to a prepare-commit-msg hook that exists (else refused)
//   uninstall           remove the hook body and the call; a hook of another owner keeps its other lines
//   show                print the hook body
//   selftest            commit in a scratch repository and check the hook body
//                       (--body <file>: check that body, for example an older one); exit 1 on a failure
//
// The hook adds the trailers `Orbh-Fleet: <handle>` and `Orbh-Session: <id>` to the message of a
// commit that an Orbh session makes. It reads ORBH_FLEET_HANDLE and ORBH_SESSION_ID (the run
// environment of an Orbh session). It changes only the message: never the author, the committer, or
// the subject, and it never fails a commit. With neither variable set, it does nothing.
// v3 (NUU Flint Task 1323): the task pin is removed, so the hook adds no `Task:` trailer and reads
// no key of the session. A session keeps an Ops task as an object; a task.dev records its commits
// with `ops task commit`. An install of v3 replaces the body of v2.
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
const VERSION = 3;

const BODY = `#!/bin/sh
${MARKER} v${VERSION}: installed by \`flint shard orbh commit-trailers install\` (Orbh shard).
# Adds the trailers Orbh-Fleet and Orbh-Session to the commit message of an Orbh session. It reads
# ORBH_FLEET_HANDLE and ORBH_SESSION_ID. It changes only the message, never the author or the
# committer, and it always exits 0, so it never stops a commit.
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

set --
[ -n "$fleet" ] && set -- "$@" --trailer "Orbh-Fleet: $fleet"
[ -n "$session" ] && set -- "$@" --trailer "Orbh-Session: $session"
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
 * The self test of a hook body. It makes a scratch repository with the body and the wrapper, puts a
 * fake `flint` first on PATH (it prints a task address and records each call), and commits:
 *   - in an Orbh session of a fleet: the Orbh-Fleet and Orbh-Session trailers, no Task trailer, and
 *     no call of flint (v3 reads no key of the session);
 *   - a second commit with the same trailers: each trailer is in the message one time;
 *   - with no Orbh variables: no trailer;
 *   - with a session id and a handle of a wrong shape: no trailer;
 *   - with an empty message: the commit aborts, as with no hook.
 * Each commit with a message must exit 0, and the hook must leave no files.
 */
function selftest(bodyFile) {
  const body = bodyFile ? fs.readFileSync(bodyFile, 'utf8') : BODY;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'orbh-trailers-selftest-'));
  const callsFile = path.join(root, 'calls');
  let failures = 0;
  const check = (ok, text) => {
    if (!ok) failures += 1;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${text}`);
  };
  try {
    const repo = path.join(root, 'repo');
    const bin = path.join(root, 'bin');
    const tmp = path.join(root, 'tmp');
    for (const dir of [repo, bin, tmp]) fs.mkdirSync(dir, { recursive: true });
    const git = (...gitArgs) => spawnSync('git', gitArgs, { cwd: repo, encoding: 'utf8' });
    git('init', '-q');
    git('config', 'user.name', 'Orbh Selftest');
    git('config', 'user.email', 'selftest@orbh.invalid');
    const dir = hooksDir(repo);
    writeExecutable(path.join(dir, BODY_NAME), body);
    writeExecutable(path.join(dir, HOOK_NAME), WRAPPER);
    writeExecutable(path.join(bin, 'flint'), `#!/bin/sh
echo "$*" >> "$FAKE_CALLS"
echo '@v1/test/task.dev/k17selftest#ops'
`);
    const session = '00000000-0000-4000-8000-00000000c0de';
    const commit = (name, extraEnv, message = `selftest ${name}`) => {
      fs.writeFileSync(callsFile, '');
      fs.writeFileSync(path.join(repo, 'file.txt'), `${name} ${Date.now()}\n`);
      git('add', 'file.txt');
      const env = {
        ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH || ''}`, TMPDIR: tmp, FAKE_CALLS: callsFile,
        ORBH_SESSION_ID: session, ORBH_FLEET_HANDLE: 'selftest-fleet', ORBH_CWD: root,
      };
      Object.assign(env, extraEnv);
      for (const key of Object.keys(env)) if (env[key] === undefined) delete env[key];
      const started = Date.now();
      const result = spawnSync('git', ['commit', '-q', '-m', message], { cwd: repo, env, encoding: 'utf8', timeout: 20000 });
      return { status: result.status, ms: Date.now() - started, message: git('log', '-1', '--format=%B').stdout, calls: (read(callsFile) || '').trim() };
    };
    fs.writeFileSync(path.join(repo, 'file.txt'), 'warm up\n');
    git('add', 'file.txt');
    git('commit', '-q', '-m', 'warm up');

    const first = commit('session', {});
    check(first.status === 0, 'a session of a fleet: the commit exits 0');
    check(first.message.includes(`Orbh-Session: ${session}`) && first.message.includes('Orbh-Fleet: selftest-fleet'), 'a session of a fleet: the commit has the Orbh-Session and Orbh-Fleet trailers');
    check(!first.message.includes('Task:'), 'a session of a fleet: the commit has no Task trailer');
    check(first.calls === '', `a session of a fleet: the hook calls no flint (calls: ${first.calls || 'none'})`);
    check(first.ms <= 2500, `a session of a fleet: the commit takes ${first.ms} ms (at most 2500)`);

    const again = commit('again', {}, `selftest again\n\nOrbh-Session: ${session}`);
    check(again.status === 0 && again.message.split(`Orbh-Session: ${session}`).length === 2, 'a message that has the trailer already: the trailer is in it one time');

    const plain = commit('plain', { ORBH_SESSION_ID: undefined, ORBH_FLEET_HANDLE: undefined });
    check(plain.status === 0 && !/Orbh-|Task:/.test(plain.message), 'no Orbh variables: the commit has no trailer');

    const bad = commit('bad', { ORBH_SESSION_ID: 'not-a-session', ORBH_FLEET_HANDLE: 'Bad Handle' });
    check(bad.status === 0 && !/Orbh-|Task:/.test(bad.message), 'a session id and a handle of a wrong shape: no trailer');

    fs.writeFileSync(path.join(repo, 'file.txt'), `empty ${Date.now()}\n`);
    git('add', 'file.txt');
    const empty = spawnSync('git', ['commit', '-q', '-m', ''], {
      cwd: repo, encoding: 'utf8', timeout: 20000,
      env: { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH || ''}`, TMPDIR: tmp, ORBH_SESSION_ID: session },
    });
    check(empty.status !== 0, 'an empty message: the commit aborts, as with no hook');

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
