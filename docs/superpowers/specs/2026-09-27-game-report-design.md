# Game Analysis Report (#21) — Design

Date: 2026-09-27. Issue: [#21](https://github.com/LabinatorSolutions/boldchess-web-app/issues/21).
Depends on: #28 (opening book, `isBookPosition`), shipped in `45b35e7`..`33b7ccc`.

## Goal

Grade every move of the game in the owner's 7 categories, show the totals per side in a Game
Report window, and mark the errors in the History window, so a player can review a finished
game (or one in progress) at a glance.

Categories (the owner's final list on the issue): Best Move, Excellent, Good, Book, Inaccuracy,
Mistake, Blunder. Brilliant, Great Move and Missed Win are out.

Success criteria:

- Every move reached by a move (not an edit or a FEN jump) gets exactly one category once both
  of its positions are evaluated.
- A move that throws away a won position is graded worse than one that loses the same number of
  pawns in a position that stays won.
- The report fills in while the background analysis runs and never needs a separate pass.
- History, the evaluation graph and the report agree: one measure, not two.

## Decisions (settled with the owner)

- **Grading:** by the drop in winning chances, not raw centipawns.
- **Display:** a Game Report window plus marks in the History window.
- **Source of evaluations:** the existing background loop. `analysis.js` already evaluates every
  history position to (analysis depth − 1) and stores `{score, depth, black, move}` on
  `state.history[i].evaluation`. No new engine pass and no new path to the engine.

## Grading (`public/src/report/grade.js`, no DOM)

The module must stay importable under `bun test`, like `chess/`, `eval/` and `openings/`.

### Win chance

- `winChance(cp)`: the win percentage for the side the score belongs to,
  `50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1)`. This is the logistic curve lichess
  publishes; the coefficient is theirs.
- Mate scores are stored as ±(1,000,000 − n) (`engine/uci.js`). Any |cp| ≥ 100,000 maps to
  exactly 100 or 0.
- `evaluation.score` is from the side to move's point of view (the graph flips it with `black`).
  Let `Wbefore` be the mover's chance at entry `i − 1` (they are to move there), and `Wafter` the
  mover's chance at entry `i` (the opponent is to move, so it is `100 − winChance(score_i)`).
- `loss = max(0, Wbefore − Wafter)`.

### Categories

`gradeMove(history, i, book)` returns `{category, loss}` or null. The first rule that matches
wins:

1. **Null (ungraded):** `i === 0`, or `history[i].move == null` (a board edit, a FEN jump, a
   null move).
2. **Book:** needs no evaluation. It matches when `book` is loaded and entries `0..i` all
   satisfy `isBookPosition(book, fen)`, with entries `1..i` all reached by a move. Once a move
   leaves book, later moves are never Book, even on a transposition back into book.
3. **Null (not yet evaluated):** the score of entry `i − 1` or entry `i` is missing. The
   exception is a move that gives checkmate (rule 4), which needs no score after it.
4. **Best Move:** the played move (`from`/`to`/promotion) equals `history[i − 1].evaluation.move`,
   or the move gives checkmate.
   "Gives checkmate" means the side to move at entry `i` has no legal move and is in check.
5. **Excellent:** `loss < 2`.
6. **Good:** `loss < 5`.
7. **Inaccuracy:** `loss < 10`.
8. **Mistake:** `loss < 20`.
9. **Blunder:** otherwise.

- The thresholds are named, exported constants (`THRESHOLDS = {excellent: 2, good: 5,
  inaccuracy: 10, mistake: 20}`), in points of win percentage. These values are the design's
  proposal; tuning them later is a one-line change covered by the boundary tests.
- `gradeGame(history, book) -> Array<{category, loss}|null>` has one slot per history entry.
  Slot 0 is always null.
- `summarize(grades, history) -> {white: Record<category, number>, black: …, graded, total}`.
  `total` counts the moves that can be graded (entries with a move); `graded` counts the
  non-null grades. The mover's color is taken from entry `i − 1`'s side to move.
- Grades are derived, never stored. They are recomputed from the history on each render, so a
  deeper evaluation arriving later updates them.

## Display

### History marks (`ui/board.js`, the History block of `updateInfo()`)

- After an Inaccuracy, Mistake or Blunder's SAN, append a `span.grade` with `?!`, `?` or `??`,
  classed `inaccuracy`, `mistake` or `blunder`.
- Every graded move gets `title="<Category> (−<loss rounded to 1 decimal>%)"`. Book and Best
  Move show no loss: `title="Book"`, `title="Best Move"`.
- The existing colored dotted underline (`getGraphPointColor`, pawn-loss thresholds 1.0 and 3.0)
  is replaced by the grade:
  - no color for Best Move, Excellent, Good, Book and ungraded moves;
  - `#bb8800` for an Inaccuracy;
  - `#d06000` for a Mistake;
  - `#bb0000` for a Blunder.

### Evaluation graph (`ui/graph.js`)

- `getGraphPointColor(i)` uses the same grade colors, with `#008800` for a move that is graded
  but not an error, as today.
- An ungraded point uses the current pawn-loss fallback, so points keep a color while analysis
  is still running.

### Game Report window (`ui/report-view.js`)

- Markup: `<div class="box" id="wReport" hidden>` after `wOpening`, containing `boxTop`
  "Game Report" and `<div id="report" class="boxMid">`. Inside it:
  - `#reportStatus`
  - `#reportTable`
  - `#reportErrors`
- Registration: `PANEL_NAMES.Report = "Game report"` in `ui/panels.js`, and `"wReport"` in
  `main.js`'s hidden-panel loop.
- Icon: `.iconReport`, a feather "clipboard" (clipboard with a check mark), 13×13, white stroke,
  in the same style as `.iconOpening`.
- `#reportStatus`:
  - `Analyzing… <graded> of <total> moves graded` while `graded < total`;
  - `No moves to grade` when `total === 0`;
  - empty otherwise (`:empty` hides it).
- `#reportTable`: a header row (blank, `White`, `Black`), then one row per category in this
  order: Best Move, Excellent, Good, Book, Inaccuracy, Mistake, Blunder. Each row holds the
  category's two counts. The last three rows carry their category class for color.
- `#reportErrors`: one row per Inaccuracy, Mistake or Blunder, in game order, reading
  `12. Qxb7?? Blunder (−34.5%)`, where the move number and dots come from entry `i − 1`.
  - Each row is a `makeButton` that jumps with `historyMove(i - state.historyindex)`.
  - Works in every mode: jumping in the history is already allowed in games.
- The report reads the mainline. While a variation is shown, it grades `state.history` as is.
  Revert returns the mainline; no special case.

### Refresh

- `refreshReport()` is called from `updateInfo()` next to `refreshOpening()`.
- Like the Opening window, it skips the rebuild when nothing it shows has changed. Its
  signature is: the book state, `state.historyindex`, and each entry's `fen`,
  `evaluation.score`, `evaluation.depth` and move.
- The History marks are part of the existing History rebuild and need no extra guard.

## Error handling

- Book not loaded or unavailable: rule 2 never matches, and moves are graded by the engine
  alone. When the book arrives, `refreshOpening`'s load callback already re-renders; the report
  signature includes the book state, so it re-renders too.
- A position the engine was never given (`checkPosition` rejects it; `addHistoryEval` stores a
  null score) stays ungraded. It counts toward `total`, so the status never claims completion
  falsely.
- Stalemate after a move: the score is 0, which grades normally.

## Testing

- `tests/report.test.js` (unit, no DOM), on hand-built history entries:
  - The `winChance` curve: `winChance(0) === 50`, symmetric, and mate maps to 100 and 0.
  - Each category boundary: loss exactly 2, 5, 10 and 20 falls into the worse category.
  - Best Move by an equal move, and by checkmate with no score after it.
  - Book only while the whole prefix is Book, using a real `buildBook` of
    `public/data/openings.json`.
  - Null for a missing score, for a move-less entry, and for `i === 0`.
  - A won position (+900 cp) losing 300 cp grades better than an equal position (0 cp) losing
    300 cp.
  - `summarize` counts per side, plus `graded` and `total`.
- `tests/report-view.test.js` (dom stub): given a loaded game with evaluations set on the
  history entries by hand, check the status text, the table counts, the error rows (and a click
  jumps), and that an unchanged render keeps the same row elements.
- History marks: a unit-level check that `updateInfo()` adds `span.grade` with `??` after a
  Blunder, done through the dom stub.
- `scripts/browser-smoke.js`:
  - Load `1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6`. 3...Nf6?? allows 4.Qxf7#, so the position after it
    scores as a mate for White and Black's move loses about 50 points of win chance.
  - Wait for the evaluations, then assert the `??` mark in `#history` and a Blunder count of at
    least 1 for Black in `#reportTable`.
  - It runs before the final "no console errors" check.

## Docs

- README: a feature bullet, and "Game Report" in "Available Windows".
- CLAUDE.md: the `report/` module (no DOM, derived grades, thresholds as constants), and the
  note that History and the graph color by grade.

## Out of scope

- An accuracy percentage, per-move engine explanations, and exporting the report.
- Brilliant, Great Move and Missed Win (removed by the owner).
- A dedicated fixed-depth analysis pass.
