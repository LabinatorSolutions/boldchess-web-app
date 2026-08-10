/** The position currently on the board, and the toolbar toggles that change how it is played. */

import { getFENPos } from "../chess/fen.js";
import { state } from "../state.js";
import { getElemText, setElemText } from "../ui/dom.js";

export function setCurFEN(fen) {
	setElemText(document.getElementById("fen"), fen);
}

export function getCurFEN() {
	return getElemText(document.getElementById("fen"));
}

export function getCurSan(move) {
	if (move == null) return null;
	for (let i = 0; i < state.curmoves.length; i++)
		if (
			state.curmoves[i].move.from.x === move.from.x &&
			state.curmoves[i].move.from.y === move.from.y &&
			state.curmoves[i].move.to.x === move.to.x &&
			state.curmoves[i].move.to.y === move.to.y &&
			state.curmoves[i].move.p === move.p
		)
			return state.curmoves[i].san;
	return null;
}

export function isThreefoldRepetition(fen) {
	const pos = getFENPos(fen || getCurFEN());
	let count = 0;
	for (let i = 0; i < state.history.length; i++) {
		if (getFENPos(state.history[i][0]) === pos) count++;
	}
	// If the current position is not yet in history (depends on call timing),
	// we might need to add 1. However, typically history is updated on move.
	// If we are checking the *current* state which is already valid,
	// standard repetition requires the position to appear 3 times.
	return count >= 3;
}

export function togglePromotionPiece() {
	const promotionItem = document.querySelector(
		".menuItem.menuPromote span:first-child",
	);
	const currentText = promotionItem.innerText;
	const newText = currentText.includes("Queen")
		? "Pawn Promotion: Knight"
		: "Pawn Promotion: Queen";
	promotionItem.innerText = newText;
	localStorage.setItem("promotionPiece", newText.includes("Queen") ? "Q" : "N");
}

export function getPromotionPiece() {
	return localStorage.getItem("promotionPiece") || "Q";
}

export function toggleCoachMode() {
	state.coachMode = state.coachMode !== true;
	const newText =
		state.coachMode === true ? "Deactivate Coach Mode" : "Activate Coach Mode";
	state.coachModeLabel = newText;
}
