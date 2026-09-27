/**
 * Pre-moves: in a game against the engine, the player may queue one move
 * while the engine thinks. It is played as soon as the engine's reply is on
 * the board, if it is legal there, and dropped otherwise.
 *
 * No DOM here, so `bun test` can import it. A pre-move belongs to the
 * position it was entered in (`state.premove.fen`): any other change of
 * position (a History step, a loaded game, an edit) leaves it unplayable.
 */

import { state } from "../state.js";

/** @typedef {import("../chess/fen.js").Position} Position */
/** @typedef {import("../chess/fen.js").Square} Square */
/** @typedef {import("../chess/rules.js").Move} Move */

/** Whether pre-moves apply in `pos`: a game against the engine, on its turn. */
export function canPremove(/** @type {Position} */ pos) {
	// `state.play` is the side the engine plays (0 = Black, 1 = White); `pos.w`
	// is a boolean, so compare through `=== 1`, never directly.
	return state.play != null && pos.w === (state.play === 1);
}

/**
 * Whether `square` holds one of the player's pieces.
 *
 * @param {Position} pos
 * @param {Square} square
 */
export function isPlayerPiece(pos, square) {
	if (state.play == null || square.x < 0 || square.y < 0) return false;
	const piece = pos.b[square.x]?.[square.y];
	if (piece == null || piece === "-") return false;
	return (piece === piece.toUpperCase()) === (state.play === 0);
}

const KNIGHT = [
	[1, 2],
	[2, 1],
	[2, -1],
	[1, -2],
	[-1, -2],
	[-2, -1],
	[-2, 1],
	[-1, 2],
];
const KING = [
	[1, 0],
	[1, 1],
	[0, 1],
	[-1, 1],
	[-1, 0],
	[-1, -1],
	[0, -1],
	[1, -1],
];
const ROOK = [
	[1, 0],
	[0, 1],
	[-1, 0],
	[0, -1],
];
const BISHOP = [
	[1, 1],
	[-1, 1],
	[-1, -1],
	[1, -1],
];

/**
 * The squares the piece on `from` may pre-move to: its movement pattern with
 * nothing in the way, since the engine's reply can clear a line or put a
 * piece on a square that is the player's own now (a recapture). Pawns get
 * their pushes and both diagonals, the king its castling squares while it
 * still has the right. Whether the move is legal is decided when it is played.
 *
 * @param {Position} pos
 * @param {Square} from
 * @returns {Square[]}
 */
export function premoveTargets(pos, from) {
	const piece = pos.b[from.x]?.[from.y];
	if (piece == null || piece === "-") return [];
	const white = piece === piece.toUpperCase();
	/** @type {Square[]} */
	const targets = [];
	/** @param {number} dx @param {number} dy */
	const add = (dx, dy) => {
		const x = from.x + dx;
		const y = from.y + dy;
		if (x >= 0 && x < 8 && y >= 0 && y < 8) targets.push({ x, y });
	};
	/** @param {number[][]} directions */
	const slide = (directions) => {
		for (const [dx, dy] of directions)
			for (let d = 1; d < 8; d++) add(dx * d, dy * d);
	};
	switch (piece.toUpperCase()) {
		case "P": {
			// Rank 8 is y = 0, so White pawns move to smaller y.
			const dy = white ? -1 : 1;
			add(0, dy);
			if (from.y === (white ? 6 : 1)) add(0, 2 * dy);
			add(-1, dy);
			add(1, dy);
			break;
		}
		case "N":
			for (const [dx, dy] of KNIGHT) add(dx, dy);
			break;
		case "B":
			slide(BISHOP);
			break;
		case "R":
			slide(ROOK);
			break;
		case "Q":
			slide(ROOK);
			slide(BISHOP);
			break;
		case "K": {
			for (const [dx, dy] of KING) add(dx, dy);
			const home = white ? 7 : 0;
			if (from.x === 4 && from.y === home) {
				if (pos.c[white ? 0 : 2]) add(2, 0);
				if (pos.c[white ? 1 : 3]) add(-2, 0);
			}
			break;
		}
	}
	return targets;
}

/**
 * Whether `move` is a pre-move the player may queue in `pos`.
 *
 * @param {Position} pos
 * @param {Move} move
 */
export function isPremove(pos, move) {
	return (
		canPremove(pos) &&
		isPlayerPiece(pos, move.from) &&
		premoveTargets(pos, move.from).some(
			(t) => t.x === move.to.x && t.y === move.to.y,
		)
	);
}

/**
 * Queue `move`, entered in position `fen`, replacing any queued one.
 *
 * @param {Move} move
 * @param {string} fen
 */
export function setPremove(move, fen) {
	state.premove = { move, fen };
}

export function clearPremove() {
	state.premove = null;
}

/**
 * The queued pre-move while the board shows the position it was entered in,
 * for drawing it; null otherwise.
 *
 * @param {string} fen The position on the board.
 * @returns {Move | null}
 */
export function shownPremove(fen) {
	return state.premove?.fen === fen ? state.premove.move : null;
}

/**
 * Take the queued pre-move to play after the engine's reply from `fenBefore`.
 * It is cleared either way; null when there is none, or it was entered in
 * another position.
 *
 * @param {string} fenBefore The position the engine replied in.
 * @returns {Move | null}
 */
export function takePremove(fenBefore) {
	const move = shownPremove(fenBefore);
	clearPremove();
	return move;
}
