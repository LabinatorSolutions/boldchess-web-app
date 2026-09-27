/**
 * The opening book: named lines from lichess-org/chess-openings (CC0), indexed
 * by position so that transpositions find the same name.
 *
 * No DOM here, so the module imports under `bun test` and #21's report can ask
 * `isBookPosition` without the UI.
 */

import { generateFEN, getFENPos, parseFEN } from "../chess/fen.js";
import { doMove, isLegal } from "../chess/rules.js";
import { START } from "../config.js";

const FILES = "abcdefgh";

/** The source lines of each built book, for naming edges and replaying lines. */
const LINES = new WeakMap();

/** `{from, to, p}` as `e2e4`, or `f2g1n` for a promotion. */
export function moveToString(move) {
	const square = ({ x, y }) => FILES[x] + (8 - y);
	return (
		square(move.from) + square(move.to) + (move.p ? move.p.toLowerCase() : "")
	);
}

/**
 * The inverse of `moveToString`. The promotion piece comes back upper-case,
 * the White-side letter that `doMove` expects for either color.
 */
export function moveFromString(s) {
	const square = (at) => ({
		x: FILES.indexOf(s[at]),
		y: 8 - Number(s[at + 1]),
	});
	return {
		from: square(0),
		to: square(2),
		p: s.length > 4 ? s[4].toUpperCase() : null,
	};
}

/**
 * The FEN's first four fields, so that move counters do not split one
 * position in two. The en passant square is kept only when a pawn can
 * actually capture there, as in lichess's EPD keys: after 1.e4 the app's FEN
 * says `e3`, a pasted FEN of the same position says `-`, and both must match.
 * Null when the FEN does not parse.
 */
export function positionKey(fen) {
	let pos;
	try {
		pos = parseFEN(fen);
	} catch {
		return null;
	}
	return keyOf(pos);
}

/** `positionKey` for a parsed position. */
function keyOf(pos) {
	if (pos.e != null) {
		const [ex, ey] = pos.e;
		const fy = pos.w ? ey + 1 : ey - 1;
		const pawn = pos.w ? "P" : "p";
		let capture = false;
		for (const fx of [ex - 1, ex + 1])
			if (fx >= 0 && fx < 8 && pos.b[fx][fy] === pawn)
				capture ||= isLegal(pos, { x: fx, y: fy }, { x: ex, y: ey });
		if (!capture) pos = { ...pos, e: null };
	}
	return getFENPos(generateFEN(pos));
}

/**
 * @typedef {{key: string, lineCount: number, lineIndex: number}} BookEdge
 * @typedef {{eco: string|null, name: string|null, lineIndex: number,
 *   next: Map<string, BookEdge>}} BookNode
 * @typedef {Map<string, BookNode>} Book
 */

/**
 * Index `[eco, name, moves]` lines by position. Every position on a line is a
 * node; the position a line ends at is named by the first line (in file
 * order) to end there. Each edge counts the lines through it and remembers the
 * shortest one, which names a continuation whose position has no name.
 *
 * @returns {Book}
 */
export function buildBook(lines) {
	/** @type {Book} */
	const book = new Map();
	const node = (key) => {
		let n = book.get(key);
		if (n == null) {
			n = { eco: null, name: null, lineIndex: -1, next: new Map() };
			book.set(key, n);
		}
		return n;
	};
	LINES.set(book, lines);
	const plies = lines.map((line) => line[2].split(" "));
	// Lines share long prefixes; replay each prefix once.
	const start = parseFEN(START);
	const replayed = new Map([["", { pos: start, key: keyOf(start) }]]);
	for (let i = 0; i < lines.length; i++) {
		let prefix = "";
		let { pos, key } = replayed.get(prefix);
		for (const m of plies[i]) {
			prefix = prefix === "" ? m : `${prefix} ${m}`;
			let step = replayed.get(prefix);
			if (step == null) {
				const move = moveFromString(m);
				const next = doMove(pos, move.from, move.to, move.p);
				step = { pos: next, key: keyOf(next) };
				replayed.set(prefix, step);
			}
			pos = step.pos;
			const childKey = step.key;
			const parent = node(key);
			const edge = parent.next.get(m);
			if (edge == null)
				parent.next.set(m, { key: childKey, lineCount: 1, lineIndex: i });
			else {
				edge.lineCount++;
				if (plies[i].length < plies[edge.lineIndex].length) edge.lineIndex = i;
			}
			key = childKey;
		}
		const end = node(key);
		if (end.name == null) {
			end.eco = lines[i][0];
			end.name = lines[i][1];
			end.lineIndex = i;
		}
	}
	return book;
}

/**
 * The opening of `entries[index]` (entries shaped like `state.history`): the
 * most recent named position at or before it. `lastBookIndex` is the latest
 * entry still in the book, so the move after it is where the game left book.
 */
export function openingAt(book, entries, index) {
	let lastBookIndex = -1;
	let found = null;
	for (let i = index; i >= 0; i--) {
		const n = book.get(positionKey(entries[i].fen));
		if (n == null) continue;
		if (lastBookIndex < 0) lastBookIndex = i;
		if (n.name != null) {
			found = { eco: n.eco, name: n.name, lineIndex: n.lineIndex, plyIndex: i };
			break;
		}
	}
	if (found == null) return null;
	return { ...found, inBook: lastBookIndex === index, lastBookIndex };
}

/**
 * Book moves from `fen`, most established first: by the number of named lines
 * through the move, then by the move string.
 */
export function continuations(book, fen) {
	const n = book.get(positionKey(fen));
	if (n == null) return [];
	const lines = LINES.get(book);
	const rows = [];
	for (const [move, edge] of n.next) {
		const child = book.get(edge.key);
		const named = child.name != null ? child : null;
		rows.push({
			move,
			key: edge.key,
			name: named ? named.name : lines[edge.lineIndex][1],
			eco: named ? named.eco : lines[edge.lineIndex][0],
			lineCount: edge.lineCount,
		});
	}
	return rows.sort(
		(a, b) => b.lineCount - a.lineCount || (a.move < b.move ? -1 : 1),
	);
}

/** Whether `fen` is a position on any named line. The entry point for #21. */
export function isBookPosition(book, fen) {
	return book.has(positionKey(fen));
}

/**
 * Fetch and index a book. Resolves to null when the file cannot be fetched,
 * parsed or built; it never throws and never logs, because the smoke test
 * treats any console error as a failure and the app works without a book.
 *
 * @returns {Promise<Book|null>}
 */
export async function fetchBook(url) {
	try {
		const response = await fetch(url);
		if (!response.ok) return null;
		return buildBook(await response.json());
	} catch {
		return null;
	}
}

/** @type {Promise<Book|null>|undefined} */
let loading;
/** @type {Book|null|undefined} */
let loaded;

/** The app's book, fetched once per session; later calls share the result. */
export function loadBook() {
	loading ??= fetchBook("data/openings.json").then((book) => {
		loaded = book;
		return book;
	});
	return loading;
}

/**
 * Install an already built book as the app's book. Tests use it so that the
 * view does not depend on which test file first called `loadBook`.
 */
export function useBook(book) {
	loaded = book;
	loading = Promise.resolve(book);
}

/** The loaded book: undefined while loading, null when unavailable. */
export function getBook() {
	return loaded;
}

/** The moves of line `lineIndex` of the loaded book, as move strings. */
export function lineMoves(lineIndex) {
	return LINES.get(loaded)[lineIndex][2].split(" ");
}
