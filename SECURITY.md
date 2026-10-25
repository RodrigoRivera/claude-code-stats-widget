# Security policy

Claude Stats reads Claude Code's local logs on your computer, so security and privacy matter.

## What it does and doesn't do
- It reads only dates, project folders, model names and token counts from `~/.claude/projects/**/*.jsonl` — never the text of your messages.
- For the greeting, it reads only your account's `displayName` from `~/.claude.json`. It never reads `~/.claude/.credentials.json` or any token.
- The server listens only on `127.0.0.1:4747` and makes no network requests.

If you find a way any of this is not true, that's a security issue.

## Supported versions
Only the latest release receives fixes.

| Version | Supported |
|---|---|
| 1.0.x | ✅ |

## Reporting a vulnerability
**Please don't open a public issue.** Instead, report it privately through GitHub:

1. Go to the [Security tab](https://github.com/RodrigoRivera/claude-code-stats-widget/security) of this repository.
2. Click **Report a vulnerability** and describe the problem, how to reproduce it and its impact.

You can expect a first answer within 7 days. Once it's fixed, the report will be credited in the release notes unless you prefer to stay anonymous.
