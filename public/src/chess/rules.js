/** Move legality, move generation and position validation. */

import { board, bounds, colorflip } from "./fen.js";

/**
 * What a pawn promotes to when the caller does not say.
 *
 * The UI stores the player's choice, so the app installs a provider at start
 * up; the rules themselves stay free of any browser dependency.
 */
let defaultPromotionPiece = () => "Q";

export function setDefaultPromotionPiece(provider) {
	defaultPromotionPiece = provider;
}

export function isWhiteCheck(pos) {
	let kx = null,
		ky = null;
	for (let x = 0; x < 8; x++) {
		for (let y = 0; y < 8; y++) {
			if (pos.b[x][y] === "K") {
				kx = x;
				ky = y;
			}
		}
	}
	if (kx == null || ky == null) return false;
	if (
		board(pos, kx + 1, ky - 1) === "p" ||
		board(pos, kx - 1, ky - 1) === "p" ||
		board(pos, kx + 2, ky + 1) === "n" ||
		board(pos, kx + 2, ky - 1) === "n" ||
		board(pos, kx + 1, ky + 2) === "n" ||
		board(pos, kx + 1, ky - 2) === "n" ||
		board(pos, kx - 2, ky + 1) === "n" ||
		board(pos, kx - 2, ky - 1) === "n" ||
		board(pos, kx - 1, ky + 2) === "n" ||
		board(pos, kx - 1, ky - 2) === "n" ||
		board(pos, kx - 1, ky - 1) === "k" ||
		board(pos, kx, ky - 1) === "k" ||
		board(pos, kx + 1, ky - 1) === "k" ||
		board(pos, kx - 1, ky) === "k" ||
		board(pos, kx + 1, ky) === "k" ||
		board(pos, kx - 1, ky + 1) === "k" ||
		board(pos, kx, ky + 1) === "k" ||
		board(pos, kx + 1, ky + 1) === "k"
	)
		return true;
	for (let i = 0; i < 8; i++) {
		const ix = ((i + (i > 3)) % 3) - 1;
		const iy = (((i + (i > 3)) / 3) << 0) - 1;
		for (let d = 1; d < 8; d++) {
			const b = board(pos, kx + d * ix, ky + d * iy);
			const line = ix === 0 || iy === 0;
			if (b === "q" || (b === "r" && line) || (b === "b" && !line)) return true;
			if (b !== "-") break;
		}
	}
	return false;
}

export function doMove(pos, from, to, promotion) {
	if (
		!pos.b ||
		typeof pos.b[from.x] === "undefined" ||
		typeof pos.b[from.x][from.y] === "undefined" ||
		typeof pos.b[to.x] === "undefined" ||
		typeof pos.b[to.x][to.y] === "undefined"
	) {
		return pos; // Return the original position without changes
	}
	if (pos.b[from.x][from.y].toUpperCase() !== pos.b[from.x][from.y]) {
		const r = colorflip(
			doMove(
				colorflip(pos),
				{
					x: from.x,
					y: 7 - from.y,
				},
				{
					x: to.x,
					y: 7 - to.y,
				},
				promotion,
			),
		);
		r.m[1]++;
		return r;
	}
	const r = colorflip(colorflip(pos));
	r.w = !r.w;
	if (from.x === 7 && from.y === 7) r.c[0] = false;
	if (from.x === 0 && from.y === 7) r.c[1] = false;
	if (to.x === 7 && to.y === 0) r.c[2] = false;
	if (to.x === 0 && to.y === 0) r.c[3] = false;
	if (from.x === 4 && from.y === 7) r.c[0] = r.c[1] = false;
	r.e =
		pos.b[from.x][from.y] === "P" && from.y === 6 && to.y === 4
			? [from.x, 5]
			: null;
	if (pos.b[from.x][from.y] === "K") {
		if (Math.abs(from.x - to.x) > 1) {
			r.b[from.x][from.y] = "-";
			r.b[to.x][to.y] = "K";
			r.b[to.x > 4 ? 5 : 3][to.y] = "R";
			r.b[to.x > 4 ? 7 : 0][to.y] = "-";
			// Castling is neither a pawn move nor a capture, so the halfmove
			// clock keeps counting towards the fifty-move rule.
			r.m[0] = r.m[0] + 1;
			return r;
		}
	}
	if (pos.b[from.x][from.y] === "P" && to.y === 0) {
		r.b[to.x][to.y] = promotion != null ? promotion : defaultPromotionPiece();
	} else if (
		pos.b[from.x][from.y] === "P" &&
		pos.e != null &&
		to.x === pos.e[0] &&
		to.y === pos.e[1] &&
		Math.abs(from.x - to.x) === 1
	) {
		r.b[to.x][from.y] = "-";
		r.b[to.x][to.y] = pos.b[from.x][from.y];
	} else {
		r.b[to.x][to.y] = pos.b[from.x][from.y];
	}
	r.b[from.x][from.y] = "-";
	r.m[0] =
		pos.b[from.x][from.y] === "P" || pos.b[to.x][to.y] !== "-" ? 0 : r.m[0] + 1;
	return r;
}

