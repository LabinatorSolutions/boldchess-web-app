/**
 * Grades in the UI: the History marks, the graph colors and the Game Report
 * window, on a loaded game whose evaluations are set by hand.
 */

import { beforeAll, beforeEach, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { installDomStub } from "./dom-stub.js";

const DATA = JSON.parse(
	readFileSync(join(import.meta.dir, "../public/data/openings.json"), "utf8"),
);
/** Book up to 3.Bc4; 3...Nf6?? allows 4.Qxf7#. */
const GAME = "1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6";

let dom;
let command;
let state;
let updateInfo;
let getGraphPointColor;
let refreshReport;
let historyMove;
let book;

beforeAll(async () => {
	dom = installDomStub();
	({ command } = await import("../public/src/commands.js"));
	({ state } = await import("../public/src/state.js"));
	({ updateInfo } = await import("../public/src/ui/board.js"));
	({ getGraphPointColor } = await import("../public/src/ui/graph.js"));
	({ refreshReport } = await import("../public/src/ui/report-view.js"));
	({ historyMove } = await import("../public/src/game/history.js"));
	book = await import("../public/src/openings/book.js");
	book.useBook(book.buildBook(DATA));
});

beforeEach(() => {
	state.gameMode = 1;
	state.curmoves = [];
	command("reset");
});

/** Load GAME with every position evaluated; the engine never agrees with the moves. */
function loadGame() {
	command(GAME);
	const scores = [0, 0, 0, 0, 0, -30, 999999];
	state.history.forEach((entry, i) => {
		entry.evaluation = {
			score: scores[i],
			depth: 10,
			black: entry.fen.indexOf(" b ") > 0,
			move: book.moveFromString("a2a3"),
		};
	});
}

/** The History span of a move, found by its SAN. */
function historySpan(san) {
	return dom
		.getElementById("history")
		.children.find((span) => span.textContent.startsWith(san));
}

test("the game leaves book at 3...Nf6", () => {
	loadGame();
	expect(state.history.length).toBe(7);
	expect(book.isBookPosition(book.getBook(), state.history[5].fen)).toBe(true);
	expect(book.isBookPosition(book.getBook(), state.history[6].fen)).toBe(false);
});

test("History marks a blunder and colors it", () => {
	loadGame();
	updateInfo();
	expect(dom.getElementById("history").textContent).toContain("Nf6??");
	const nf6 = historySpan("Nf6");
	expect(nf6.style.borderBottomColor).toBe("#bb0000");
	expect(nf6.title.startsWith("Blunder (−")).toBe(true);
});

test("History titles book moves and leaves them uncolored", () => {
	loadGame();
	updateInfo();
	const e4 = historySpan("e4");
	expect(e4.title).toBe("Book");
	expect(e4.style.borderBottomColor).toBe("");
});

test("the graph colors a point by its grade", () => {
	loadGame();
	expect(getGraphPointColor(6)).toBe("#bb0000");
	expect(getGraphPointColor(1)).toBe("#008800");
});

test("an ungraded graph point falls back to the pawn-loss color", () => {
	loadGame();
	state.history[6].evaluation = null;
	expect(getGraphPointColor(6)).toBe("#008800");
});

const text = (id) => dom.getElementById(id).textContent;
/** The report table's row for `category`, as [label, white, black] texts. */
function tableRow(category) {
	const row = dom
		.getElementById("reportTable")
		.children.find((r) => r.children[0]?.textContent === category);
	return row?.children.map((cell) => cell.textContent);
}

test("the status counts graded moves until all are", () => {
	loadGame();
	refreshReport();
	expect(text("reportStatus")).toBe("");
	state.history[6].evaluation = null;
	refreshReport();
	expect(text("reportStatus")).toBe("Analyzing\u2026 5 of 6 moves graded");
	command("reset");
	refreshReport();
	expect(text("reportStatus")).toBe("No moves to grade");
});

test("the status says so when the engine does not analyze", () => {
	loadGame();
	state.history[6].evaluation = null;
	state.play = 0;
	state.coachMode = false;
	try {
		refreshReport();
		expect(text("reportStatus")).toBe(
			"Engine analysis is off: 5 of 6 moves graded",
		);
	} finally {
		state.play = null;
	}
});

test("the table counts each category per side", () => {
	loadGame();
	refreshReport();
	expect(tableRow("Blunder")).toEqual(["Blunder", "0", "1"]);
	expect(tableRow("Book")).toEqual(["Book", "3", "2"]);
	const blunderRow = dom
		.getElementById("reportTable")
		.children.find((r) => r.children[0]?.textContent === "Blunder");
	expect(blunderRow.className).toContain("blunder");
});

test("an error row names the move and jumps to it", () => {
	loadGame();
	historyMove(-4);
	expect(state.historyindex).toBe(2);
	refreshReport();
	const rows = dom.getElementById("reportErrors").children;
	expect(rows.length).toBe(1);
	expect(rows[0].textContent.startsWith("3\u2026 Nf6?? Blunder (\u2212")).toBe(
		true,
	);
	rows[0].onclick();
	expect(state.historyindex).toBe(6);
});

test("an unchanged report is not rebuilt, a deeper evaluation is", () => {
	loadGame();
	refreshReport();
	const first = dom.getElementById("reportErrors").children[0];
	refreshReport();
	expect(dom.getElementById("reportErrors").children[0]).toBe(first);
	state.history[6].evaluation.depth = 12;
	refreshReport();
	expect(dom.getElementById("reportErrors").children[0]).not.toBe(first);
});
