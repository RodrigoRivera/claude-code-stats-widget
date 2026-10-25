# Contributing to Claude Stats

Thanks for helping! Bug reports, ideas and pull requests are all welcome — in English or Spanish (*también en español*).

## Before you start
- For a bug, open an issue with the **Bug report** form. Please include your Windows version, Node.js version and a screenshot if something looks wrong.
- For a new feature, open a **Feature request** first so we can agree on it before you write code.
- For a security problem, **don't open a public issue**: see [SECURITY.md](SECURITY.md).

## Run it locally
```bash
git clone https://github.com/RodrigoRivera/claude-code-stats-widget.git
cd claude-code-stats-widget
node server.js
```
Then open <http://127.0.0.1:4747>. Use `node server.js --no-open` to start it without a window, and `curl http://127.0.0.1:4747/api/stats` to see the raw data.

For the desktop widget:
```bash
cd widget
npm install
npm start
```

There is no build step: edit `index.html`, `server.js` or `widget/main.js` and reload.

## How to test a change
There are no automated tests yet, so please check by hand:
- The **Overview** tab must keep looking like the original Claude Desktop panel.
- Try **All / 30d / 7d**, a project in the filter, and both languages (**Español · English** under the panel, or `?lang=en` / `?lang=es`).
- If you touch the widget, try it at the starting size (324 × 200) and a bigger one, and check that nothing gets cut off.
- Mention in the pull request what you tested and how.

## Project rules
- **No new dependencies.** `server.js` and `index.html` use only Node.js and the browser. The only npm dependency is `electron` (pinned) inside `widget/`. Ask in an issue before adding anything.
- **Calculation rules** (messages, tokens, active time, projects) are described in the README under *How it counts*. Don't change them without discussing it first: people compare these numbers with other tools.
- **Every user-facing text goes in both languages**: add it to the `T` dictionary in `index.html` (`t('key')`, plurals with `pl(n, 'key')`, fixed HTML text with `data-i18n`), and tray menu texts to `M` in `widget/main.js`. In English, use the names of the original panel (Overview, Sessions, Total tokens, All / 30d / 7d).
- **Privacy:** never read message text or credentials, and never send data anywhere. The server only listens on `127.0.0.1`.
- **Old history:** days saved by older versions may lack `minutes`, `projects`, `hours` or `models`. Treat missing fields as 0 / empty.
- **Windows launchers** (`.vbs`, `.bat`) must keep CRLF line endings, and the `.vbs` files must stay in ANSI / Windows-1252 (VBScript can't read UTF-8). `.gitattributes` keeps git from changing them.
- Code comments are in Spanish; English comments are fine too.

## Pull requests
- Keep each pull request focused on one change.
- Update `README.md` and `LEEME.md` if the change is visible to users, and add a line to `CHANGELOG.md` under **Unreleased**.
- Add a screenshot for visual changes.

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE), and to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
