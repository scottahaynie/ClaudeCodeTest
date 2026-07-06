# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

This repo contains browser games. Tic-tac-toe is a self-contained single HTML file with no build step. UNO is a Vite + React + TypeScript webapp in `uno-app/`.

Games:

- `tic-tac-toe.html` — two-player tic-tac-toe on one device
- `uno-app/` — Uno vs a CPU opponent (retro 8-bit pixel style)

## Running a game

**Standalone HTML:** Open any game file directly in a browser (e.g. `open tic-tac-toe.html` on macOS). No dev server or build step.

**React UNO app:**

```bash
cd uno-app
npm install
npm run dev    # dev server (default http://localhost:5173)
npm run build  # production build to uno-app/dist/
```

## Architecture

Each game follows the same pattern: three inline sections in one file.

### tic-tac-toe.html

- **`<style>`**: Uses CSS custom properties (`--bg`, `--text`, `--accent-x`, `--accent-o`, etc.) defined in `:root` and overridden in an `@media (prefers-color-scheme: dark)` block, so light/dark theming stays centralized in one place rather than scattered across selectors.
- **Board markup**: The `.board` grid container starts empty in HTML and is populated entirely by JS (`render()`), not hand-authored — the 9 `.cell` buttons are generated dynamically from the `cells` array on every render.
- **`<script>`**: All game state is a few top-level `let`/`const` variables (`cells`, `current`, `gameOver`, `scores`) — there is no framework, module system, or state management library. Key functions:
  - `render()` rebuilds the board DOM from `cells` on every state change (full re-render, not diffed).
  - `checkWinner()` checks `WIN_LINES` (all 8 winning triples) against `cells`, returning a winner, a tie, or `null`.
  - `makeMove(i)` mutates state, advances turns, and re-renders; win highlighting is applied as a second pass after `render()` (adding the `.win` class to cells in the winning line), since `render()` wipes and recreates all cell elements.
  - Scores (`X`/`O`/tie counts) persist across rounds via `resetBoard()` but reset on a full page reload (no `localStorage`).

### uno-app/

Uno vs a CPU opponent with retro styling and the same rules as standard Uno.

- **Stack**: Vite, React 19, TypeScript. CSS in `src/styles/global.css` (retro NES-style palette, Press Start 2P font).
- **Game logic**: Pure modules in `src/game/` (`deck.ts`, `rules.ts`, `cpu.ts`) with immutable state updates.
- **State**: `useUnoGame` hook in `src/hooks/useUnoGame.ts` — holds game state, CPU/UNO grace timers, and player actions.
- **UI**: Declarative components in `src/components/` (`UnoGame`, `Card`, `HumanHand`, overlays, etc.).
- **Types**: `src/types/game.ts` — `Card`, `Player`, `GameState`, etc.

## Repo conventions

- Commits and pushes to the `origin` remote (private GitHub repo `scottahaynie/ClaudeCodeTest`) are manual-only — do not commit or push unless explicitly asked.
