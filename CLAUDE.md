# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

BoldChess Web App: a browser GUI for Stockfish 19 (WASM, in a Web Worker). The client is vanilla ES
modules served directly from `public/` (no bundler, no transpiler). A small Express 5 server
(`server.js`) serves those files and adds the security headers.

## Git

The owner permanently allows committing and pushing to this repo (`origin/master`), overriding
the global never-commit rule. Keep messages brief (a short subject; a body only when it adds
something), and never add yourself or any agent name as author, co-author or contributor: no
`Co-Authored-By` lines and no session trailers.

## Commands

Bun is both the package manager and the test runner. `server.js` and `scripts/*.js` are CommonJS
and run under Node.

```bash
bun install
bun start                    # http://localhost:3000 (PORT from .env)
bun run ci                   # the full gate: header-drift check + biome ci + tsc + bun test
bun run typecheck            # tsc --checkJs over the client (jsconfig.json); nothing is emitted
bun test                     # all tests
bun test tests/history.test.js           # one file
bun test -t "perft"                      # tests whose name matches a pattern
bun run test:deep            # adds the slow depth-4 perft (~12s)
bun run test:update          # regenerate tests/__snapshots__/static-eval.json (review the diff)
bun run lint / lint:fix / format         # Biome: tabs, double quotes
CHROME=/usr/bin/chromium bun run smoke   # headless-Chromium load; fails on any console error
bun run build                # regenerate public/_headers and vercel.json from security-headers.js
bun run build:openings       # regenerate public/data/openings.json from data/chess-openings/*.tsv
```

The repo has no GitHub Actions workflows. "CI" means running `bun run ci` locally. Run
`bun run smoke` too for any change that touches the browser UI, the CSP, or the engine.

## Architecture

- **`public/main.js` is only the entry point.** It wires DOM events to modules at startup. Logic
  lives in `public/src/`: `chess/` (FEN, move generation, SAN, draws), `eval/` (classical static
  eval), `engine/` (UCI worker wrapper, engine lifecycle, analysis loop), `game/`, `ui/`, `input/`,
  plus `commands.js` (the text box: FEN/PGN/SAN input, keyword commands, the shareable `~` game
  string).
- **Types come from JSDoc, checked by `tsc` (`jsconfig.json`), with no build step.** The check
  covers `public/main.js` and `public/src/` in full `strict` mode: every parameter needs a JSDoc
  type, a caught error is `unknown` (narrow with `instanceof Error`), `null`/`undefined` must be
  handled, and shared shapes (`Position`, `Move`, `HistoryEntry`, `Engine`) are `@typedef`s in the
  module that owns them, imported with `import("...").Name`. Look up the page's own elements with
  `byId()` from `ui/dom.js`, which types the result non-null (it is only a cast). For a narrower
  type, or `.children`, cast instead:
  `/** @type {HTMLInputElement} */ (document.getElementById("searchInput"))`. A null-check fix
  must not change behavior: JS arithmetic reads `null` as 0, so `x < null` becomes
  `x < (y ?? 0)`, not an early return. Values the app
  stores on DOM nodes (`tooltip`, `index`, ...) are declared in `types/globals.d.ts`; add new ones
  there. Event handlers use arrow functions over the element variable, not `this`.
- **`chess/`, `eval/`, `openings/`, `report/` and `engine/uci.js` must not touch the DOM.** That keeps them importable under
  `bun test`. For the same reason, `doMove` gets its default promotion piece from a provider that
  the app installs at startup instead of reading the toolbar.
- **Shared mutable state lives on the `state` object in `src/state.js`**, not in module-level
  `let`s, because ES module exports are read-only live bindings. Each `state.history` entry comes
  from `historyEntry(fen, evaluation, move, san)`; the analysis loop fills in `evaluation` later.
- **Two engines** (`engine/engines.js`): the analysis engine starts at boot. The strength-limited
  play engine (`UCI_LimitStrength` + `UCI_Elo`) starts lazily, on the first play mode. Each is a
  separate worker from `public/engine/stockfish-19-lite.js`. When you upgrade Stockfish, update
  the path in `engine/uci.js`, the fetches in `tests/server.test.js`, and the README badge. The
  `/engine/` files are cached as immutable for a year, so a new build needs a new file name.
- **Stockfish 19 kills its worker on a malformed FEN** (an en passant square on the wrong rank,
  a missing king) and the engine stays dead for the session. `parseFEN` drops impossible en
  passant squares, `engine.eval` round-trips every FEN through it, and the play engine skips
  positions `checkPosition` rejects. Keep any new path to the engine behind the same guards.
- **Play mode**: `state.play` is the side the *engine* plays (0 = Black, 1 = White) or null.
  `pos.w` is a boolean. Never compare them with `===` directly. A blanket `==`→`===` pass in
  `53651da` broke the turn guard this way, so check the operand types before "fixing" any
  remaining loose-looking comparison.
- **Pre-moves** (`game/premove.js`, no DOM): on the engine's turn in modes 2-3, `doMoveHandler`
  queues the player's move as `state.premove = {move, fen}` instead of refusing it. Targets are the
  piece's pattern with nothing in the way (a recapture lands on the player's own square).
  `doComputerMove` calls `playPremove` one frame after its `showBoard`, because `doMoveHandler`
  needs the rebuilt `state.curmoves`; it plays only if legal and only from the `fen` it was
  entered in. `historyMove`, the mode switches, right-click and Escape clear it.
