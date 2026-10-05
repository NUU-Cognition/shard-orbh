#!/usr/bin/env node
// flint shard orbh commit-trailers [status|install|uninstall|show] [--repo <path>] [--append]
//   status              show the hooks folder of the repository and the state of the hook
//   install             install the hook body and a prepare-commit-msg hook that calls it
//   install --append    also add the call to a prepare-commit-msg hook that exists (else refused)
//   uninstall           remove the hook body and the call; a hook of another owner keeps its other lines
//   show                print the hook body
//
// The hook adds the trailers `Orbh-Fleet: <handle>` and `Orbh-Session: <id>` to the message of a
// commit that an Orbh session makes. It reads ORBH_FLEET_HANDLE and ORBH_SESSION_ID (the run
// environment of an Orbh session). It changes only the message: never the author, the committer,
// or the subject, and it never fails a commit. With neither variable set, it does nothing.
// --repo defaults to the current folder (the Flint root when flint runs the script).
// See knw-foh-fleets, section "Commit trailers".
'use strict';
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BODY_NAME = 'orbh-commit-trailers';
const HOOK_NAME = 'prepare-commit-msg';
const MARKER = '# orbh-commit-trailers';
const CALL_LINE = `"$(dirname "$0")/${BODY_NAME}" "$@" || true`;
const VERSION = 1;

const BODY = `#!/bin/sh
${MARKER} v${VERSION}: installed by \`flint shard orbh commit-trailers install\` (Orbh shard).
# Adds the trailers Orbh-Fleet and Orbh-Session to the commit message of an Orbh session.
# It reads ORBH_FLEET_HANDLE and ORBH_SESSION_ID. It changes only the message, never the
# author or the committer, and it always exits 0, so it never stops a commit.
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

const args = parseArgs(process.argv.slice(2));
switch (args.verb) {
  case 'status': status(args.repo); break;
  case 'install': install(args.repo, args.append); break;
  case 'uninstall': uninstall(args.repo); break;
  case 'show': process.stdout.write(BODY); break;
  case 'help':
    console.log('flint shard orbh commit-trailers [status|install|uninstall|show] [--repo <path>] [--append]');
    break;
  default: fail(`unknown verb ${args.verb}. Use status, install, uninstall, or show.`);
}
