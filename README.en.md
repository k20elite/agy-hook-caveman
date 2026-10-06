# agy-hook-caveman

[Tiếng Việt](README.md) | **English**

**Caveman mode** hook for [Antigravity](https://antigravity.google) (`agy` CLI, Antigravity 2.0, IDE).
Before every model call, the hook injects a transient system message (`ephemeralMessage`) that makes the
model answer tersely, "caveman" style: all filler removed, all technical substance kept, fewer output tokens.

Inspired by the [caveman](https://github.com/JuliusBrussee/caveman) plugin for Claude Code.

```text
Without hook:  In Git, **rebasing** is the process of moving or combining a sequence of commits
               to a new base commit. Instead of merging two branches together with a merge commit...
With hook:     Git rebase move branch commits to new base commit. Rewrite commit history to look
               like straight line.
```

## Requirements

- Antigravity CLI (`agy`), or Antigravity 2.0 / IDE with `hooks.json` support
- Node.js >= 18 on `PATH`

## Install

```bash
git clone https://github.com/k20elite/agy-hook-caveman.git
cd agy-hook-caveman
node scripts/install.js
```

The installer:

1. Copies `hooks/caveman.js` to `~/.gemini/config/hooks/caveman.js`
2. Adds a `caveman` entry to `~/.gemini/config/hooks.json` (other hooks are kept; the old file is backed up as `hooks.json.bak`)

Verify:

```bash
agy -p "/hooks"
agy -p "Explain what a git rebase is."
```

### Install for one workspace only

```bash
node scripts/install.js --workspace /path/to/project
```

The hook is written to `/path/to/project/.agents/hooks.json` and `/path/to/project/.agents/hooks/caveman.js`.
agy only loads workspace hooks after the workspace is trusted.

### Manual install

Copy `hooks/caveman.js` to `~/.gemini/config/hooks/`, then add this to `~/.gemini/config/hooks.json`:

```json
{
  "caveman": {
    "PreInvocation": [
      { "type": "command", "command": "node hooks/caveman.js", "timeout": 10 }
    ]
  }
}
```

agy runs the command with the directory containing `hooks.json` as the working directory, so the relative path `hooks/caveman.js` works.

## Modes

| Mode    | Behavior                                                      |
| :------ | :------------------------------------------------------------ |
| `lite`  | Concise, no filler, full grammar kept                         |
| `full`  | Default. Caveman style: fragments, no articles, answer first  |
| `ultra` | Maximum compression, telegraphic, answer only                 |
| `off`   | Hook disabled (outputs `{}`)                                  |

Mode resolution order:

1. `CAVEMAN_MODE` environment variable
2. `~/.gemini/config/caveman-off` exists → `off`
3. Content of `~/.gemini/config/caveman-mode`
4. Default `full`

```bash
node scripts/install.js --mode ultra      # change global mode
CAVEMAN_MODE=off agy -p "..."             # disable for one run (bash)
$env:CAVEMAN_MODE="lite"; agy             # PowerShell
```

In a chat session, say `stop caveman` or `normal mode` and the model answers normally for the rest of the session.

The model still writes in full prose for security warnings, irreversible actions, ordered steps,
and anything persisted (code, comments, commits, docs, PRs).

## Uninstall

```bash
node scripts/install.js --uninstall
node scripts/install.js --uninstall --workspace /path/to/project
```

## How it works

agy supports lifecycle hooks through `hooks.json`, with the events `PreToolUse`, `PostToolUse`, `PreInvocation`,
`PostInvocation` and `Stop`. This hook uses `PreInvocation`:

- **Input (stdin)**: JSON with `invocationNum`, `initialNumSteps`, `conversationId`, `workspacePaths`, `transcriptPath`, `modelName`, ...
- **Output (stdout)**:

  ```json
  { "injectSteps": [ { "ephemeralMessage": "CAVEMAN MODE ACTIVE (full). ..." } ] }
  ```

An `ephemeralMessage` is a transient system message that is not kept in history, so the hook re-injects it on every model call.
The hook drains stdin so agy never blocks, and exits after 2 seconds if stdin never closes.

Contract details (Vietnamese): [docs/agy-hooks.md](docs/agy-hooks.md).

## Development

```bash
npm test
```

Tests cover every mode, the `caveman-off` / `caveman-mode` files, empty stdin, and installer merge/removal of `hooks.json` without losing other hooks.

## License

MIT
