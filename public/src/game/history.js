/** The move history: recording positions, stepping through them and keeping player names. */

import { state } from "../state.js";
import { refreshButtonRevert, showBoard } from "../ui/board.js";
import { getCurFEN, setCurFEN } from "./position.js";

export function historyButtons() {
	document.getElementById("buttonBack").className =
		state.historyindex > 0 ? "on" : "off";
	document.getElementById("buttonForward").className =
		state.historyindex < state.history.length - 1 ? "on" : "off";
}

export function historyAdd(fen, oldhistory, move, san) {
	if (state.historyindex >= 0 && state.history[state.historyindex][0] === fen)
		return;
	let c = null;
	if (oldhistory != null) {
		for (let i = 0; i < oldhistory.length; i++) {
			if (oldhistory[i][0] === fen && oldhistory[i].length > 1)
				c = oldhistory[i][1];
		}
	} else {
		if (state.history2 == null) {
			state.history2 = [
				state.historyindex,
				JSON.parse(JSON.stringify(state.history)),
			];
			refreshButtonRevert();
		}
	}
	state.historyindex++;
	state.history.length = state.historyindex;
	state.history.push([fen, c, move, san]);
	historyButtons();
}

export function historyMove(v, e, ctrl) {
	if (e == null) e = window.event;
	const oldindex = state.historyindex;
	// Adjust this block to include move and san as null
	if (
		state.historyindex === state.history.length - 1 &&
		state.history[state.historyindex][0] !== getCurFEN()
	) {
		historyAdd(getCurFEN(), null, null, null); // Pass null for move and san
	}
	state.historyindex += v;
	if (state.historyindex < 0) state.historyindex = 0;
	if (state.historyindex >= state.history.length)
		state.historyindex = state.history.length - 1;
	if ((e?.ctrlKey && Math.abs(v) === 1) || ctrl)
		state.historyindex = v === 1 ? state.history.length - 1 : 0;
	if (
		v === 0 ||
		oldindex !== state.historyindex ||
		getCurFEN() !== state.history[state.historyindex][0]
	) {
		setCurFEN(state.history[state.historyindex][0]);
		historyButtons();
		showBoard();
	}
}

export function historyKeep(wname, bname) {
	state.wname = wname || "White";
	state.bname = bname || "Black";
	state.history2 = null;
	refreshButtonRevert();
	historyMove(0);
}
