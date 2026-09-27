# Opening Detection and Explorer (#28) — Design

Date: 2026-09-27. Issue: [#28](https://github.com/LabinatorSolutions/boldchess-web-app/issues/28).
Follow-up that depends on it: #21 (game analysis report, "Book" category).

## Goal

Name the opening of the position on the board as moves are played or browsed. Show the book
moves that continue from here, and let the user play a named line or a continuation with one
click. The same book answers "is this a book position?" for #21.

Success criteria (from the issue's acceptance list):

- The name updates on every position change: a move, a step through the history, or a loaded
  game.
- Names are correct across transpositions.
- Clicking the name plays its move sequence; clicking a continuation plays that move.
- The UI says clearly when the book is loading, unavailable, out of book, or has no match.

## Decisions (settled with the owner)

- **Data:** [lichess-org/chess-openings](https://github.com/lichess-org/chess-openings), CC0
  1.0, about 3,700 named lines. Vendored at upstream commit
  `c67912be581f0793dbaa776be5ccf111e01f88d9` (2026-09-20). The 216-opening file attached to the
  issue is not used.
- **Display:** a new Opening window, plus one line under the board header.
- **Click action:** plays the line as a variation (the existing `history2` snapshot), so Revert
  restores the game. Analysis mode only; in games (modes 2–4) entries are display-only.
- **Matching:** by position, not by move order. The book ships as lines and is indexed in the
  browser (the approach "ship lines, index at runtime").

## Data pipeline

```text
data/chess-openings/{a,b,c,d,e}.tsv  (vendored, upstream format: eco<TAB>name<TAB>pgn)
data/chess-openings/COPYING.txt      (upstream CC0 text)
data/chess-openings/SOURCE           (upstream repo URL + commit SHA)
        │  scripts/build-openings.mjs  (bun run build:openings)
        ▼
public/data/openings.json            (generated, committed, never hand-edited)
```

- `scripts/build-openings.mjs` is an ES module (the chess modules are ES modules, so `.mjs`
  lets Node import them directly). For each TSV row it replays the PGN from `START` with
  `parseMove` / `doMove` from `public/src/chess/`, and emits the moves in UCI-style
  from-to(+promotion) notation.
- A row whose PGN does not parse, or has an illegal or ambiguous move, fails the build with
  the file, line number and move. It is never silently skipped.
- Output shape: a JSON array of `[eco, name, "e2e4 e7e5 g1f3"]`, one entry per TSV row in
  file order, with no whitespace padding. Expected size: about 250 KB raw, about 60 KB
  gzipped (`compression` is already on in `server.js`; Netlify gzips JSON).
- `--check` rebuilds in memory and exits non-zero if the result differs from the committed
  file. `bun run ci` runs it next to the header drift check.
- Caching: the file is served by `express.static` / Netlify defaults (revalidated by ETag).
  It is not added to `pathHeaders()`; unlike `/engine/`, its name is not versioned.
- CSP: same-origin `fetch`, already allowed by `connect-src 'self'`. No policy change.

## Runtime modules

### `public/src/openings/book.js` (no DOM)

It must stay importable under `bun test`, like `chess/` and `eval/`.

- `positionKey(fen)`: the FEN's first four fields (placement, side, castling, en passant).
  The en passant field is normalized by the round trip through `parseFEN` / `generateFEN`
  that `parseFEN` already applies (it drops impossible en passant squares). The move
  counters are dropped, so the same position reached by different move orders or at
  different move numbers gets the same key.
- `buildBook(lines)`: replays each line from `START` and returns
  `Map<key, { eco, name, lineIndex, next: Map<moveString, childKey> }>`.
  - Every position on every line becomes a node.
  - `eco` / `name` / `lineIndex` are set only on the position a line ends at.
  - When two lines end at the same position, the first in file order wins. Upstream's
    convention is that the shortest line owns the name.
- `openingAt(book, entries, index)`: walks `entries` (the `state.history` shape) backward
  from `index`. It returns the first named node as `{ eco, name, lineIndex, plyIndex,
  inBook }`, or null. `inBook` is whether the entry at `index` itself is a book node.
- `continuations(book, fen)`: for each `next` move of the current node returns `{ move, san,
  name, eco, lineCount }`.
  - `name`/`eco`: the child position's own name if it has one; otherwise the name of the
    shortest named line through that move (fewest plies, ties broken by file order).
  - `lineCount` is the number of named lines whose moves pass through that move.
  - Sorted by `lineCount` descending, then SAN.
  - This count measures how established a move is in the named book. It is not popularity:
    the data has no game counts.
- `isBookPosition(book, fen)`: `book.has(positionKey(fen))`. This is the #21 entry point.
- `loadBook()`: fetches `data/openings.json` once, builds the index, and caches the promise.
  It resolves to the book, or to null on any fetch, parse or build failure. It never throws
  and never logs to the console, so the smoke test's console-error check stays meaningful.
- `getBook()`: the resolved book, or undefined while loading, or null when unavailable.

### `public/src/ui/opening-view.js`

- `refreshOpening()` is called from `updateInfo()` in `ui/board.js`, the one place every
  position change already reaches.
- If the book has not loaded yet, it renders "Loading opening book…" and re-renders once
  `loadBook()` settles.
- Controls are built with `makeButton()` from `ui/dom.js`. No `style=` attributes; styling is
  by class in `styles.css`.

## UI

### Opening window

- Markup: `<div class="box" id="wOpening" hidden>` in `public/index.html`, after `wStatic`.
  It has a `boxTop` titled "Opening" and a `boxMid` body. `setupBoxes()` adds the window-bar
  button, the close icon and dragging automatically.
- Name registration: `Opening: "Opening explorer"` in `PANEL_NAMES` (`ui/panels.js`).
- Icon: an `.iconOpening` rule in `styles.css`. It is an inline SVG data URI in the same
  13×13, white-stroke style as `.iconStatic` / `.iconEdit`.
- Body states:
  - **Named, in book:** `C65 Ruy Lopez: Berlin Defense`. The ECO code is dimmed and the name
    is a button.
  - **Named, out of book:** the last name, dimmed, and below it `Out of book after 7…Nd4`,
    where the move is the first history move after the last book position.
  - **No match:** `No opening` (a custom FEN, or moves that never reached a named position).
  - **Loading:** `Loading opening book…`.
  - **Unavailable:** `Opening book unavailable`.
- Continuations: a list under the name, shown only when the current position is in book.
  One row per `continuations()` entry, laid out as `SAN · name · lineCount`, with the full
  name and ECO in the row's tooltip.
- Clicks, in analysis mode (`state.gameMode === 1`) only:
  - **Name:** goes to history index 0 and plays the named line's moves through
    `historyAdd(fen, null, move, san)`. That snapshots the game into `state.history2`, so
    Revert restores it.
  - **Continuation row:** plays that one move from the current position the same way.
  - In modes 2–4 the name and rows render as plain text, not buttons.

### Board header line

Amended while planning. The header bar (`.boxTop`) is absolutely positioned, and the search box
sits at a fixed `top: 24px`, so a separate line would move the board. The name is therefore a
segment inside the existing bar:

- Markup: `#positionInfo` holds `<span id="positionText">` (written by `updateInfo()`) and
  `<span id="openingInfo">`.
- It reads `Position: 6 of 6 - Last Move: 3. Bb5 · C60 Ruy Lopez`, cut by the bar's
  existing ellipsis, with the full name in `title`.
- It is empty at the start position, when there is no match, and while the book is loading
  or unavailable.
- It is hidden on mobile together with `#positionInfo` (`ui/layout.js`).
- Out of book, it keeps the most recent name, dimmed (`.outOfBook`). It is not clickable.

## Error handling

- Book fetch or parse failure: the window shows "Opening book unavailable" and the header is
  empty. Nothing else changes, no retry within the session, no console output.
- A history entry with an unparseable FEN cannot occur (history FENs come from
  `generateFEN`). `positionKey` still guards with `parseFEN` and treats a failure as "not in
  book".
- A click during a game is a no-op, because the elements are not buttons in modes 2–4.

## Testing

- `tests/openings.test.js` (unit, no DOM), against a small hand-written fixture of lines plus
  the real `public/data/openings.json`:
  - A transposition resolves to the same name: `1.d4 Nf6 2.c4 e6` and `1.c4 e6 2.d4 Nf6`.
  - Walk-back returns the last named position and `inBook: false` after leaving book.
  - A custom FEN returns null.
  - Continuations are ordered by `lineCount` and carry the next name.
  - `isBookPosition` is true for the start position and after `1.e4`, false for a legal position
    the test first asserts is absent from the real data.
  - Against the real data, `1.e4 e5 2.Nf3 Nc6 3.Bb5` names "Ruy Lopez".
- Build test: `scripts/build-openings.mjs --check` passes (run in `bun run ci`), and every
  line replays legally (asserted in the unit test by building the full book).
- `tests/module-graph.test.js`: already imports the `main.js` graph, so the new modules are
  covered.
- `tests/dom-stub.js`: add whatever the view needs (for example `fetch` stubbed to the real
  JSON file) so unit tests of `main.js` keep passing.
- `scripts/browser-smoke.js` (runs before the final "no console errors" check):
  - Load `1.e4 e5 2.Nf3 Nc6 3.Bb5`; `#openingInfo` contains "Ruy Lopez".
  - Open the Opening window from the window bar; it lists continuations.
  - Click the first continuation; the history grows by one ply and Revert is enabled.
  - Click Revert; the position returns to the one after 3.Bb5.

## Docs

- README: a feature bullet, plus the lichess CC0 attribution with the upstream link.
- CLAUDE.md: the `openings/` module in Architecture (no DOM, `isBookPosition` for #21), and the
  generated `public/data/openings.json` with its drift check, next to the security-header
  section's "never hand-edit" rule.

## Out of scope

- Game counts, win rates or any online explorer. No network calls beyond the one same-origin
  JSON fetch.
- Editing or extending the opening data in-app.
- #21's report: a separate spec, which consumes `isBookPosition`.
