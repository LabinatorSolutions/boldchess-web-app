/** The position currently on the board, and the toolbar toggles that change how it is played. */

import { isFiftyMoveRule, isInsufficientMaterial } from "../chess/draws.js";
import { getFENPos, parseFEN } from "../chess/fen.js";
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
 * How many times the position shown has occurred. Only the game up to the
 * entry shown counts: stepping back through a game must not report a draw
 * that only happens later.
 */
export function repetitionCount(fen) {
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
	return count;
}

/** The position shown has occurred three times. */
export function isThreefoldRepetition(fen) {
	return repetitionCount(fen) >= 3;
}

/**
 * Why the game on the board is drawn, or null. Only games (menu modes 2-4)
 * are drawn, and without a claim, as online play does it: threefold repetition
 * and the fifty-move rule end the game at once. In analysis a draw means
 * nothing, so the position stays open and the engine keeps evaluating it.
 * Checkmate and stalemate are not draws here; the caller checks them first.
 */
export function gameDrawReason(fen) {
	if (state.gameMode === 1) return null;
	const current = fen || getCurFEN();
	const pos = parseFEN(current);
	if (isInsufficientMaterial(pos)) return "Insufficient Material";
	if (isFiftyMoveRule(pos)) return "50-Move Rule";
	if (isThreefoldRepetition(current)) return "Threefold Repetition";
	return null;
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
