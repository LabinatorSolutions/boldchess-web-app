# Game Analysis Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Grade every move by the drop in winning chances, show per-side totals and the error
list in a Game Report window, and mark errors in History, the graph and the last-move arrow.

**Architecture:**
- A DOM-free `report/grade.js` derives grades from `state.history` on every render. Grades are
  never stored.
- `ui/board.js` (History) and `ui/graph.js` (points; the last-move arrow in `ui/arrows.js`
  follows) switch from pawn loss to the grade.
- `ui/report-view.js` renders the window from `updateInfo()`, next to `refreshOpening()`, with
  the same skip-if-unchanged signature.

**Tech Stack:** Vanilla ES modules (no bundler), JSDoc + `tsc --checkJs`, Bun test, Biome,
headless-Chromium smoke (`scripts/browser-smoke.js`).

**Spec:** `docs/superpowers/specs/2026-09-27-game-report-design.md`

## Global Constraints

- **No DOM** in `public/src/report/grade.js`; it must import under `bun test`.
- **No new engine path:** grades read `state.history[i].evaluation` only.
- **No inline styles in markup, no inline scripts** (CSP). Setting `style.*` from JS is allowed,
  and History already does it for the underline.
- **Controls built in script** go through `makeButton()` (`ui/dom.js`).
- **Categories, verbatim and in this order:** `Best Move`, `Excellent`, `Good`, `Book`,
  `Inaccuracy`, `Mistake`, `Blunder`.
- **Thresholds** (win-% points lost, strict `<`): `THRESHOLDS = {excellent: 2, good: 5,
  inaccuracy: 10, mistake: 20}`.
- **Win chance:** `50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1)`. `|cp| >= 100000` maps
  to exactly 100 or 0.
- **Marks and colors:** Inaccuracy `?!` `#bb8800`; Mistake `?` `#d06000`; Blunder `??`
  `#bb0000`. A graph point that is graded but not an error uses `#008800`.
- **Copy, verbatim:** `Game Report` (box title), `Game report` (spoken panel name),
  `Analyzing… <graded> of <total> moves graded`, `No moves to grade`,
  `Engine analysis is off: <graded> of <total> moves graded` (amendment below),
  `<Category> (−<loss.toFixed(1)>%)`, `Book`, `Best Move`. The minus is U+2212.
