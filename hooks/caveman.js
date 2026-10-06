#!/usr/bin/env node
// Antigravity (agy) PreInvocation hook: keep caveman mode on every model call.
//
// agy runs this before each model invocation, sends a JSON payload on stdin,
// and reads {"injectSteps": [...]} from stdout. An ephemeralMessage step is a
// transient system message, so it must be re-injected on every invocation.
//
// Mode resolution (first match wins):
//   1. env CAVEMAN_MODE            (lite | full | ultra | off)
//   2. ~/.gemini/config/caveman-off   exists -> off
//   3. ~/.gemini/config/caveman-mode  file content
//   4. default: full
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_DIR = process.env.CAVEMAN_CONFIG_DIR || path.join(os.homedir(), '.gemini', 'config');
const OFF_FILE = path.join(CONFIG_DIR, 'caveman-off');
const MODE_FILE = path.join(CONFIG_DIR, 'caveman-mode');

const CORE = [
  'Never drop not/never/no/only.',
  'Code, commands, paths, API names, numbers and errors stay exact.',
  "Reply in the user's language.",
  'Use normal prose for security warnings, irreversible actions, multi-step order,',
  'and anything persisted (code, comments, commits, docs, PRs).',
  'If the user says "stop caveman" or "normal mode", answer normally for the rest of the session.',
];

const MODES = {
  lite: [
    'CAVEMAN MODE ACTIVE (lite).',
    'Be concise. Answer first. No greeting, filler, hedging, recap, or closing offer.',
    'Keep full grammar.',
  ],
  full: [
    'CAVEMAN MODE ACTIVE (full).',
    'Respond terse like smart caveman. All technical substance stay. Only fluff die.',
    'Answer first, then reason, then next step. No greeting, hedging, recap, or closer.',
    'Articles optional. Fragments fine. Short words. One idea per sentence.',
  ],
  ultra: [
    'CAVEMAN MODE ACTIVE (ultra).',
    'Maximum compression. Telegraphic fragments. Drop articles, connectives, pleasantries.',
    'Answer only. No reasoning unless asked. Lists over prose.',
  ],
};

function resolveMode() {
  const env = (process.env.CAVEMAN_MODE || '').trim().toLowerCase();
  if (env) return env;
  if (fs.existsSync(OFF_FILE)) return 'off';
  try {
    const m = fs.readFileSync(MODE_FILE, 'utf8').trim().toLowerCase();
    if (m) return m;
  } catch (_) { /* no mode file */ }
  return 'full';
}

function buildOutput(mode) {
  if (mode === 'off' || !MODES[mode]) {
    if (mode !== 'off') process.stderr.write(`caveman: unknown mode "${mode}", skipping\n`);
    return {};
  }
  return { injectSteps: [{ ephemeralMessage: MODES[mode].concat(CORE).join(' ') }] };
}

let done = false;
function emit() {
  if (done) return;
  done = true;
  process.stdout.write(JSON.stringify(buildOutput(resolveMode())));
  process.exit(0);
}

if (require.main === module) {
  // Drain stdin so agy never blocks on a full pipe; payload content is unused.
  process.stdin.on('data', () => {});
  process.stdin.on('end', emit);
  process.stdin.on('error', emit);
  // Safety net if stdin never closes. agy default hook timeout is 30s.
  setTimeout(emit, 2000);
}

module.exports = { resolveMode, buildOutput, MODES };
