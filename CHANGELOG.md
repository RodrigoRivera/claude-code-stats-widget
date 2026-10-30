# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.2.0] - 2026-10-30

### Added
- **Several PCs, one view**: with a shared folder (by default `OneDrive\claude-stats`), each PC writes a summary of its history and reads the others'. `/api/stats` adds them up per day (tokens, messages, active time, hours, models and projects) without repeating sessions, and returns `devices`. Off until the folder exists.
- Panel: **All PCs / <PC>** selector (only with more than one PC), and the heatmap tooltip shows how much each PC contributed.
- `node server.js --sync` updates the history and this PC's summary, then exits; `Abrir Claude Stats.vbs /sync` runs it with no windows.
- `instalar-sync.ps1` registers that sync in Windows Task Scheduler (at sign-in and every hour); `-Quitar` removes it.
- `config.json` with `syncDir`, `deviceName` and a stable `deviceId`, so renaming a PC doesn't count it twice. OneDrive conflict copies are ignored.

## [1.1.0] - 2026-10-25

### Added
- **`Instalar Claude Stats.bat`**: one double-click installs the desktop widget, puts the **Claude Stats** icon on the desktop and opens the widget. Safe to run again (for example, after updating).
- `Crear acceso directo.vbs /escritorio` creates only the desktop icon, without questions (used by the installer).

### Changed
- README and LEEME: install in 4 simple steps (Node.js, download the release ZIP, run the installer, make it yours), plus everyday use, updating and troubleshooting.
- Repository tidied up: community guides and README screenshots moved into `.github/`, and the ZIP downloaded from GitHub no longer includes `.github/`, `.gitignore` or `.gitattributes` — only what you need to run it.

## [1.0.0] - 2026-10-25

First public release.

### Added
- **Overview panel** that replicates the usage card Claude Desktop removed from the Code tab's new-session screen (v2.42304.0): sessions, messages, total tokens, active days, peak hour, favorite model and a daily heatmap, with All / 30d / 7d filters.
- Heatmap extras: tooltip with tokens, date, active time and main project; click a day to see its projects; color by tokens or by active time.
- **Models** tab: tokens and responses per model.
- **Projects** tab: total active time, current and best streak, peak day and hour, and every project with its time, share, tokens and sessions, plus a 12-week mini heatmap per project.
- Project filter that recalculates every tab.
- **Own history** (`~/.claude/claude-stats/days.json`) so days survive Claude Code's log cleanup.
- **Desktop widget** (Electron): Overview / Projects / Total tabs, Today / 30d / All period selector, drag to move, resize from the corner, remembers position and size, tray menu with *Always on top* and *Start with Windows*. Starts the server by itself if needed.
- **English and Spanish** interface, following the system language, with a switch under the panel and in the tray menu.
- Windows launchers: open the widget (or the panel in Edge), stop everything, and create a desktop shortcut.
- Zero-dependency Node.js server that listens only on `127.0.0.1` and never reads credentials.

[Unreleased]: https://github.com/RodrigoRivera/claude-code-stats-widget/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/RodrigoRivera/claude-code-stats-widget/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/RodrigoRivera/claude-code-stats-widget/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/RodrigoRivera/claude-code-stats-widget/releases/tag/v1.0.0
