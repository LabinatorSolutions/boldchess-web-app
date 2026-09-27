/** The move history: recording positions, stepping through them and keeping player names. */

import { historyEntry, state } from "../state.js";
import { refreshButtonRevert, showBoard } from "../ui/board.js";
import { setButtonEnabled } from "../ui/dom.js";
import { getCurFEN, setCurFEN } from "./position.js";

export function historyButtons() {
	setButtonEnabled(
		document.getElementById("buttonBack"),
		state.historyindex > 0,
	);
	setButtonEnabled(
		document.getElementById("buttonForward"),
		state.historyindex < state.history.length - 1,
	);
}

/**
 * @param {string} fen
 * @param {import("../state.js").HistoryEntry[] | null} oldhistory Entries to take evaluations from when replaying a game; null for a new move, which keeps the mainline to revert to.
 * @param {import("../chess/rules.js").Move | null} move
 * @param {string | null} san
 */
export function historyAdd(fen, oldhistory, move, san) {
	if (state.historyindex >= 0 && state.history[state.historyindex].fen === fen)
		return;
	// Replaying a game re-uses the evaluation the position already had.
	let evaluation = null;
	if (oldhistory != null) {
		for (let i = 0; i < oldhistory.length; i++) {
			if (oldhistory[i].fen === fen && oldhistory[i].evaluation != null)
				evaluation = oldhistory[i].evaluation;
		}
	} else {
		if (state.history2 == null) {
			state.history2 = {
				index: state.historyindex,
				entries: JSON.parse(JSON.stringify(state.history)),
			};
			refreshButtonRevert();
		}
	}
	state.historyindex++;
	state.history.length = state.historyindex;
	state.history.push(historyEntry(fen, evaluation, move, san));
	historyButtons();
}

/**
 * @param {number} v Entries to step, or 0 to redisplay.
 * @param {Event} [e] With Ctrl held, a step of ±1 jumps to the end.
 * @param {boolean} [ctrl]
 */
export function historyMove(v, e, ctrl) {
	if (e == null) e = window.event;
	const oldindex = state.historyindex;
	// Adjust this block to include move and san as null
	if (
		state.historyindex === state.history.length - 1 &&
		state.history[state.historyindex].fen !== getCurFEN()
	) {
		historyAdd(getCurFEN(), null, null, null); // Pass null for move and san
	}
	state.historyindex += v;
	if (state.historyindex < 0) state.historyindex = 0;
	if (state.historyindex >= state.history.length)
		state.historyindex = state.history.length - 1;
	const ctrlKey = e != null && "ctrlKey" in e && e.ctrlKey;
	if ((ctrlKey && Math.abs(v) === 1) || ctrl)
		state.historyindex = v === 1 ? state.history.length - 1 : 0;
	if (
		v === 0 ||
		oldindex !== state.historyindex ||
		getCurFEN() !== state.history[state.historyindex].fen
	) {
		setCurFEN(state.history[state.historyindex].fen);
		historyButtons();
		showBoard();
	}
}

/**
 * @param {string} [wname]
 * @param {string} [bname]
 */
export function historyKeep(wname, bname) {
	state.wname = wname || "White";
	state.bname = bname || "Black";
	state.history2 = null;
	refreshButtonRevert();
	historyMove(0);
}