export function isLegal(pos, from, to) {
	if (!bounds(from.x, from.y)) return false;
	if (!bounds(to.x, to.y)) return false;
	if (from.x === to.x && from.y === to.y) return false;
	if (pos.b[from.x][from.y] !== pos.b[from.x][from.y].toUpperCase()) {
		return isLegal(
			colorflip(pos),
			{
				x: from.x,
				y: 7 - from.y,
			},
			{
				x: to.x,
				y: 7 - to.y,
			},
		);
	}
	if (!pos.w) return false;
	const pfrom = pos.b[from.x][from.y];
	const pto = pos.b[to.x][to.y];
	if (pto.toUpperCase() === pto && pto !== "-") return false;
	if (pfrom === "-") {
		return false;
	} else if (pfrom === "P") {
		const enpassant = pos.e != null && to.x === pos.e[0] && to.y === pos.e[1];
		if (
			!(
				(from.x === to.x && from.y === to.y + 1 && pto === "-") ||
				(from.x === to.x &&
					from.y === 6 &&
					to.y === 4 &&
					pto === "-" &&
					pos.b[to.x][5] === "-") ||
				(Math.abs(from.x - to.x) === 1 &&
					from.y === to.y + 1 &&
					(pto !== "-" || enpassant))
			)
		)
			return false;
	} else if (pfrom === "N") {
		if (Math.abs(from.x - to.x) < 1 || Math.abs(from.x - to.x) > 2)
			return false;
		if (Math.abs(from.y - to.y) < 1 || Math.abs(from.y - to.y) > 2)
			return false;
		if (Math.abs(from.x - to.x) + Math.abs(from.y - to.y) !== 3) return false;
	} else if (pfrom === "K") {
		let castling = true;
		if (from.y !== 7 || to.y !== 7) castling = false;
		if (from.x !== 4 || (to.x !== 2 && to.x !== 6)) castling = false;
		if ((to.x === 6 && !pos.c[0]) || (to.x === 2 && !pos.c[1]))
			castling = false;
		if (
			to.x === 2 &&
			pos.b[0][7] + pos.b[1][7] + pos.b[2][7] + pos.b[3][7] !== "R---"
		)
			castling = false;
		if (to.x === 6 && pos.b[5][7] + pos.b[6][7] + pos.b[7][7] !== "--R")
			castling = false;
		if (
			(Math.abs(from.x - to.x) > 1 || Math.abs(from.y - to.y) > 1) &&
			!castling
		)
			return false;
		if (castling && isWhiteCheck(pos)) return false;
		if (
			castling &&
			isWhiteCheck(
				doMove(pos, from, {
					x: to.x === 2 ? 3 : 5,
					y: 7,
				}),
			)
		)
			return false;
	}
	if (pfrom === "B" || pfrom === "R" || pfrom === "Q") {
		const a = from.x - to.x,
			b = from.y - to.y;
		const line = a === 0 || b === 0;
		const diag = Math.abs(a) === Math.abs(b);
		if (!line && !diag) return false;
		if (pfrom === "R" && !line) return false;
		if (pfrom === "B" && !diag) return false;
		const count = Math.max(Math.abs(a), Math.abs(b));
		const ix = a > 0 ? -1 : a < 0 ? 1 : 0,
			iy = b > 0 ? -1 : b < 0 ? 1 : 0;
		for (let i = 1; i < count; i++) {
			if (pos.b[from.x + ix * i][from.y + iy * i] !== "-") return false;
		}
	}
	if (isWhiteCheck(doMove(pos, from, to))) return false;
	return true;
}

export function genMoves(pos) {
	const moves = [];
	for (let x1 = 0; x1 < 8; x1++)
		for (let y1 = 0; y1 < 8; y1++) {
			// Only squares holding a piece of the side to move can start a legal
			// move. Skipping the rest here avoids ~3/4 of the isLegal() calls,
			// and isLegal would reject them anyway, so the result is unchanged.
			const piece = pos.b[x1][y1];
			if (piece === "-") continue;
			if ((piece === piece.toUpperCase()) !== pos.w) continue;
			for (let x2 = 0; x2 < 8; x2++)
				for (let y2 = 0; y2 < 8; y2++) {
					if (
						isLegal(
							pos,
							{
								x: x1,
								y: y1,
							},
							{
								x: x2,
								y: y2,
							},
						)
					) {
						if ((y2 === 0 || y2 === 7) && pos.b[x1][y1].toUpperCase() === "P") {
							moves.push({
								from: {
									x: x1,
									y: y1,
								},
								to: {
									x: x2,
									y: y2,
								},
								p: "N",
							});
							moves.push({
								from: {
									x: x1,
									y: y1,
								},
								to: {
									x: x2,
									y: y2,
								},
								p: "B",
							});
							moves.push({
								from: {
									x: x1,
									y: y1,
								},
								to: {
									x: x2,
									y: y2,
								},
								p: "R",
							});
							moves.push({
								from: {
									x: x1,
									y: y1,
								},
								to: {
									x: x2,
									y: y2,
								},
								p: "Q",
							});
						} else
							moves.push({
								from: {
									x: x1,
									y: y1,
								},
								to: {
									x: x2,
									y: y2,
								},
							});
					}
				}
		}
	return moves;
}

