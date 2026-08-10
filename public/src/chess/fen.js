/**
 * Board representation and FEN parsing.
 *
 * A position is { b: 8x8 piece array indexed [file][rank-from-the-top],
 * c: castling rights, e: en passant square, w: white to move, m: clocks }.
 */

export function bounds(x, y) {
	return x >= 0 && x <= 7 && y >= 0 && y <= 7;
}

export function board(pos, x, y) {
	if (x >= 0 && x <= 7 && y >= 0 && y <= 7) return pos.b[x][y];
	return "x";
}

export function colorflip(pos) {
	const board = new Array(8);
	for (let i = 0; i < 8; i++) board[i] = new Array(8);
	for (let x = 0; x < 8; x++)
		for (let y = 0; y < 8; y++) {
			board[x][y] = pos.b[x][7 - y];
			const color = board[x][y].toUpperCase() === board[x][y];
			board[x][y] = color
				? board[x][y].toLowerCase()
				: board[x][y].toUpperCase();
		}
	return {
		b: board,
		c: [pos.c[2], pos.c[3], pos.c[0], pos.c[1]],
		e: pos.e == null ? null : [pos.e[0], 7 - pos.e[1]],
		w: !pos.w,
		m: [pos.m[0], pos.m[1]],
	};
}

export function sum(pos, func, param) {
	let sum = 0;
	for (let x = 0; x < 8; x++)
		for (let y = 0; y < 8; y++) sum += func(pos, { x: x, y: y }, param);
	return sum;
}

export function parseMoveNumber(fen) {
	const a = fen.replace(/^\s+/, "").split(" ");
	return a.length > 5 && !Number.isNaN(Number(a[5])) && a[5] !== ""
		? parseInt(a[5], 10)
		: 1;
}

export function parseFEN(fen) {
	const board = new Array(8);
	for (let i = 0; i < 8; i++) board[i] = new Array(8);
	let a = fen.replace(/^\s+/, "").split(" "),
		s = a[0],
		x,
		y;
	for (x = 0; x < 8; x++)
		for (y = 0; y < 8; y++) {
			board[x][y] = "-";
		}
	x = 0;
	y = 0;
	for (let i = 0; i < s.length; i++) {
		if (s[i] === " ") break;
		if (s[i] === "/") {
			x = 0;
			y++;
		} else {
			if (!bounds(x, y)) continue;
			if ("KQRBNP".indexOf(s[i].toUpperCase()) !== -1) {
				board[x][y] = s[i];
				x++;
			} else if ("0123456789".indexOf(s[i]) !== -1) {
				x += parseInt(s[i], 10);
			} else x++;
		}
	}
	let castling,
		enpassant,
		whitemove = !(a.length > 1 && a[1] === "b");
	if (a.length > 2) {
		castling = [
			a[2].indexOf("K") !== -1,
			a[2].indexOf("Q") !== -1,
			a[2].indexOf("k") !== -1,
			a[2].indexOf("q") !== -1,
		];
	} else {
		castling = [true, true, true, true];
	}
	if (a.length > 3 && a[3].length === 2) {
		const ex = "abcdefgh".indexOf(a[3][0]);
		const ey = "87654321".indexOf(a[3][1]);
		enpassant = ex >= 0 && ey >= 0 ? [ex, ey] : null;
	} else {
		enpassant = null;
	}
	const movecount = [
		a.length > 4 && !Number.isNaN(Number(a[4])) && a[4] !== ""
			? parseInt(a[4], 10)
			: 0,
		a.length > 5 && !Number.isNaN(Number(a[5])) && a[5] !== ""
			? parseInt(a[5], 10)
			: 1,
	];
	return {
		b: board,
		c: castling,
		e: enpassant,
		w: whitemove,
		m: movecount,
	};
}

export function generateFEN(pos) {
	let s = "",
		f = 0,
		castling = pos.c,
		enpassant = pos.e,
		board = pos.b;
	for (let y = 0; y < 8; y++) {
		for (let x = 0; x < 8; x++) {
			if (board[x][y] === "-") {
				f++;
			} else {
				if (f > 0) {
					s += f;
					f = 0;
				}
				s += board[x][y];
			}
		}
		if (f > 0) {
			s += f;
			f = 0;
		}
		if (y < 7) s += "/";
	}
	s +=
		" " +
		(pos.w ? "w" : "b") +
		" " +
		(castling[0] || castling[1] || castling[2] || castling[3]
			? (castling[0] ? "K" : "") +
				(castling[1] ? "Q" : "") +
				(castling[2] ? "k" : "") +
				(castling[3] ? "q" : "")
			: "-") +
		" " +
		(enpassant == null
			? "-"
			: "abcdefgh"[enpassant[0]] + "87654321"[enpassant[1]]) +
		" " +
		pos.m[0] +
		" " +
		pos.m[1];
	return s;
}

export function getFENPos(fen) {
	if (!fen) return "";
	return fen.split(" ").slice(0, 4).join(" ");
}
