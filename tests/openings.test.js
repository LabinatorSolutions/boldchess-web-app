/**
 * The opening book: the move-string encoding, the generated data file and the
 * position index built from it.
 */

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { moveFromString, moveToString } from "../public/src/openings/book.js";

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
