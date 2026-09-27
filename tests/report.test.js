/**
 * Move grading for the game report: the win-chance curve, the category
 * boundaries and the rules that pick a category, on hand-built histories.
 */

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { generateFEN, parseFEN } from "../public/src/chess/fen.js";
import { parseMove, sanMove } from "../public/src/chess/notation.js";
import { doMove, genMoves } from "../public/src/chess/rules.js";
import { START } from "../public/src/config.js";
import {
	buildBook,
	isBookPosition,
	moveFromString,
} from "../public/src/openings/book.js";
import {
	bestMoveSan,
	CATEGORIES,
	categoryFor,
	gradeGame,
	gradeMove,
	sameMove,
	summarize,
	THRESHOLDS,
	winChance,
} from "../public/src/report/grade.js";
import { historyEntry } from "../public/src/state.js";

const DATA = JSON.parse(
	readFileSync(join(import.meta.dir, "../public/data/openings.json"), "utf8"),
);
const BOOK = buildBook(DATA);

/** Append the positions reached by `sans` to `entries`, as the app records them. */
function play(entries, sans) {
	let pos = parseFEN(entries[entries.length - 1].fen);
	for (const s of sans) {
		const move = parseMove(pos, s);
		if (move == null) throw new Error(`illegal move ${s}`);
		const san = sanMove(pos, move, genMoves(pos));
		pos = doMove(pos, move.from, move.to, move.p);
		entries.push(historyEntry(generateFEN(pos), null, move, san));
	}
	return entries;
}

const line = (sans, start = START) => play([historyEntry(start)], sans);

/** Give entry `i` an evaluation, from the side to move's point of view. */
function evaluate(history, i, score, move = null) {
	history[i].evaluation = {
		score,
		depth: 10,
		black: history[i].fen.indexOf(" b ") > 0,
		move,
	};
}

describe("winChance", () => {
	test("is 50 at equality, symmetric, and certain for a mate", () => {
		expect(winChance(0)).toBe(50);
		expect(winChance(300) + winChance(-300)).toBeCloseTo(100, 10);
		expect(winChance(999999)).toBe(100);
		expect(winChance(-999999)).toBe(0);
	});
});

describe("categoryFor", () => {
	test("a loss on a threshold falls into the worse category", () => {
		expect(THRESHOLDS).toEqual({
			excellent: 2,
			good: 5,
			inaccuracy: 10,
			mistake: 20,
		});
		expect(categoryFor(1.99)).toBe("Excellent");
		expect(categoryFor(2)).toBe("Good");
		expect(categoryFor(5)).toBe("Inaccuracy");
		expect(categoryFor(10)).toBe("Mistake");
		expect(categoryFor(20)).toBe("Blunder");
	});

	test("the categories come in display order", () => {
		expect(CATEGORIES).toEqual([
			"Best Move",
			"Excellent",
			"Good",
			"Book",
			"Inaccuracy",
			"Mistake",
			"Blunder",
		]);
	});
});

describe("sameMove", () => {
	const e7e8 = { from: { x: 4, y: 1 }, to: { x: 4, y: 0 } };
	test("a missing promotion piece means a queen", () => {
		expect(sameMove({ ...e7e8, p: null }, e7e8)).toBe(true);
		expect(sameMove({ ...e7e8, p: "Q" }, { ...e7e8, p: "q" })).toBe(true);
		expect(sameMove({ ...e7e8, p: "N" }, e7e8)).toBe(false);
	});

	test("different squares differ", () => {
		expect(sameMove(moveFromString("e2e4"), moveFromString("e2e3"))).toBe(
			false,
		);
	});
});

