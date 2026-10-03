# BoldChess Web App

![Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=flat&logo=bun&logoColor=white)
![Biome](https://img.shields.io/badge/Biome-60a5fa?style=flat&logo=biome&logoColor=white)
![Stockfish Chess Engine](https://img.shields.io/badge/Stockfish_Version-19-358853)
![Mobile Ready](https://img.shields.io/badge/Mobile_Ready-Yes-985b68)
![License](https://img.shields.io/badge/License-AGPL_v3-663366)

The official chess web-based app of [BoldChess.com](https://boldchess.com/).
It is a responsive web GUI for the Stockfish chess engine, offering analysis, evaluation, and graphical features.

---

## Mission

Our mission is to create a modern, mobile-friendly, free, and open-source web-based chess app, powered by the advanced Stockfish chess engine.

---

## Live Version

A free live version is at [web-app.boldchess.com](https://web-app.boldchess.com/). You can also run it locally; see the instructions below.

More free BoldChess tools, all in the browser: [play the computer](https://boldchess.com/play/computer/), [analyze a game](https://boldchess.com/analysis/), [solve tactics](https://boldchess.com/tactics/) and [explore openings](https://boldchess.com/openings/). For Android there is also the [BoldChess Trainer app](https://boldchess.com/go/app/) (human-picked puzzles and game analysis, a one-time purchase).

---

## Features

- Load your chess position or game using FEN, PGN, or a move list.
- Set up pieces manually in edit mode.
- Browse game history using arrows or the mouse wheel.
- List and display all legal moves on the chessboard.
- Analyze positions and legal moves using the JavaScript version of Stockfish.
- Display an evaluation graph with visual indicators for blunders.
- Open a position or game in a new window via a URL.
- Play against the Stockfish engine, with the ability to set its rating according to your preference.
- Pre-move while the engine thinks: move one of your pieces on its turn and the move plays as soon as it replies, if it is still legal. Right-click the board or press Escape to cancel it.
- Activate/Deactivate a special "Coach Mode" to view the best move and evaluation while playing.
- Customize the appearance of the chessboard.
- Draw arrows or highlight squares on the chessboard.
- Visualize relevant squares based on Stockfish's static evaluation.
- Name the opening as you play or browse (about 3,700 named lines, transpositions included), list the book moves from the current position, and play a named line or a book move as a variation.
- Review a game in the Game Report: every move graded (Best Move, Excellent, Good, Book, Inaccuracy, Mistake, Blunder) by how much winning chance it gave away, counted per side. Each error names the engine's better move, and one click shows the position before it with both moves drawn on the board. History marks errors with `?!`, `?` and `??`.
- Dark interface with a pitch-black background for OLED screens, improving battery life and user experience.
- Support for PCs, tablets, smartphones, and touch devices.

---

## Available Windows

- Chessboard
- All Moves With Evaluations
- History of Moves
- Evaluation Graph
- Static Evaluation
- Opening Explorer
- Game Report
- Chessboard Editor

---

## GUI Instructions

- To open your FEN or PGN, copy it to the clipboard and paste it into the input box above the chessboard.
- To browse the game, use the mouse wheel on the chessboard or the arrow buttons.
- To open or hide windows, click on the small icons at the top of the GUI.
- To play against the engine or set its difficulty level, click on the hamburger menu.
- To change the board styling, flip the board, or open it in a new window, click on the hamburger menu.

---

## Environment Variables

The application uses an optional `.env` file for configuration.

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | The port the server will listen on. | `3000` |
| `RATE_LIMIT_MAX` | Requests allowed per IP per 15 minutes. One page load is ~40 requests. | `1000` |
| `TRUST_PROXY` | Set behind a reverse proxy so each visitor is rate-limited on their own address: the number of proxy hops (usually `1`), or any Express `trust proxy` value. | unset |

---

## Installation & Running

This project uses [Bun](https://bun.sh/) for dependency management and as a runtime.

1. **Prerequisites**:
    - Ensure [Bun](https://bun.sh/) is installed on your system.

2. **Repository Setup**:
    - Clone the repository to your local machine.
    - Navigate to the project directory.

3. **Dependency Installation**:
    - Install the project dependencies:

        ```bash
        bun install
        ```

4. **Local Server**:
    - Start the local development server:

        ```bash
        bun start
        ```

    - Access the application at `http://localhost:3000` in a web browser.

---

## Architecture

The client is plain ES modules, served straight from `public/` with no bundler. `main.js` is only the
entry point: it wires the DOM to the modules at start up and does nothing else.

```text
public/
  main.js              start up and DOM wiring only
  src/
    config.js          engine depth limits, starting FEN
    state.js           mutable app state shared by the UI modules
    env.js             mobile detection
    commands.js        the command box: FEN/PGN loading and text commands
    chess/             fen.js, rules.js, notation.js, draws.js - no DOM access
    engine/            uci.js (worker wrapper), engines.js (lifecycle), analysis.js
    eval/              terms-data.js, terms.js, static-eval-list.js
    game/              position.js, history.js, premove.js (no DOM access)
    openings/          book.js - opening book index, no DOM access
    report/            grade.js - move grades for the game report, no DOM access
    ui/                board, moves, graph, menu, panels, arrows, tooltip, layout,
                       static-view, opening-view, report-view, dom helpers
  data/openings.json   generated by bun run build:openings - never hand-edit
    input/             mouse.js, keyboard.js
```

Two rules keep this workable:

- **`chess/`, `eval/`, `openings/`, `report/` and `engine/uci.js` never touch the DOM.** That is what makes them testable
  under `bun test`, and it is why `doMove` takes its default promotion piece from a provider the app
  installs at start up rather than reading it from the toolbar itself.
- **Shared mutable state lives on the `state` object**, not in module-level `let` bindings, because
  ES modules export read-only live bindings.

## Development

We use [Biome](https://biomejs.dev/) for linting and formatting.

- **Check for issues**:

    ```bash
    bun run lint
    ```

- **Fix issues**:

    ```bash
    bun run lint:fix
    ```

- **Format code**:

    ```bash
    bun run format
    ```

### Tests

The chess core is verified with [perft](https://www.chessprogramming.org/Perft) node counts, FEN and
SAN round-trips, and a snapshot of every classical evaluation term. `tests/harness.js` is the only
file that knows how the browser code is packaged, so the same suite keeps passing while `main.js` is
split into modules.

- **Run the suite**:

    ```bash
    bun test
    ```

- **Include the slow depth-4 perft** (~12s):

    ```bash
    bun run test:deep
    ```

- **Regenerate the evaluation snapshot** (review the diff before committing):

    ```bash
    bun run test:update
    ```

- **Browser smoke test** — loads the app in headless Chromium, drives the input handlers and fails
  on any console error. Needs a Chromium binary (`CHROME=/path/to/chromium` to point at one):

    ```bash
    bun run smoke
    ```

---

## HTTP Headers Setup

The app uses **Stockfish 19 JS**, which utilizes `SharedArrayBuffer` for multi-threaded performance.

To ensure the engine functions correctly, you must configure the following HTTP headers on your server:

### Required Headers

1. **Cross-Origin-Opener-Policy (COOP)**: Set to `same-origin`
2. **Cross-Origin-Embedder-Policy (COEP)**: Set to `require-corp`
3. **Content-Security-Policy (CSP)**: Must allow `blob:` URLs for the multi-part WASM architecture
    - `script-src 'self' 'unsafe-eval' blob: https://static.cloudflareinsights.com` (the last one is
      the Cloudflare Web Analytics beacon, injected by Cloudflare's proxy)
    - `connect-src 'self' blob:`
    - `worker-src 'self' blob:`

   `script-src` carries no `'unsafe-inline'` — the page has no inline `<script>` tags. Do not
   reintroduce it; the tightened policy is verified by `bun run smoke`. On Netlify, the
   `csp-nonce` edge function adds a per-response nonce to `script-src` for the page, so the
   inline bot-detection script Cloudflare's proxy injects can run.

### Why These Headers?

- **COOP/COEP**: These headers enable cross-origin isolation, which is required for `SharedArrayBuffer` to function. This allows Stockfish to use multiple threads for faster analysis.

### Where These Headers Live

All three deploy targets read from a single source, [`security-headers.js`](security-headers.js):

| Target  | File             | How it is produced                    |
| ------- | ---------------- | ------------------------------------- |
| Express | `server.js`      | imports `security-headers.js` directly |
| Netlify | `public/_headers` | generated by `bun run build`          |
| Vercel  | `vercel.json`    | generated by `bun run build`          |

Edit `security-headers.js`, run `bun run build`, and commit the regenerated files. CI fails if they
drift (`node scripts/generate-headers.js --check`).

The same file also holds per-path headers (`pathHeaders()`): the engine under `/engine/` is served
with a one-year immutable `Cache-Control`, because its file names carry the Stockfish version.
Give a replacement build a new file name rather than overwriting the old one.

Read more about `SharedArrayBuffer` at the [MDN documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer).

---

## Server and Deployment

The application is designed for easy deployment in any standard Node.js/Bun environment.

**Running the Server**: The main entry point is `server.js`, which serves the static files in the `public` directory, eliminating the need for a build process. This simplifies deployment and development.

**No Bundler**: The client is vanilla JavaScript served straight from `public/`, so there is no bundling or transpilation step. The `build` script only regenerates the deploy header files from `security-headers.js`; the app itself is ready to serve as-is.

---

## Contribution

We welcome all developers to contribute by adding features or fixing bugs.

---

## License

This project is licensed under the **GNU AFFERO GENERAL PUBLIC LICENSE (AGPLv3)**.

---

## Credits

- [Stockfish](https://github.com/mcostalba/Stockfish)
- [Stockfish.js](https://github.com/nmrugg/stockfish.js)
- Opening names: [lichess-org/chess-openings](https://github.com/lichess-org/chess-openings) (CC0 1.0), vendored in `data/chess-openings/`
- [BoldChess](https://boldchess.com/)
- [Labinator](https://labinator.com/)
