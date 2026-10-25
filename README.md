# Claude Stats

*[Español](LEEME.md)*

**The usage panel that Claude Desktop removed, back on your desktop — and it never forgets your old days.**

Claude Desktop used to show a usage card on the Code tab's new-session screen: sessions, messages, tokens, active days, peak hour, favorite model and a daily heatmap. It disappeared in Desktop v2.42304.0 ([anthropics/claude-code#102264](https://github.com/anthropics/claude-code/issues/102264)). Claude Stats brings it back as its own window and a small desktop widget, reading the same local Claude Code logs, and adds what the original never had: active time, streaks, per-project breakdowns and a history that survives log cleanup.

> **Unofficial project.** Not affiliated with, endorsed or sponsored by Anthropic. "Claude" and "Claude Code" are trademarks of Anthropic, PBC.

<p align="center">
  <img src="docs/panel-resumen.png" alt="Claude Stats panel: sessions, messages, total tokens, active days, peak hour, favorite model and a daily heatmap" width="640">
</p>

<p align="center">
  <img src="docs/widget-hoy.png" alt="Desktop widget, Overview tab: today's tokens, current streak, today's active time, a 16-week heatmap and the Today / 30d / All period selector" width="420">
  <img src="docs/widget-total.png" alt="Desktop widget, Total tab: all-time tokens since the first day, the Lord of the Rings comparison, active days, record day, sessions, messages and active time" width="420">
</p>

## Why another usage tool?
Most Claude usage tools track **plan limits** (the 5-hour and weekly quotas) and read your login token to do it. Claude Stats is about **your history**, and it never touches your credentials:

- **Looks like the original panel.** Same cards, same blue heatmap, same All / 30d / 7d filters.
- **Keeps its own history.** Claude Code deletes transcripts after 30 days by default. Claude Stats saves a daily summary, so old days stay on your heatmap.
- **Active time**, not just tokens: the time between consecutive messages of a session, ignoring breaks longer than 5 minutes.
- **Projects:** time, tokens and sessions per project, a mini heatmap for each, and a filter that recalculates every tab for one project.
- **Desktop widget** with tabs (Overview / Projects / Total), a Today / 30d / All period selector, tray icon, *Always on top* and *Start with Windows*.
- **English and Spanish.** It follows your system language; switch it under the panel or from the tray menu.
- **Private and light.** The server is plain Node.js with **zero dependencies**, listens only on `127.0.0.1`, makes no network requests, and only reads dates, folders, models and token counts — never your messages or credentials.

## What it shows
- **Overview**: sessions, messages, total tokens, active days, peak hour, favorite model and the daily heatmap, with the All / 30d / 7d filters. Hover a square for that day's tokens, active time and main project; click it to see that day's projects. Color the heatmap by tokens or by active time.
- **Models**: tokens and responses per model.
- **Projects**: total active time, current and best streak, peak day and hour, and every project with its time, share, tokens and sessions. Sort by time, tokens or sessions.
- **Widget**: a semi-transparent box with three tabs — tokens, streak, active time and a heatmap; your projects; and all-time totals (since your first day, with the Lord of the Rings comparison, active days and your record day). A period selector (Today / 30d / All) switches tokens, active time and projects between today, the last 30 days and all time, and dims the heatmap days outside it. Drag to move, drag the bottom-right corner to resize, click to open the full panel.

**Language:** English or Spanish. By default it follows your system language (Spanish for `es-*`, English otherwise). Change it with **Español · English** under the panel, or with **Language** in the widget's tray menu; the panel and the widget stay in sync. You can also force it in the address: `http://127.0.0.1:4747/?lang=en`.

## Requirements
- **Windows 10/11** (the launchers are `.vbs`/`.bat`; the server itself runs anywhere Node runs).
- **Node.js 18+**.
- **Claude Code** with some sessions in `%USERPROFILE%\.claude\projects`.

## Install and run
### 1. Download it
Put it in a folder you'll keep (the shortcut points there):

```bash
git clone https://github.com/RodrigoRivera/claude-code-stats-widget.git
cd claude-code-stats-widget
```

