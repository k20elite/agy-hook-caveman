#!/usr/bin/env node
// Install / uninstall the caveman PreInvocation hook for Antigravity (agy).
//
//   node scripts/install.js                      global: ~/.gemini/config
//   node scripts/install.js --workspace <dir>    workspace: <dir>/.agents
//   node scripts/install.js --uninstall [--workspace <dir>]
//   node scripts/install.js --mode lite|full|ultra|off   (global mode file)
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const HOOK_NAME = 'caveman';
const SRC = path.join(__dirname, '..', 'hooks', 'caveman.js');

function parseArgs(argv) {
  const opts = { uninstall: false, workspace: null, mode: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--uninstall') opts.uninstall = true;
    else if (a === '--workspace') opts.workspace = argv[++i];
    else if (a === '--mode') opts.mode = argv[++i];
    else if (a === '-h' || a === '--help') opts.help = true;
    else throw new Error(`unknown argument: ${a}`);
  }
  if (opts.workspace === undefined) throw new Error('--workspace needs a directory');
  return opts;
}

function readJson(file) {
  if (!fs.existsSync(file)) return {};
  const text = fs.readFileSync(file, 'utf8').trim();
  return text ? JSON.parse(text) : {};
}

function writeJson(file, data) {
  if (fs.existsSync(file)) fs.copyFileSync(file, `${file}.bak`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 8).join('\n'));
    return;
  }

  const globalDir = path.join(os.homedir(), '.gemini', 'config');
  const root = opts.workspace ? path.join(path.resolve(opts.workspace), '.agents') : globalDir;
  const hooksJson = path.join(root, 'hooks.json');
  const hookFile = path.join(root, 'hooks', 'caveman.js');

  if (opts.mode) {
    const valid = ['lite', 'full', 'ultra', 'off'];
    if (!valid.includes(opts.mode)) throw new Error(`mode must be one of: ${valid.join(', ')}`);
    fs.mkdirSync(globalDir, { recursive: true });
    fs.rmSync(path.join(globalDir, 'caveman-off'), { force: true });
    fs.writeFileSync(path.join(globalDir, 'caveman-mode'), opts.mode + '\n');
    console.log(`caveman mode set: ${opts.mode}`);
    return;
  }

  const config = readJson(hooksJson);

  if (opts.uninstall) {
    delete config[HOOK_NAME];
    if (fs.existsSync(hooksJson)) writeJson(hooksJson, config);
    fs.rmSync(hookFile, { force: true });
    console.log(`removed caveman hook from ${hooksJson}`);
    return;
  }

  fs.mkdirSync(path.dirname(hookFile), { recursive: true });
  fs.copyFileSync(SRC, hookFile);

  // Command runs with cwd = directory containing hooks.json.
  config[HOOK_NAME] = {
    PreInvocation: [{ type: 'command', command: 'node hooks/caveman.js', timeout: 10 }],
  };
  writeJson(hooksJson, config);

  console.log(`installed: ${hookFile}`);
  console.log(`registered: ${hooksJson}`);
  console.log('verify: agy -p "/hooks"');
}

try {
  main();
} catch (err) {
  console.error(`error: ${err.message}`);
  process.exit(1);
}
