/**
 * Move grades for the game report, derived from the history's evaluations.
 *
 * A move is graded by how much of the mover's winning chance it gives away,
 * not by raw centipawns, so dropping 3 pawns in a position that stays won
 * costs less than dropping them from equality. Grades are never stored: they
 * are recomputed from `state.history` on each render, so a deeper evaluation
 * arriving later updates them. No DOM here, so `bun test` can import it.
 */

import { colorflip, parseFEN } from "../chess/fen.js";
import { genMoves, isWhiteCheck } from "../chess/rules.js";
import { isBookPosition } from "../openings/book.js";

/** @typedef {import("../openings/book.js").Book} Book */
/** @typedef {{category: string, loss: number}} Grade */

/** Every category, in the order the report lists them. */
export const CATEGORIES = [
	"Best Move",
	"Excellent",
	"Good",
	"Book",
	"Inaccuracy",
	"Mistake",
	"Blunder",
];

/** Upper bounds of the win-chance loss, in percentage points, exclusive. */
export const THRESHOLDS = {
	excellent: 2,
	good: 5,
	inaccuracy: 10,
	mistake: 20,
};

/** How the three error categories are marked in History and colored. */
export const ERRORS = {
	Inaccuracy: { mark: "?!", className: "inaccuracy", color: "#bb8800" },
	Mistake: { mark: "?", className: "mistake", color: "#d06000" },
	Blunder: { mark: "??", className: "blunder", color: "#bb0000" },
};

/** Scores at or beyond this are mates (stored as ±(1,000,000 − n)). */
const MATE = 100000;

/**
 * The winning chance, in percent, of the side the score belongs to. The
 * logistic curve and its coefficient are lichess's.
 *
 * @param {number} cp
 */
export function winChance(cp) {
	if (cp >= MATE) return 100;
	if (cp <= -MATE) return 0;
	return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

/** @param {number} loss */
export function categoryFor(loss) {
	if (loss < THRESHOLDS.excellent) return "Excellent";
	if (loss < THRESHOLDS.good) return "Good";
	if (loss < THRESHOLDS.inaccuracy) return "Inaccuracy";
	if (loss < THRESHOLDS.mistake) return "Mistake";
	return "Blunder";
}

/** Same squares and promotion; a missing promotion piece means a queen, as in `doMove`. */
export function sameMove(a, b) {
	return (
		a.from.x === b.from.x &&
		a.from.y === b.from.y &&
		a.to.x === b.to.x &&
		a.to.y === b.to.y &&
		(a.p ?? "Q").toUpperCase() === (b.p ?? "Q").toUpperCase()
	);
}

const whiteToMove = (fen) => fen.split(" ")[1] === "w";

/** Whether the side to move in `fen` is checkmated. */
function isMate(fen) {
	const pos = parseFEN(fen);
	const check = pos.w ? isWhiteCheck(pos) : isWhiteCheck(colorflip(pos));
	return check && genMoves(pos).length === 0;
}

/**
 * How many leading entries are Book: entry 0 in book, then every entry
 * reached by a move into a book position. 0 when there is no book.
 *
 * @param {Array<any>} history
 * @param {Book|null|undefined} book
 * @param {number} [limit]
 */
function bookPrefix(history, book, limit = history.length - 1) {
	if (book == null) return 0;
	let n = 0;
	while (
		n <= limit &&
		(n === 0 || history[n].move != null) &&
		isBookPosition(book, history[n].fen)
	)
		n++;
	return n;
}

/** @returns {Grade|null} */
function grade(history, i, inBook) {
	if (i === 0 || history[i].move == null) return null;
	if (inBook) return { category: "Book", loss: 0 };
	const before = history[i - 1].evaluation;
	const after = history[i].evaluation;
	const san = history[i].san;
	const mate = /[+#]$/.test(san ?? "") && isMate(history[i].fen);
	if (before?.score == null || (after?.score == null && !mate)) return null;
	if (mate || (before.move != null && sameMove(history[i].move, before.move)))
		return { category: "Best Move", loss: 0 };
	const loss = Math.max(
		0,
		winChance(before.score) - (100 - winChance(after.score)),
	);
	return { category: categoryFor(loss), loss };
}

/**
 * The grade of the move that reached entry `i`, or null when there is none
 * yet (the first entry, a board edit or FEN jump, a missing evaluation).
 *
 * @param {Array<any>} history
 * @param {number} i
 * @param {Book|null|undefined} book
 * @returns {Grade|null}
 */
export function gradeMove(history, i, book) {
	return grade(history, i, bookPrefix(history, book, i) > i);
}

/**
 * One grade per history entry; the first is always null.
 *
 * @param {Array<any>} history
 * @param {Book|null|undefined} book
 * @returns {Array<Grade|null>}
 */
export function gradeGame(history, book) {
	const prefix = bookPrefix(history, book);
	return history.map((_, i) => grade(history, i, i < prefix));
}

/**
 * Per-side counts of each category, how many moves are graded, and how many
 * could be (every entry reached by a move).
 *
 * @param {Array<Grade|null>} grades
 * @param {Array<any>} history
 */
export function summarize(grades, history) {
	const counts = () => Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
	const white = counts();
	const black = counts();
	let graded = 0;
	let total = 0;
	for (let i = 1; i < history.length; i++) {
		if (history[i].move == null) continue;
		total++;
		const g = grades[i];
		if (g == null) continue;
		graded++;
		(whiteToMove(history[i - 1].fen) ? white : black)[g.category]++;
	}
	return { white, black, graded, total };
}
