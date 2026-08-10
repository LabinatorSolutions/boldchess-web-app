/** Standard Algebraic Notation: reading moves and writing them. */

import { colorflip } from "./fen.js";
import { doMove, genMoves, isLegal, isWhiteCheck } from "./rules.js";

export function parseMove(pos, s) {
	let promotion = null;
	s = s.replace(/[+|#|?|!|x]/g, "");
	if (s.length >= 2 && s[s.length - 2] === "=") {
		promotion = s[s.length - 1];
		s = s.substring(0, s.length - 2);
	}
	if (s.length >= 3 && "NBRQ".indexOf(s[s.length - 1]) >= 0) {
		promotion = s[s.length - 1];
		s = s.substring(0, s.length - 1);
	}
	if (s === "O-O" || s === "O-O-O") {
		const from = {
				x: 4,
				y: pos.w ? 7 : 0,
			},
			to = {
				x: s === "O-O" ? 6 : 2,
				y: pos.w ? 7 : 0,
			};
		if (isLegal(pos, from, to))
			return {
				from: from,
				to: to,
			};
		else return null;
	} else {
		let p;
		if ("PNBRQK".indexOf(s[0]) < 0) {
			p = "P";
		} else {
			p = s[0];
			s = s.substring(1);
		}
		if (s.length < 2 || s.length > 4) return null;
		const xto = "abcdefgh".indexOf(s[s.length - 2]);
		const yto = "87654321".indexOf(s[s.length - 1]);
		let xfrom = -1,
			yfrom = -1;
		if (s.length > 2) {
			xfrom = "abcdefgh".indexOf(s[0]);
			yfrom = "87654321".indexOf(s[s.length - 3]);
		}
		for (let x = 0; x < 8; x++) {
			for (let y = 0; y < 8; y++) {
				if (xfrom !== -1 && xfrom !== x) continue;
				if (yfrom !== -1 && yfrom !== y) continue;
				if (
					pos.b[x][y] === (pos.w ? p : p.toLowerCase()) &&
					isLegal(
						pos,
						{
							x: x,
							y: y,
						},
						{
							x: xto,
							y: yto,
						},
					)
				) {
					xfrom = x;
					yfrom = y;
				}
			}
		}
		if (xto < 0 || yto < 0 || xfrom < 0 || yfrom < 0) return null;
		return {
			from: {
				x: xfrom,
				y: yfrom,
			},
			to: {
				x: xto,
				y: yto,
			},
			p: promotion,
		};
	}
}

export function sanMove(pos, move, moves) {
	let s = "";
	if (
		move.from.x === 4 &&
		move.to.x === 6 &&
		pos.b[move.from.x][move.from.y].toLowerCase() === "k"
	) {
		s = "O-O";
	} else if (
		move.from.x === 4 &&
		move.to.x === 2 &&
		pos.b[move.from.x][move.from.y].toLowerCase() === "k"
	) {
		s = "O-O-O";
	} else {
		if (
			!pos.b ||
			typeof pos.b[move.from.x] === "undefined" ||
			typeof pos.b[move.from.x][move.from.y] === "undefined"
		) {
			return s; // Return the original position without changes
		}
		const piece = pos.b[move.from.x][move.from.y].toUpperCase();
		if (piece !== "P") {
			let a = 0,
				sx = 0,
				sy = 0;
			for (let i = 0; i < moves.length; i++) {
				if (
					pos.b[moves[i].from.x][moves[i].from.y] ===
						pos.b[move.from.x][move.from.y] &&
					(moves[i].from.x !== move.from.x ||
						moves[i].from.y !== move.from.y) &&
					moves[i].to.x === move.to.x &&
					moves[i].to.y === move.to.y
				) {
					a++;
					if (moves[i].from.x === move.from.x) sx++;
					if (moves[i].from.y === move.from.y) sy++;
				}
			}
			s += piece;
			if (a > 0) {
				if (sx > 0 && sy > 0)
					s += "abcdefgh"[move.from.x] + "87654321"[move.from.y];
				else if (sx > 0) s += "87654321"[move.from.y];
				else s += "abcdefgh"[move.from.x];
			}
		}
		if (
			pos.b[move.to.x][move.to.y] !== "-" ||
			(piece === "P" && move.to.x !== move.from.x)
		) {
			if (piece === "P") s += "abcdefgh"[move.from.x];
			s += "x";
		}
		s += "abcdefgh"[move.to.x] + "87654321"[move.to.y];
		if (piece === "P" && (move.to.y === 0 || move.to.y === 7))
			s += `=${move.p == null ? "Q" : move.p}`;
	}
	const pos2 = doMove(pos, move.from, move.to, move.p);
	if (isWhiteCheck(pos2) || isWhiteCheck(colorflip(pos2)))
		s += genMoves(pos2).length === 0 ? "#" : "+";
	return s;
}