### 2. Install the desktop widget (optional, recommended)
Once. It downloads Electron (about 110 MB) into `widget/node_modules`:

```bash
cd widget
npm install
```

Without this step you still get the full panel, in its own Microsoft Edge window.

### 3. Create the shortcut
Double-click **`Crear acceso directo.vbs`**:

- It puts a **Claude Stats** shortcut with the app icon on your desktop. It opens the widget (or the panel, if the widget isn't installed).
- **Pin it to the taskbar:** right-click the shortcut → *Show more options* → *Pin to taskbar*. Pin this shortcut, not the Edge window: a pinned Edge window opens Edge directly and shows an error if the server isn't running.
- It asks whether Claude Stats should **start with Windows** (server only, no window). If you use the widget, it's simpler to tick **Start with Windows** in its tray menu instead: it opens the widget at sign-in, and the widget starts the server. Run the script again and answer *No* to undo it.
- Prefer doing it by hand? `Win + R` → `shell:startup` → add a shortcut to `Abrir Claude Stats.vbs` with ` /fondo` at the end of its target.

### 4. Open it
Double-click the **Claude Stats** shortcut (or **`Abrir Claude Stats.vbs`**). The widget starts the server by itself if it isn't running, using the Node.js that ships with Electron. Data refreshes every 60 seconds.

- Right-click the widget or the tray icon for: open full panel, show/hide widget, **Always on top**, **Start with Windows**, **Language** (Automatic / Español / English), refresh, quit.
- **`Cerrar Claude Stats.bat`** stops the widget and the server.
- Launcher options: `Abrir Claude Stats.vbs /panel` opens the panel in Edge without the widget; `/fondo` starts only the server.

**Without the launchers:** run `node server.js` and open <http://127.0.0.1:4747>.

## Where the data comes from
- Claude Code's local logs: `%USERPROFILE%\.claude\projects\**\*.jsonl`.
- Its own history: `%USERPROFILE%\.claude\claude-stats\days.json` (one summary per day).
- Widget position and settings: `%USERPROFILE%\.claude\claude-stats\widget.json`.
- For the greeting it reads only your account's `displayName` from `%USERPROFILE%\.claude.json`.

Nothing leaves your computer.

## How it counts
- **Message:** each `user` or `assistant` log line with a unique `uuid` (resumed sessions copy lines, so they are de-duplicated).
- **Tokens:** input + output + cache creation + cache read, de-duplicating responses by `message.id` + `requestId`. That's why totals are large.
- **Active time:** the sum of gaps between consecutive messages of the same session, ignoring gaps longer than 5 minutes.
- **Project:** the last folder of the session's first working directory. Names that differ only in case are merged.
- **Streak:** consecutive days with activity, ending today or yesterday.
- Dates and hours use your computer's local time.

## Options
| Environment variable | What it does |
|---|---|
| `CLAUDE_STATS_NAME` | Name in the greeting (defaults to your Claude account name) |
| `CLAUDE_STATS_PORT` | Server port (default `4747`) |
| `CLAUDE_CONFIG_DIR` | Claude Code config folder, if you moved it |

`node server.js --no-open` starts the server without opening a window. `GET /api/stats` returns the aggregated data as JSON (`?refresh=1` skips the 20-second cache).

## Project layout
- `server.js` — reads the logs, keeps the history and serves the page and the API. No dependencies.
- `index.html` — the whole interface (HTML + CSS + JS, no build step). `/?widget=1` is the compact widget view.
- `widget/` — the Electron desktop widget (`main.js`, `preload.js`). The only folder with an npm dependency (`electron`, pinned).
- `*.vbs` / `*.bat` — Windows launchers.

## Contributing
Bug reports, ideas and pull requests are welcome, in English or Spanish. See [CONTRIBUTING.md](CONTRIBUTING.md) to get started, the [Code of Conduct](CODE_OF_CONDUCT.md), and [SECURITY.md](SECURITY.md) to report a security problem privately. Changes are listed in the [CHANGELOG](CHANGELOG.md).

## License
[MIT](LICENSE).
