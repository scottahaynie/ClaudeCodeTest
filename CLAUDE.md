# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

This repo is a single self-contained tic-tac-toe game: `tic-tac-toe.html`. There is no build system, package manager, bundler, test suite, or linter — HTML, CSS, and JavaScript all live inline in that one file.

## Running the game

Open `tic-tac-toe.html` directly in a browser (e.g. `open tic-tac-toe.html` on macOS). There is no dev server or build step.

## Architecture

Everything is in `tic-tac-toe.html`, structured in three inline sections:

- **`<style>`**: Uses CSS custom properties (`--bg`, `--text`, `--accent-x`, `--accent-o`, etc.) defined in `:root` and overridden in an `@media (prefers-color-scheme: dark)` block, so light/dark theming stays centralized in one place rather than scattered across selectors.
- **Board markup**: The `.board` grid container starts empty in HTML and is populated entirely by JS (`render()`), not hand-authored — the 9 `.cell` buttons are generated dynamically from the `cells` array on every render.
- **`<script>`**: All game state is a few top-level `let`/`const` variables (`cells`, `current`, `gameOver`, `scores`) — there is no framework, module system, or state management library. Key functions:
  - `render()` rebuilds the board DOM from `cells` on every state change (full re-render, not diffed).
  - `checkWinner()` checks `WIN_LINES` (all 8 winning triples) against `cells`, returning a winner, a tie, or `null`.
  - `makeMove(i)` mutates state, advances turns, and re-renders; win highlighting is applied as a second pass after `render()` (adding the `.win` class to cells in the winning line), since `render()` wipes and recreates all cell elements.
  - Scores (`X`/`O`/tie counts) persist across rounds via `resetBoard()` but reset on a full page reload (no `localStorage`).

## Repo conventions

- Commits and pushes to the `origin` remote (private GitHub repo `scottahaynie/ClaudeCodeTest`) are manual-only — do not commit or push unless explicitly asked.
