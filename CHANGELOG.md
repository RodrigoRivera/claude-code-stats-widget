# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

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

[Unreleased]: https://github.com/RodrigoRivera/claude-code-stats-widget/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/RodrigoRivera/claude-code-stats-widget/releases/tag/v1.0.0