- **Error row text:** `12. Qxb7?? Blunder (−34.5%)` for White, `12… Qxb7?? Blunder (−34.5%)` for
  Black (U+2026, matching the Opening window's `Out of book after 7… Nd4`). The number comes
  from entry `i − 1`'s FEN.
- **Panels re-rendered from `updateInfo()` skip unchanged renders** (it runs about 3× per
  position change while the engine deepens).
- **Commits:** short message, no `Co-Authored-By` or session trailers (project CLAUDE.md). Push
  after each task; `master` auto-deploys.

## Spec amendment (made while planning)

`evalAll()` returns early when `state.play != null && !state.coachMode` (modes 2 and 3 without
coach mode), so no history entry is evaluated during those games. The spec's
`Analyzing… n of m` would then never finish. When
`(state.play != null && !state.coachMode) || state.analysisEngine?.depth === 0`, and
`graded < total`, the status reads `Engine analysis is off: <graded> of <total> moves graded`
instead. Task 3 adds this to the spec's `#reportStatus` list.

## Review Focus

1. **Promotion moves against the engine's best move.** History moves store `p` as the player's
   letter (`"Q"`, `"N"`) or null, and `parseBestMove` gives `"NBRQ"[i]` or no `p`. A queen
   promotion must equal a best move whose `p` is absent, and an underpromotion must not. Test
   in Task 1.
2. **A history from a custom FEN, or with a FEN jump mid-game.** Move-less entries are
   ungraded, and nothing after a move-less entry is Book. Test in Task 1.
3. **Engine analysis off (modes 2/3, depth 0).** The status must not claim `Analyzing…`
   forever. Test in Task 3.
4. **Long games.** `gradeGame` is called on every History rebuild, graph repaint and report
   refresh. The Book prefix and the checkmate test must not make it quadratic. Test in Task 1
   (400 plies well under 100 ms).
5. **Deeper evaluations arriving later.** A changed `score` or `depth` must rebuild the report,
   while an unchanged one must not. Test in Task 3.

---

### Task 1: Grading module

**Files:**
- Create: `public/src/report/grade.js`
- Test: `tests/report.test.js`

**Interfaces:**
- Consumes: `isBookPosition(book, fen)` from `openings/book.js`; `parseFEN`, `genMoves`,
  `isWhiteCheck`, `colorflip` from `chess/`.
- Produces (all exported from `grade.js`):
  - `CATEGORIES: string[]`, the 7 names in the order above.
  - `THRESHOLDS`, as above.
  - `ERRORS: Record<"Inaccuracy"|"Mistake"|"Blunder", {mark: string, className: string,
    color: string}>`. Class names are `inaccuracy`, `mistake`, `blunder`.
  - `winChance(cp: number) -> number`
  - `categoryFor(loss: number) -> "Excellent"|"Good"|"Inaccuracy"|"Mistake"|"Blunder"`
  - `sameMove(a, b) -> boolean`: equal squares, and `(a.p ?? "Q").toUpperCase() ===
    (b.p ?? "Q").toUpperCase()`. A null promotion means a queen, as in `doMove`.
  - `gradeMove(history, i, book) -> {category: string, loss: number} | null`. `book` may be
    `undefined` or `null` (not loaded, unavailable). Book and Best Move grades carry `loss: 0`.
  - `gradeGame(history, book) -> Array<{category, loss} | null>`, one slot per entry.
  - `summarize(grades, history) -> {white: Record<string, number>, black: Record<string,
    number>, graded: number, total: number}`. Both records have every category, starting at 0.

- [ ] **Step 1: Write the failing tests** in `tests/report.test.js`. Build histories with a
  local `line(start, sans)` helper that replays SAN with `parseMove` / `doMove` /
  `generateFEN` / `sanMove` into `historyEntry(fen, null, move, san)` entries. Set
  evaluations by hand as `{score, depth: 10, black, move}`, with `score` from the side to
  move's point of view.
  - `winChance(0) === 50`; `winChance(300) + winChance(-300)` is 100 (`toBeCloseTo`);
    `winChance(999999) === 100`; `winChance(-999999) === 0`.
  - `categoryFor`: `1.99` → Excellent, `2` → Good, `5` → Inaccuracy, `10` → Mistake,
    `20` → Blunder.
  - `sameMove`: e7e8 with `p: null` equals e7e8 with no `p`; `p: "Q"` equals `p: "q"`;
    `p: "N"` does not equal no `p`.
  - Null for `i === 0`, for an entry with `move == null`, and for a missing score at `i − 1` or
    at `i`.
  - Best Move when the played move `sameMove`s `history[i − 1].evaluation.move`.
  - Best Move for `1.e4 e5 2.Qh5 Nc6 3.Bc4 Nf6 4.Qxf7#`, with entry 7 unevaluated and entry 6's
    best move set to something else (`book = null`).
  - A won position losing 300 cp (+900 before, −600 for the opponent after) is Inaccuracy; an
    equal one (0 → +300 for the opponent) is Blunder. The first loss is smaller.
  - Book, with `buildBook` of `public/data/openings.json`: every move of
    `1.e4 e5 2.Nf3 Nc6 3.Bb5` is Book with no evaluations set.
  - Book stops for good: `1.Nf3 Nf6 2.Ng1 Ng8`. First assert the preconditions
    `isBookPosition(book, h[3].fen) === false` and `isBookPosition(book, h[4].fen) === true`.
    Then, with evaluations set, entry 4 is not Book.
  - Custom start and FEN jump: a history whose entry 0 is a non-book FEN has no Book grade; an
    entry with `move: null` mid-game is null, and a later in-book move is not Book.
  - `summarize` on a hand-built grade array: per-side counts (the mover is the side to move at
    `i − 1`), `total` counts entries with a move, and `graded` counts non-null grades.
  - Performance: a 400-entry history (the `Nf3 Nf6 Ng1 Ng8` cycle, every entry evaluated) runs
    `gradeGame` with the real book in under 100 ms.
- [ ] **Step 2:** `bun test tests/report.test.js` → FAIL (module missing).
- [ ] **Step 3: Implement `grade.js`.** The rules are the spec's list, in order.
  - `gradeGame` computes the Book prefix once: the length of the leading run of entries that
    are in book, with entries `1..` reached by a move. It grades each entry against that.
    `gradeMove` computes the same prefix, stopping at `i`.
  - "Gives checkmate" runs the rules only when `history[i].san` ends in `+` or `#`. Every
    checking SAN from `sanMove` does. The test itself: the side to move at `i` has no legal
    move and is in check (`isWhiteCheck`, through `colorflip` for Black).
  - The mover's side is taken from the FEN's second field (`fen.split(" ")[1] === "w"`), which
    avoids a `parseFEN` per entry.
  - Types come from JSDoc. Import the `Book` typedef from `openings/book.js`.
- [ ] **Step 4:** `bun test tests/report.test.js` → PASS, then `bun run ci` → PASS.
- [ ] **Step 5: Commit and push:** `feat(report): grade moves by win-chance drop (#21)`

### Task 2: History marks and graph colors by grade

**Files:**
- Modify: `public/src/ui/board.js` (History block of `updateInfo()`)
- Modify: `public/src/ui/graph.js` (`getGraphPointColor`, the `repaintGraph` loop)
- Modify: `public/styles.css`: `.grade` (a small left margin, weight as the SAN) plus
  `.inaccuracy`, `.mistake` and `.blunder` color rules with the Global Constraints colors.
  Task 3 reuses them.
- Test: `tests/report-view.test.js` (new, dom stub)

**Interfaces:**
- Consumes: `gradeGame`, `ERRORS` (Task 1); `getBook()` from `openings/book.js`.
- Produces: `getGraphPointColor(i: number, grades = gradeGame(state.history, getBook()))
  -> string`. Loops pass one precomputed array. `arrows.js` keeps its one-argument call and
  gets the grade color for free.

- [ ] **Step 1: Write the failing tests** in `tests/report-view.test.js`. Set up like
  `tests/opening-view.test.js`: `installDomStub`, `useBook(buildBook(DATA))`, `gameMode = 1`,
  `command("reset")` in `beforeEach`. A shared helper loads `1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6`
  through `command` and sets evaluations: entry 5 `{score: -30, black: true}`, entry 6
  `{score: 999999, black: false}`, and the other entries 0, each with `depth: 10` and a `move`
  that differs from the played one.
  - Precondition: `isBookPosition(book, history[5].fen)` is true and `history[6].fen` is false.
  - After `updateInfo()`, `#history`'s text contains `Nf6??`. The Nf6 span has
    `style.borderBottomColor === "#bb0000"`, and its `title` starts with `Blunder (−`.
  - The `e4` span has `title === "Book"` and no underline color.
  - `getGraphPointColor(6)` is `#bb0000`. With all evaluations cleared, `getGraphPointColor`
    returns the old pawn-loss result for an ungraded point.
- [ ] **Step 2:** `bun test tests/report-view.test.js` → FAIL.
- [ ] **Step 3: Implement.**
  - History: compute `grades` once before the loop.
  - Every graded move gets a title: `<Category> (−x.x%)`, or `Book` / `Best Move`.
  - An error gets a child `span.grade.<className>` holding the mark, appended inside the
    SAN's `movelink` span so a click still lands on the move. It also gets
    `borderBottomColor = ERRORS[c].color`.
  - Nothing else is colored. `board.js` no longer imports `getGraphPointColor`.
  - Graph: a graded point uses the error color or `#008800`, and an ungraded point uses the
    existing pawn-loss expression unchanged.
- [ ] **Step 4:** `bun test` → PASS, `bun run ci` → PASS, and
  `CHROME=/usr/bin/chromium bun run smoke` → 27 ok.
- [ ] **Step 5: Commit and push:** `feat(report): History and graph color moves by grade (#21)`

### Task 3: Game Report window

**Files:**
- Create: `public/src/ui/report-view.js`
- Modify: `public/index.html`: after `#wOpening`, add `<div class="box" id="wReport" hidden>`
  with `<div class="boxTop">Game Report</div>` and `<div id="report" class="boxMid">`, which
  holds `#reportStatus`, `#reportTable` and `#reportErrors`.
- Modify: `public/styles.css`:
  - `#wReport` sized like `#wOpening`
  - `#report.boxMid` typography like `#opening.boxMid`
  - `#reportStatus` at 0.5 opacity, hidden on `:empty`
  - `.reportRow`: a flex row, with the label taking the free space and two right-aligned
    36px count columns; odd-row shading like `.openingMove`
  - `.reportError[role="button"]` with pointer and hover like `.openingMove`
  - `.iconReport`: feather `clipboard` plus a check-mark polyline, 13×13, white stroke, in the
    `.iconOpening` data-URI style
- Modify: `public/src/ui/panels.js`: `PANEL_NAMES.Report = "Game report"`.
- Modify: `public/main.js`: add `"wReport"` to the hidden-panel loop.
- Modify: `public/src/ui/board.js`: call `refreshReport()` right after `refreshOpening()`.
- Modify: `docs/superpowers/specs/2026-09-27-game-report-design.md`: the `#reportStatus`
  amendment above.
- Test: `tests/report-view.test.js`

**Interfaces:**
- Consumes: `gradeGame`, `summarize`, `CATEGORIES`, `ERRORS` (Task 1); `getBook`, `loadBook`,
  `moveToString`; `historyMove`; `makeButton`, `setElemText`.
- Produces: `refreshReport() -> void`.
  - `#reportTable` holds a header row, then one `div.reportRow` per category, in `CATEGORIES`
    order.
  - Each row has three `span` children: the label, the White count and the Black count.
  - The error categories' rows also carry the category class (`reportRow blunder`).
  - `#reportErrors` holds one `div.reportError` per error, in game order.

- [ ] **Step 1: Write the failing tests**, reusing Task 2's loaded game:
  - Status is empty when every move is graded. Clear entry 6's evaluation and the status is
    `Analyzing… 5 of 6 moves graded`. After `command("reset")` it is `No moves to grade`.
  - With `state.play = 0` and `state.coachMode = false`, and one move ungraded, the status is
    `Engine analysis is off: 5 of 6 moves graded`. Restore `state.play = null` afterward.
  - The Blunder row's Black count is `"1"`. The Book row reads White `"3"` (e4, Qh5, Bc4) and
    Black `"2"` (e5, Nc6). In lichess the line continues `3...Nh6`, the Mellon Gambit, so
    `3...Nf6` is the first non-book move.
  - One error row reads `3… Nf6?? Blunder (−` + the loss. Clicking it with `historyindex` at
    the end jumps to index 6.
  - A second `refreshReport()` with nothing changed keeps the same row element (`toBe`).
    Raising entry 6's `depth` rebuilds it (`not.toBe`).
- [ ] **Step 2:** `bun test tests/report-view.test.js` → FAIL.
- [ ] **Step 3: Implement `refreshReport()`.**
  - The signature is the book state (`loading`/`none`/`book`), `state.historyindex`, the
    analysis-off flag, and per entry `fen`, `evaluation?.score`, `evaluation?.depth` and
    `move && moveToString(move)`. Skip the render when it is unchanged.
  - While the book is `undefined`, call `loadBook().then(refreshReport)` once, behind a
    `waiting` flag as in `opening-view.js`, and grade without Book in the meantime.
  - Error rows use `makeButton(row, "Go to <text>")`, and their `onclick` calls
    `historyMove(i - state.historyindex)`.
- [ ] **Step 4:** `bun test` → PASS, then `bun run ci` → PASS. `/usr/bin/grep -c 'style=' public/index.html`
  is unchanged.
- [ ] **Step 5: Commit and push:** `feat(report): Game Report window (#21)`

### Task 4: Smoke check and docs

**Files:**
- Modify: `scripts/browser-smoke.js`
- Modify: `README.md` (a Features bullet; "Game Report" in Available Windows; `report/` in the
  architecture tree)
- Modify: `CLAUDE.md` (Architecture: `report/` has no DOM; grades are derived, never stored;
  thresholds are constants; History, the graph and the last-move arrow color by grade. Add
  `report/` to the no-DOM list.)

**Interfaces:**
- Consumes: `#wReport` / `wbReport`, `.reportRow.blunder`, `#history` (Tasks 2–3).

- [ ] **Step 1: Add the smoke block** after the opening block, and before the palette and
  focus checks. Use `element.click()` only.
  - Load `1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6` through `#searchInput` / `simpleSearch.onsubmit()`,
    then click `wbReport`.
  - Poll every 500 ms, up to 30 s, until `#reportStatus` is empty.
  - Read `#history`'s text and the third span of `#reportTable .reportRow.blunder`, then click
    `wbReport` again to close.
  - Add two checks: `"a blunder is marked in the history"` (text includes `??`), and
    `"the game report counts Black's blunder"` (count ≥ 1).
- [ ] **Step 2: Prove the checks bite.**
  - Temporarily make `refreshReport` return at once: the count check fails.
  - Temporarily drop the History mark: the `??` check fails.
  - Revert both. `CHROME=/usr/bin/chromium bun run smoke` → 29 ok, ending in
    `ok   no console errors`.
- [ ] **Step 3: Write the docs**, then run `bun run ci` → PASS.
- [ ] **Step 4: Commit and push:** `test(smoke): game report; docs for #21`
