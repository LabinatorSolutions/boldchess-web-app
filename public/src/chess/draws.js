/** Draw conditions that depend only on the current position. */

export function isInsufficientMaterial(pos) {
	const pieces = [];
	for (let x = 0; x < 8; x++) {
		for (let y = 0; y < 8; y++) {
			if (pos.b[x][y] !== "-") {
				pieces.push(pos.b[x][y]);
			}
		}
	}
	if (pieces.length === 2) return true;
	if (pieces.length === 3) {
		for (let i = 0; i < pieces.length; i++) {
			const p = pieces[i].toLowerCase();
			if (p === "n" || p === "b") return true;
		}
	}
	return false;
}

export function isFiftyMoveRule(pos) {
	return pos.m[0] >= 100;
}
