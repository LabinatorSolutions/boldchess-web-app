/**
 * The opening book: the move-string encoding, the generated data file and the
 * position index built from it.
 */

import { describe, expect, spyOn, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { generateFEN, parseFEN } from "../public/src/chess/fen.js";
import { parseMove } from "../public/src/chess/notation.js";
import { doMove } from "../public/src/chess/rules.js";
import { START } from "../public/src/config.js";
import {
	buildBook,
	continuations,
	fetchBook,
	isBookPosition,
	moveFromString,
	moveToString,
	openingAt,
	positionKey,
} from "../public/src/openings/book.js";

const ROOT = join(import.meta.dir, "..");
const DATA = JSON.parse(
	readFileSync(join(ROOT, "public/data/openings.json"), "utf8"),
);

/** Data rows across the vendored TSVs: every non-blank line after the header. */
function tsvRowCount() {
	let rows = 0;
	for (const f of ["a", "b", "c", "d", "e"]) {
		const lines = readFileSync(
			join(ROOT, `data/chess-openings/${f}.tsv`),
			"utf8",
		).split("\n");
		rows += lines.slice(1).filter((line) => line.trim() !== "").length;
	}
	return rows;
}

describe("move strings", () => {
	for (const s of ["e2e4", "e1g1", "f2g1n"])
		test(`${s} round-trips`, () => {
			expect(moveToString(moveFromString(s))).toBe(s);
		});

	test("a promotion carries the upper-case piece doMove expects", () => {
		expect(moveFromString("f2g1n").p).toBe("N");
		expect(moveFromString("e2e4").p).toBeNull();
	});

	test("squares map to board coordinates", () => {
		expect(moveFromString("e2e4")).toEqual({
			from: { x: 4, y: 6 },
			to: { x: 4, y: 4 },
			p: null,
		});
	});
});

describe("generated data", () => {
	test("one [eco, name, moves] entry per TSV row", () => {
		expect(DATA.length).toBe(tsvRowCount());
		for (const entry of DATA) {
			expect(entry).toHaveLength(3);
			expect(entry[0]).toMatch(/^[A-E][0-9]{2}$/);
			expect(entry[1].length).toBeGreaterThan(0);
			expect(entry[2]).toMatch(
				/^[a-h][1-8][a-h][1-8][nbrq]?( [a-h][1-8][a-h][1-8][nbrq]?)*$/,
			);
		}
	});

	test("castling is encoded as the king's move", () => {
		const italian = DATA.find(
			([, name]) => name === "Italian Game: Classical Variation, Albin Gambit",
		);
		expect(italian[2]).toBe("e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 e1g1 g8f6 c2c3");
	});
});

const BOOK = buildBook(DATA);

/** History entries (`{fen, san}`) for a list of SAN moves from `fen`. */
function history(sans, fen = START) {
	let pos = parseFEN(fen);
	const entries = [{ fen, san: null }];
	for (const san of sans) {
		const move = parseMove(pos, san);
		pos = doMove(pos, move.from, move.to, move.p);
		entries.push({ fen: generateFEN(pos), san });
	}
	return entries;
}

const last = (entries) => entries.length - 1;

describe("book index", () => {
	test("every real line builds into the index", () => {
		expect(BOOK.size).toBeGreaterThan(3000);
		expect(isBookPosition(BOOK, START)).toBe(true);
	});

	test("a transposition finds the same name", () => {
		const a = history(["d4", "d5", "c4", "e6"]);
		const b = history(["c4", "e6", "d4", "d5"]);
		const foundA = openingAt(BOOK, a, last(a));
		// The final position itself is named, so neither walks back.
		expect(foundA.plyIndex).toBe(last(a));
		const nameA = foundA.name;
		expect(openingAt(BOOK, b, last(b)).name).toBe(nameA);
	});

	test("the Ruy Lopez is named", () => {
		const h = history(["e4", "e5", "Nf3", "Nc6", "Bb5"]);
		const found = openingAt(BOOK, h, last(h));
		expect(found.name.startsWith("Ruy Lopez")).toBe(true);
		expect(found.inBook).toBe(true);
	});

	test("walk-back returns the last named position and leaves book", () => {
		const book = buildBook([
			["X00", "A", "e2e4"],
			["X00", "B", "e2e4 e7e5 g1f3 b8c6"],
		]);
		const h = history(["e4", "e5", "Nf3", "Nc6", "Bc4"]);
		expect(openingAt(book, h, 3)).toMatchObject({
			name: "A",
			inBook: true,
			plyIndex: 1,
		});
		expect(openingAt(book, h, 5)).toMatchObject({
			name: "B",
			inBook: false,
			plyIndex: 4,
			lastBookIndex: 4,
		});
	});

	test("the walk-back stops where the history jumps without a move", () => {
		const h = history(["e4", "e5", "Nf3", "Nc6", "Bb5"]);
		// A board edit or a FEN jump: the next position is not reached by a move.
		h.push({ fen: "8/8/8/4k3/8/8/8/4K3 w - - 0 1", san: null });
		expect(openingAt(BOOK, h, last(h))).toBeNull();
		// Book positions before the jump still resolve.
		expect(openingAt(BOOK, h, 5).name.startsWith("Ruy Lopez")).toBe(true);
	});

	test("a custom position has no opening", () => {
		const fen = "8/8/8/4k3/8/8/8/4K3 w - - 0 1";
		expect(openingAt(BOOK, [{ fen, san: null }], 0)).toBeNull();
		expect(isBookPosition(BOOK, fen)).toBe(false);
	});

	test("the en passant field only counts when the capture is legal", () => {
		const h = history(["e4"]);
		expect(h[1].fen.split(" ")[3]).toBe("e3");
		expect(positionKey(h[1].fen)).toBe(
			positionKey("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"),
		);
		// After 1.e4 d5 2.e5 f5 the capture exf6 is legal, so f6 stays.
		const ep = history(["e4", "d5", "e5", "f5"]);
		expect(positionKey(ep[4].fen).split(" ")[3]).toBe("f6");
	});

	test("continuations are ordered and named", () => {
		const book = buildBook([
			["X00", "A", "e2e4"],
			["X00", "B", "e2e4 e7e5"],
			["X00", "C", "e2e4 c7c5"],
			["X00", "D", "d2d4"],
		]);
		const rows = continuations(book, START);
		expect(rows.map((r) => r.move)).toEqual(["e2e4", "d2d4"]);
		expect(rows[0]).toMatchObject({ name: "A", lineCount: 3 });
		expect(rows[1]).toMatchObject({ name: "D", lineCount: 1 });
		// An unnamed child takes the shortest line through the move.
		const unnamed = buildBook([
			["X00", "Long", "e2e4 e7e5 g1f3"],
			["X00", "Short", "e2e4 e7e5"],
		]);
		expect(continuations(unnamed, START)[0].name).toBe("Short");
	});

	test("a failed load resolves to null without logging", async () => {
		const error = spyOn(console, "error");
		const warn = spyOn(console, "warn");
		expect(await fetchBook("file:///nonexistent/openings.json")).toBeNull();
		expect(error).not.toHaveBeenCalled();
		expect(warn).not.toHaveBeenCalled();
	});

	test("the book is built when the browser is idle, not on arrival", async () => {
		const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify(DATA)),
		);
		const idle = [];
		globalThis.requestIdleCallback = (callback) => {
			idle.push(callback);
			return idle.length;
		};
		try {
			let book;
			const pending = fetchBook("data/openings.json").then((b) => {
				book = b;
			});
			await Bun.sleep(20);
			expect(book).toBeUndefined();
			expect(idle.length).toBe(1);
			idle[0]({ didTimeout: false, timeRemaining: () => 50 });
			await pending;
			expect(isBookPosition(book, START)).toBe(true);
		} finally {
			delete globalThis.requestIdleCallback;
			fetchSpy.mockRestore();
		}
	});
});