export function fixCastling(pos) {
	pos.c[0] &= !(pos.b[7][7] !== "R" || pos.b[4][7] !== "K");
	pos.c[1] &= !(pos.b[0][7] !== "R" || pos.b[4][7] !== "K");
	pos.c[2] &= !(pos.b[7][0] !== "r" || pos.b[4][0] !== "k");
	pos.c[3] &= !(pos.b[0][0] !== "r" || pos.b[4][0] !== "k");
}

export function checkPosition(pos) {
	const errmsgs = [];
	let wk = 0,
		bk = 0,
		wp = 0,
		bp = 0,
		wpr = 0,
		bpr = 0,
		wn = 0,
		wb1 = 0,
		wb2 = 0,
		wr = 0,
		wq = 0,
		bn = 0,
		bb1 = 0,
		bb2 = 0,
		br = 0,
		bq = 0;
	for (let x = 0; x < 8; x++) {
		for (let y = 0; y < 8; y++) {
			const c = (x + y) % 2 === 0;
			if (pos.b[x][y] === "K") wk++;
			if (pos.b[x][y] === "k") bk++;
			if (pos.b[x][y] === "P") wp++;
			if (pos.b[x][y] === "p") bp++;
			if (pos.b[x][y] === "N") wn++;
			if (pos.b[x][y] === "n") bn++;
			if (c && pos.b[x][y] === "B") wb1++;
			if (c && pos.b[x][y] === "b") bb1++;
			if (!c && pos.b[x][y] === "B") wb2++;
			if (!c && pos.b[x][y] === "b") bb2++;
			if (pos.b[x][y] === "R") wr++;
			if (pos.b[x][y] === "r") br++;
			if (pos.b[x][y] === "Q") wq++;
			if (pos.b[x][y] === "q") bq++;
			if (pos.b[x][y] === "P" && (y === 0 || y === 7)) wpr++;
			if (pos.b[x][y] === "p" && (y === 0 || y === 7)) bpr++;
		}
	}
	if (wk === 0) errmsgs.push("Missing white king");
	if (bk === 0) errmsgs.push("Missing black king");
	if (wk > 1) errmsgs.push("Two white kings");
	if (bk > 1) errmsgs.push("Two black kings");
	const wcheck = isWhiteCheck(pos);
	const bcheck = isWhiteCheck(colorflip(pos));
	if ((pos.w && bcheck) || (!pos.w && wcheck))
		errmsgs.push("Non-active color is in check");
	if (wp > 8) errmsgs.push("Too many white pawns");
	if (bp > 8) errmsgs.push("Too many black pawns");
	if (wpr > 0) errmsgs.push("White pawns in first or last rank");
	if (bpr > 0) errmsgs.push("Black pawns in first or last rank");
	const we =
		Math.max(0, wq - 1) +
		Math.max(0, wr - 2) +
		Math.max(0, wb1 - 1) +
		Math.max(0, wb2 - 1) +
		Math.max(0, wn - 2);
	const be =
		Math.max(0, bq - 1) +
		Math.max(0, br - 2) +
		Math.max(0, bb1 - 1) +
		Math.max(0, bb2 - 1) +
		Math.max(0, bn - 2);
	if (we > Math.max(0, 8 - wp)) errmsgs.push("Too many extra white pieces");
	if (be > Math.max(0, 8 - bp)) errmsgs.push("Too many extra black pieces");
	if (
		(pos.c[0] && (pos.b[7][7] !== "R" || pos.b[4][7] !== "K")) ||
		(pos.c[1] && (pos.b[0][7] !== "R" || pos.b[4][7] !== "K"))
	)
		errmsgs.push(
			"White has castling rights and king or rook not in their starting position",
		);
	if (
		(pos.c[2] && (pos.b[7][0] !== "r" || pos.b[4][0] !== "k")) ||
		(pos.c[3] && (pos.b[0][0] !== "r" || pos.b[4][0] !== "k"))
	)
		errmsgs.push(
			"Black has castling rights and king or rook not in their starting position",
		);
	return errmsgs;
}