- **Controls**: controls in `index.html` are `<button type="button">`, with a CSS reset that makes
  them lay out like the divs they replaced. Controls built in script go through `makeButton()` in
  `ui/dom.js`, which adds the role, the name and Enter/Space activation.
- **Opening book** (`openings/book.js`, no DOM): lines are indexed by position key (FEN without
  move counters; the en passant square only when a capture is legal), so transpositions find the
  same name. `isBookPosition(book, fen)` is the entry point for #21's "Book" category.
  `loadBook()` fetches `data/openings.json` once at startup and never throws or logs; tests
  install a book with `useBook()` because `bun test` shares one module registry across files.
  `ui/opening-view.js` renders the Opening window and the `#openingInfo` segment of the board
  header from `updateInfo()`; clicks play lines as a revertable variation in analysis only.
- **Game report** (`report/grade.js`, no DOM): grades each move by the drop in the mover's
  winning chance (lichess's logistic curve) from the background evaluations already on
  `state.history`, with no engine pass of its own. Grades are derived on every render and never
  stored; the thresholds are the exported `THRESHOLDS`. History marks, the graph points and the
  last-move arrow all color by the grade (one measure). `ui/report-view.js` renders the Game
  Report window from `updateInfo()` and, like the Opening window, skips unchanged renders.
  An error row opens the position before the move with the played and the engine's move drawn
  in `#arrowWrapper4` (`state.reviewMove`, `reviewArrows()` in `ui/arrows.js`).
- **Classical static eval**: `eval/terms-data.js` holds ~1600 lines of term sources as strings
  that call each other by name (`$pawns(pos)`). `eval/terms.js` compiles them into one generated
  scope, so no globals are created. The evaluation is pinned by the snapshot test, so any
  coefficient change shows up as a snapshot diff.

## Security headers (single source of truth)

`security-headers.js` is the only file to edit by hand (site-wide `securityHeaders()` plus
per-path `pathHeaders()`). `server.js` imports it directly.
`public/_headers` (Netlify), the `headers` block of `vercel.json` and
`netlify/edge-functions/csp-nonce/headers.js` are generated by `bun run build`, and
`generate-headers.js --check` fails `bun run ci` if they drift. Never hand-edit the generated
files.

On Netlify the page itself (`/`, `/index.html`) goes through the `csp-nonce` edge function,
which sets every security header and adds a fresh `'nonce-…'` to `script-src` per response.
Netlify does not apply `_headers` to edge-function responses, so the function must set them all.
Cloudflare's proxy copies that nonce onto the bot "JavaScript Detections" script it injects; the
Web Analytics beacon it injects is allowed by host (`https://static.cloudflareinsights.com`).

`public/data/openings.json` is generated the same way: `bun run build:openings` replays every line
in `data/chess-openings/*.tsv` (lichess-org/chess-openings, CC0, commit in `SOURCE`) with the
app's move parser, and `build-openings.mjs --check` fails `bun run ci` on drift. To update the
data, replace the TSVs and `SOURCE`, then rebuild. Never hand-edit the JSON.

Stockfish's multithreaded WASM needs cross-origin isolation (COOP `same-origin` + COEP
`require-corp`) for `SharedArrayBuffer`, plus `'unsafe-eval'` and `blob:` in
`script-src`/`worker-src`/`connect-src`. Neither `script-src` nor `style-src` has
`'unsafe-inline'`: the page has no inline scripts and no `style=` attributes. Keep it that way.
Setting styles from JavaScript still works. README prose about the CSP is not checked for drift,
so update it by hand when the policy changes.

## Tests

- `tests/harness.js` is the only file that knows how the client code is packaged. `loadChessCore()`
  merges the pure modules, and `perft()` is the move-generation correctness check.
- DOM-touching modules (`commands.js`, the full `main.js` graph) are tested through
  `tests/dom-stub.js`. Its `requestAnimationFrame` never fires its callback, so rendering is skipped
  while state changes still happen. Assert on state, the current FEN and history, not on rendered
  output.
- `tests/module-graph.test.js` imports `main.js` under the stub to catch missing imports and
  module-level throws, which would otherwise only show up in the browser console.
- `bun run smoke` also asserts the engine evaluates (at start and after stepping back through a
  loaded game) and that the controls work from the keyboard. Its "no console errors" check is
  what catches a crashed Stockfish worker; keep it last. It holds `data/openings.json` from the
  first load (CDP `Fetch`) until the late-book check releases it and disables `Fetch`, so checks
  before that one run without the book and later reloads fetch it normally.
- Draws apply only to games (menu modes 2-4), and end them at once with no claim, as online play
  does: threefold repetition, 50 moves or insufficient material (`gameDrawReason` in
  `game/position.js`). In analysis (mode 1) a draw is meaningless, so the engine keeps
  evaluating; only checkmate and stalemate end a position there.
- `server.test.js` imports the Express app (`server.js` only listens when run directly). The
  per-IP rate limit (`RATE_LIMIT_MAX`, default 1000 per 15 min) must stay far above the ~40
  requests one page load makes; a test fires 150 requests to guard that.