describe("gradeMove", () => {
	test("nothing to grade at the first entry or after a move-less entry", () => {
		const h = line(["e4"]);
		evaluate(h, 0, 0);
		evaluate(h, 1, 0);
		expect(gradeMove(h, 0, null)).toBeNull();
		h[1].move = null;
		expect(gradeMove(h, 1, null)).toBeNull();
	});

	test("an entry is ungraded until both of its positions are evaluated", () => {
		const h = line(["e4"]);
		evaluate(h, 0, 20);
		expect(gradeMove(h, 1, null)).toBeNull();
		h[0].evaluation = null;
		evaluate(h, 1, -20);
		expect(gradeMove(h, 1, null)).toBeNull();
	});

	test("the engine's own choice is the Best Move", () => {
		const h = line(["e4"]);
		evaluate(h, 0, 30, moveFromString("e2e4"));
		evaluate(h, 1, -250);
		expect(gradeMove(h, 1, null)).toEqual({ category: "Best Move", loss: 0 });
	});

	test("checkmate is the Best Move without a score after it", () => {
		const h = line(["e4", "e5", "Qh5", "Nc6", "Bc4", "Nf6", "Qxf7#"]);
		expect(h[7].san).toBe("Qxf7#");
		evaluate(h, 6, 999999, moveFromString("d2d3"));
		expect(gradeMove(h, 7, null)).toEqual({ category: "Best Move", loss: 0 });
	});

	test("losing 300 cp costs less in a won position than in an equal one", () => {
		const won = line(["e4"]);
		evaluate(won, 0, 900);
		evaluate(won, 1, -600);
		const equal = line(["e4"]);
		evaluate(equal, 0, 0);
		evaluate(equal, 1, 300);
		const a = gradeMove(won, 1, null);
		const b = gradeMove(equal, 1, null);
		expect(a.category).toBe("Inaccuracy");
		expect(b.category).toBe("Blunder");
		expect(a.loss).toBeLessThan(b.loss);
	});

	test("book moves need no evaluation", () => {
		const h = line(["e4", "e5", "Nf3", "Nc6", "Bb5"]);
		for (let i = 1; i < h.length; i++)
			expect(gradeMove(h, i, BOOK)).toEqual({ category: "Book", loss: 0 });
	});

	test("once a move leaves book, a return to a book position is not Book", () => {
		const h = line(["Nf3", "Nf6", "Ng1", "Ng8"]);
		expect(isBookPosition(BOOK, h[3].fen)).toBe(false);
		expect(isBookPosition(BOOK, h[4].fen)).toBe(true);
		for (let i = 0; i < h.length; i++) evaluate(h, i, 0);
		expect(gradeMove(h, 4, BOOK).category).not.toBe("Book");
	});

	test("a game from a custom position has no Book moves", () => {
		const h = line(["e4", "Kd7"], "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1");
		for (let i = 0; i < h.length; i++) evaluate(h, i, 0);
		expect(gradeMove(h, 1, BOOK).category).not.toBe("Book");
		expect(gradeMove(h, 2, BOOK).category).not.toBe("Book");
	});

	test("after a FEN jump, a move into book is not Book", () => {
		const h = line(["e4", "e5"]);
		const jumped = line(["e4", "e5", "Nf3"])[3].fen;
		h.push(historyEntry(jumped));
		play(h, ["Nc6"]);
		expect(isBookPosition(BOOK, h[4].fen)).toBe(true);
		for (let i = 0; i < h.length; i++) evaluate(h, i, 0);
		expect(gradeMove(h, 3, BOOK)).toBeNull();
		expect(gradeMove(h, 4, BOOK).category).not.toBe("Book");
	});
});

describe("gradeGame and summarize", () => {
	test("gradeGame has one slot per entry, the first always null", () => {
		const h = line(["e4", "e5", "Nf3", "Nc6", "Bb5", "Ke7"]);
		for (let i = 0; i < h.length; i++) evaluate(h, i, 0);
		const grades = gradeGame(h, BOOK);
		expect(grades.length).toBe(h.length);
		expect(grades[0]).toBeNull();
		expect(grades[5]).toEqual({ category: "Book", loss: 0 });
		expect(grades[6]).toEqual(gradeMove(h, 6, BOOK));
		expect(grades[6].category).not.toBe("Book");
	});

	test("summarize counts per side, plus graded and total", () => {
		const h = line(["e4", "e5", "Nf3"]);
		const grades = [
			null,
			{ category: "Best Move", loss: 0 },
			{ category: "Blunder", loss: 30 },
			null,
		];
		const s = summarize(grades, h);
		expect(s.white["Best Move"]).toBe(1);
		expect(s.black.Blunder).toBe(1);
		expect(s.white.Blunder).toBe(0);
		expect(Object.keys(s.white)).toEqual(CATEGORIES);
		expect(s.graded).toBe(2);
		expect(s.total).toBe(3);
	});

	test("a 400-ply game grades quickly", () => {
		const h = [historyEntry(START)];
		for (let n = 0; n < 100; n++) play(h, ["Nf3", "Nf6", "Ng1", "Ng8"]);
		for (let i = 0; i < h.length; i++) evaluate(h, i, 0);
		gradeGame(h, BOOK);
		const t = performance.now();
		const grades = gradeGame(h, BOOK);
		expect(performance.now() - t).toBeLessThan(100);
		expect(grades.filter((g) => g != null).length).toBe(400);
	});
});

describe("bestMoveSan", () => {
	test("names the engine's move in the position before the move", () => {
		const h = line(["e4", "e5", "Qh5", "Nc6", "Bc4", "Nf6"]);
		evaluate(h, 5, -30, moveFromString("d8e7"));
		expect(bestMoveSan(h, 6)).toBe("Qe7");
	});

	test("is null without a move, or with one that is not legal there", () => {
		const h = line(["e4"]);
		expect(bestMoveSan(h, 1)).toBeNull();
		evaluate(h, 0, 0);
		expect(bestMoveSan(h, 1)).toBeNull();
		h[0].evaluation.move = moveFromString("e7e5");
		expect(bestMoveSan(h, 1)).toBeNull();
	});
});
