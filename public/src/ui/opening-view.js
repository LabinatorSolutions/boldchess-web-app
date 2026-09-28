/**
 * The Opening window and the opening segment of the board header.
 *
 * The name is the most recent named position at or before the one shown (see
 * `openingAt`), so it follows the history as the user steps through it. In
 * analysis the name and the continuations are buttons that play their moves
 * as a variation; in a game they are only text.
 */

import { generateFEN, parseFEN } from "../chess/fen.js";
import { sanMove } from "../chess/notation.js";
import { doMove, genMoves } from "../chess/rules.js";
import { START } from "../config.js";
import { historyAdd, historyMove } from "../game/history.js";
import { getCurFEN, setCurFEN } from "../game/position.js";
import { doMoveHandler } from "../input/mouse.js";
import {
	continuations,
	getBook,
	isBookPosition,
	lineMoves,
	loadBook,
	moveFromString,
	openingAt,
} from "../openings/book.js";
import { historyEntry, state } from "../state.js";
import { refreshButtonRevert } from "./board.js";
import { byId, makeButton, setElemText } from "./dom.js";

let waiting = false;

/** History up to the shown position, ending in the position on the board. */
function shownEntries() {
	const entries = state.history.slice(0, state.historyindex + 1);
	const fen = getCurFEN();
	if (entries.length === 0 || entries[entries.length - 1].fen !== fen)
		entries.push(historyEntry(fen));
	return entries;
}

/**
 * "Out of book after 7… Nd4": the move that followed the last book position.
 *
 * @param {import("../state.js").HistoryEntry[]} entries
 * @param {number} lastBookIndex
 */
function outOfBookText(entries, lastBookIndex) {
	const next = entries[lastBookIndex + 1];
	if (next?.san == null) return "Out of book";
	const pos = parseFEN(entries[lastBookIndex].fen);
	return `Out of book after ${pos.m[1]}${pos.w ? "." : "…"} ${next.san}`;
}

/** @param {Node} elem */
function clear(elem) {
	while (elem.firstChild) elem.removeChild(elem.firstChild);
}

/**
 * @param {string} className
 * @param {string} text
 */
function span(className, text) {
	const elem = document.createElement("SPAN");
	elem.className = className;
	elem.appendChild(document.createTextNode(text));
	return elem;
}

/**
 * Book moves from `fen` as rows; buttons in analysis, text in a game.
 *
 * @param {HTMLElement} movesElem
 * @param {import("../openings/book.js").Book} book
 * @param {string} fen
 * @param {boolean} analysis
 */
function renderContinuations(movesElem, book, fen, analysis) {
	for (const row of continuations(book, fen)) {
		const move = moveFromString(row.move);
		const san = row.san;
		const elem = document.createElement("DIV");
		elem.className = "openingMove";
		elem.title = `${row.eco} ${row.name}`;
		elem.appendChild(span("san", san));
		elem.appendChild(span("name", row.name));
		elem.appendChild(span("count", String(row.lineCount)));
		if (analysis) {
			makeButton(elem, `Play ${san}, ${row.name}`);
			elem.onclick = () => doMoveHandler(move);
		}
		movesElem.appendChild(elem);
	}
}

/**
 * What the last render showed. The analysis loop refreshes the info panels
 * several times while the engine deepens; rebuilding identical rows then
 * would drop a click in progress and the keyboard focus on a row.
 */
let rendered = "";

/** Render the window and the header segment for the position shown. */
export function refreshOpening() {
	const book = getBook();
	const entries = shownEntries();
	const signature = [
		book === undefined ? "loading" : book === null ? "none" : "book",
		state.gameMode,
		...entries.map((entry) => entry.fen),
	].join("|");
	if (signature === rendered) return;
	rendered = signature;

	const nameElem = byId("openingName");
	const statusElem = byId("openingStatus");
	const movesElem = byId("openingMoves");
	const infoElem = byId("openingInfo");
	clear(nameElem);
	nameElem.className = "";
	clear(movesElem);
	setElemText(infoElem, "");
	infoElem.className = "";
	infoElem.title = "";

	if (book === undefined) {
		setElemText(statusElem, "Loading opening book…");
		if (!waiting) {
			waiting = true;
			loadBook().then(() => refreshOpening());
		}
		return;
	}
	if (book === null) {
		setElemText(statusElem, "Opening book unavailable");
		return;
	}

	const analysis = state.gameMode === 1;
	const fen = entries[entries.length - 1].fen;
	const found = openingAt(book, entries, entries.length - 1);
	if (found == null) {
		// The start position, or an unnamed book position set up by hand:
		// nothing to name, but the book moves from here still apply.
		setElemText(statusElem, "No opening");
		if (isBookPosition(book, fen))
			renderContinuations(movesElem, book, fen, analysis);
		return;
	}

	const fullName = `${found.eco} ${found.name}`;
	nameElem.appendChild(span("openingEco", found.eco ?? ""));
	const title = span("openingTitle", found.name);
	if (analysis) {
		makeButton(title, `Play ${found.name}`);
		title.onclick = () => playLine(lineMoves(found.lineIndex));
	}
	nameElem.appendChild(title);
	nameElem.title = fullName;

	setElemText(infoElem, ` · ${fullName}`);
	infoElem.title = fullName;
	if (!found.inBook) {
		infoElem.className = "outOfBook";
		nameElem.className = "outOfBook";
	}

	setElemText(
		statusElem,
		found.inBook ? "" : outOfBookText(entries, found.lastBookIndex),
	);
	if (found.inBook) renderContinuations(movesElem, book, fen, analysis);
}

/**
 * Play a line from the starting position as a variation. The game is
 * snapshotted first (unless a variation already holds the snapshot), so
 * Revert brings it back.
 *
 * @param {string[]} moves Move strings, as `lineMoves` returns them.
 */
export function playLine(moves) {
	if (state.history2 == null) {
		state.history2 = {
			index: state.historyindex,
			entries: JSON.parse(JSON.stringify(state.history)),
		};
		refreshButtonRevert();
	}
	state.history = [historyEntry(START)];
	state.historyindex = 0;
	let pos = parseFEN(START);
	for (const m of moves) {
		const move = moveFromString(m);
		const san = sanMove(pos, move, genMoves(pos));
		pos = doMove(pos, move.from, move.to, move.p);
		historyAdd(generateFEN(pos), null, move, san);
	}
	setCurFEN(generateFEN(pos));
	historyMove(0);
}
