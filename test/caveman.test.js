// Run: node --test test/
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const HOOK = path.join(__dirname, '..', 'hooks', 'caveman.js');
const INSTALL = path.join(__dirname, '..', 'scripts', 'install.js');

function runHook(env = {}, input = '{"invocationNum":1,"initialNumSteps":0}') {
  const cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'caveman-'));
  const res = spawnSync(process.execPath, [HOOK], {
    input,
    env: { ...process.env, CAVEMAN_MODE: '', CAVEMAN_CONFIG_DIR: cfg, ...env },
    encoding: 'utf8',
  });
  return { ...res, cfg, json: JSON.parse(res.stdout) };
}

test('default mode injects full caveman ephemeral message', () => {
  const { status, json } = runHook();
  assert.strictEqual(status, 0);
  assert.strictEqual(json.injectSteps.length, 1);
  assert.match(json.injectSteps[0].ephemeralMessage, /CAVEMAN MODE ACTIVE \(full\)/);
});

test('CAVEMAN_MODE env selects mode', () => {
  for (const m of ['lite', 'ultra']) {
    const { json } = runHook({ CAVEMAN_MODE: m });
    assert.match(json.injectSteps[0].ephemeralMessage, new RegExp(`\\(${m}\\)`));
  }
});

test('off mode outputs empty object', () => {
  assert.deepStrictEqual(runHook({ CAVEMAN_MODE: 'off' }).json, {});
});

test('caveman-off file disables hook', () => {
  const cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'caveman-'));
  fs.writeFileSync(path.join(cfg, 'caveman-off'), '');
  assert.deepStrictEqual(runHook({ CAVEMAN_CONFIG_DIR: cfg }).json, {});
});

test('caveman-mode file selects mode', () => {
  const cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'caveman-'));
  fs.writeFileSync(path.join(cfg, 'caveman-mode'), 'ultra\n');
  const { json } = runHook({ CAVEMAN_CONFIG_DIR: cfg });
  assert.match(json.injectSteps[0].ephemeralMessage, /\(ultra\)/);
});

test('unknown mode outputs empty object', () => {
  assert.deepStrictEqual(runHook({ CAVEMAN_MODE: 'bogus' }).json, {});
});

test('empty stdin still emits valid JSON', () => {
  const { status, json } = runHook({}, '');
  assert.strictEqual(status, 0);
  assert.ok(json.injectSteps);
});

test('workspace install merges hooks.json and uninstall removes entry', () => {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'caveman-ws-'));
  const hooksJson = path.join(ws, '.agents', 'hooks.json');
  fs.mkdirSync(path.dirname(hooksJson), { recursive: true });
  fs.writeFileSync(hooksJson, JSON.stringify({ other: { PreInvocation: [] } }));

  let r = spawnSync(process.execPath, [INSTALL, '--workspace', ws], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  let cfg = JSON.parse(fs.readFileSync(hooksJson, 'utf8'));
  assert.ok(cfg.other, 'existing hook kept');
  assert.strictEqual(cfg.caveman.PreInvocation[0].command, 'node hooks/caveman.js');
  assert.ok(fs.existsSync(path.join(ws, '.agents', 'hooks', 'caveman.js')));

  r = spawnSync(process.execPath, [INSTALL, '--uninstall', '--workspace', ws], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  cfg = JSON.parse(fs.readFileSync(hooksJson, 'utf8'));
  assert.strictEqual(cfg.caveman, undefined);
  assert.ok(cfg.other);
});
