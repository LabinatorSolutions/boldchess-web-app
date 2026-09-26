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

/**
 * Whether the position shown has now occurred three times. Only the game up to
 * the entry shown counts: stepping back through a game must not report a draw
 * that only happens later.
 */
export function isThreefoldRepetition(fen) {
	const current = fen || getCurFEN();
	const pos = getFENPos(current);
	const last = Math.min(state.historyindex, state.history.length - 1);
	let count = 0;
	for (let i = 0; i <= last; i++) {
		if (getFENPos(state.history[i].fen) === pos) count++;
	}
	// A position not yet recorded (edited, or awaiting its history entry)
	// is itself one more occurrence.
	if (last < 0 || state.history[last].fen !== current) count++;
	return count >= 3;
}

const PROMOTION_KEY = "promotionPiece";

/** The preference for this page, used when storage is unavailable. */
let sessionPromotionPiece = "Q";

/** Menu label for the promotion preference. */
export function promotionLabel(piece = getPromotionPiece()) {
	return `Pawn Promotion: ${piece === "N" ? "Knight" : "Queen"}`;
}

/**
 * Switch the promotion preference between queen and knight. Works whether or
 * not the menu is open; the menu label is only refreshed when it exists.
 */
export function togglePromotionPiece() {
	const next = getPromotionPiece() === "N" ? "Q" : "N";
	try {
		localStorage.setItem(PROMOTION_KEY, next);
	} catch {
		// Storage can be disabled (privacy mode, blocked site data); the
		// preference then lasts for this page only.
	}
	sessionPromotionPiece = next;
	const promotionItem = document.querySelector(
		".menuItem.menuPromote span:first-child",
	);
	if (promotionItem) promotionItem.textContent = promotionLabel(next);
}

export function getPromotionPiece() {
	try {
		const stored = localStorage.getItem(PROMOTION_KEY);
		if (stored === "Q" || stored === "N") return stored;
		return "Q";
	} catch {
		return sessionPromotionPiece;
	}
}

export function toggleCoachMode() {
	state.coachMode = state.coachMode !== true;
	const newText =
		state.coachMode === true ? "Deactivate Coach Mode" : "Activate Coach Mode";
	state.coachModeLabel = newText;
}
