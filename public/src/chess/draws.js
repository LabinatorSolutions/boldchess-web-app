/**
 * Draw conditions that depend only on the current position. Repetition needs
 * the game history, so it lives in game/position.js with `gameDrawReason`.
 */

/**
 * A dead position by material: neither side can ever mate. That is a bare
 * king against a king and at most one knight, or any number of bishops (on
 * either side) that all stand on squares of one color.
 */
export function isInsufficientMaterial(pos) {
	let knights = 0;
	const bishopColors = new Set();
	for (let x = 0; x < 8; x++) {
		for (let y = 0; y < 8; y++) {
			const piece = pos.b[x][y].toLowerCase();
			if (piece === "-" || piece === "k") continue;
			if (piece === "n") knights++;
			else if (piece === "b") bishopColors.add((x + y) % 2);
			else return false; // a pawn, rook or queen can still mate
		}
	}
	if (knights === 0) return bishopColors.size <= 1;
	return knights === 1 && bishopColors.size === 0;
}

/** Fifty moves by each side without a capture or pawn move. */
export function isFiftyMoveRule(pos) {
	return pos.m[0] >= 100;
}
