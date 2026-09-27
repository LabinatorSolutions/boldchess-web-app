/**
 * The Game Report window: each category's count per side and the list of
 * errors, graded from the history's background evaluations (see
 * `report/grade.js`). It fills in while the analysis loop evaluates the
 * history, and every error row jumps to its move, in any mode.
 */

import { parseFEN } from "../chess/fen.js";
import { historyMove } from "../game/history.js";
import { getBook, loadBook, moveToString } from "../openings/book.js";
import {
	bestMoveSan,
	CATEGORIES,
	ERRORS,
	gradeGame,
	summarize,
} from "../report/grade.js";
import { state } from "../state.js";
import { makeButton, setElemText } from "./dom.js";

let waiting = false;

/**
 * What the last render showed. `updateInfo()` runs several times while the
 * engine deepens; rebuilding identical rows would drop a click in progress
 * and the keyboard focus on a row.
 */
let rendered = "";

/**
 * Why no evaluations are coming, or null while they are: the engine could not
 * start ("failed"), or it plays without coach mode or has depth 0 ("off").
 */
function analysisBlocked() {
	if (state.analysisEngine?.failed) return "failed";
	if (
		(state.play != null && !state.coachMode) ||
		state.analysisEngine?.depth === 0
	)
		return "off";
	return null;
}

/** @param {Node} elem */
function clear(elem) {
	while (elem.firstChild) elem.removeChild(elem.firstChild);
}

/**
 * @param {string} className
 * @param {string[]} texts
 */
function row(className, texts) {
	const elem = document.createElement("DIV");
	elem.className = className;
	for (const text of texts) {
		const cell = document.createElement("SPAN");
		cell.appendChild(document.createTextNode(text));
		elem.appendChild(cell);
	}
	return elem;
}

/**
 * "12. Qxb7?? Blunder (−34.5%) · best Rb1", numbered from the position the move was played in.
 *
 * @param {number} i
 * @param {import("../report/grade.js").Grade} grade
 */
function errorText(i, grade) {
	const pos = parseFEN(state.history[i - 1].fen);
	const number = `${pos.m[1]}${pos.w ? "." : "…"}`;
	const mark = ERRORS[grade.category].mark;
	const best = bestMoveSan(state.history, i);
	const suffix = best == null ? "" : ` · best ${best}`;
	return `${number} ${state.history[i].san}${mark} ${grade.category} (−${grade.loss.toFixed(1)}%)${suffix}`;
}

/**
 * Show the position the move to entry `i` was played in, with the played and
 * the engine's move drawn on it.
 *
 * @param {number} i
 */
function review(i) {
	state.reviewMove = { index: i, fen: state.history[i].fen };
	historyMove(i - 1 - state.historyindex);
}

/** Render the window for the history as it stands. */
export function refreshReport() {
	const book = getBook();
	const blocked = analysisBlocked();
	const signature = [
		book === undefined ? "loading" : book === null ? "none" : "book",
		blocked,
		...state.history.map(
			(entry) =>
				`${entry.fen}/${entry.evaluation?.score}/${entry.evaluation?.depth}/${
					entry.move && moveToString(entry.move)
				}`,
		),
	].join("|");
	if (signature === rendered) return;
	rendered = signature;

	if (book === undefined && !waiting) {
		waiting = true;
		loadBook().then(() => refreshReport());
	}

	const grades = gradeGame(state.history, book);
	const summary = summarize(grades, state.history);

	const statusElem = document.getElementById("reportStatus");
	const tableElem = document.getElementById("reportTable");
	const errorsElem = document.getElementById("reportErrors");
	clear(tableElem);
	clear(errorsElem);

	const progress = `${summary.graded} of ${summary.total} moves graded`;
	setElemText(
		statusElem,
		summary.total === 0
			? "No moves to grade"
			: summary.graded === summary.total
				? ""
				: blocked === "failed"
					? `Engine unavailable: ${progress}`
					: blocked === "off"
						? `Engine analysis is off: ${progress}`
						: `Analyzing… ${progress}`,
	);

	tableElem.appendChild(row("reportRow reportHead", ["", "White", "Black"]));
	for (const category of CATEGORIES) {
		const className = ERRORS[category]?.className;
		tableElem.appendChild(
			row(className ? `reportRow ${className}` : "reportRow", [
				category,
				String(summary.white[category]),
				String(summary.black[category]),
			]),
		);
	}

	grades.forEach((grade, i) => {
		const error = grade && ERRORS[grade.category];
		if (!error) return;
		const text = errorText(i, grade);
		const elem = document.createElement("DIV");
		elem.className = `reportError ${error.className}`;
		elem.appendChild(document.createTextNode(text));
		makeButton(elem, `Review ${text}`);
		elem.onclick = () => review(i);
		errorsElem.appendChild(elem);
	});
}
