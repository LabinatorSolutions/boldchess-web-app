/**
 * The Opening window and the header segment, driven through the command box
 * like a user would. Rendering is asserted on the stub's text content; the
 * click actions on the history and the Revert snapshot.
 */

import { beforeAll, beforeEach, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { installDomStub } from "./dom-stub.js";

const DATA = JSON.parse(
	readFileSync(join(import.meta.dir, "../public/data/openings.json"), "utf8"),
);
const RUY_LOPEZ = "1. e4 e5 2. Nf3 Nc6 3. Bb5";

let dom;
let command;
let state;
let getCurFEN;
let refreshOpening;
let playLine;
let book;
let parseFEN;
let genMoves;
let sanMove;

const text = (id) => dom.getElementById(id).textContent;
const rows = () => dom.getElementById("openingMoves").children;
const lineIndex = (name) => DATA.findIndex(([, n]) => n === name);

beforeAll(async () => {
	dom = installDomStub();
	({ command } = await import("../public/src/commands.js"));
	({ state } = await import("../public/src/state.js"));
	({ getCurFEN } = await import("../public/src/game/position.js"));
	({ refreshOpening, playLine } = await import(
		"../public/src/ui/opening-view.js"
	));
	({ parseFEN } = await import("../public/src/chess/fen.js"));
	({ genMoves } = await import("../public/src/chess/rules.js"));
	({ sanMove } = await import("../public/src/chess/notation.js"));
	book = await import("../public/src/openings/book.js");
	book.useBook(book.buildBook(DATA));
});

beforeEach(() => {
	state.gameMode = 1;
	state.curmoves = [];
	command("reset");
});

test("the header and the window name the opening", () => {
	command(RUY_LOPEZ);
	refreshOpening();
	expect(text("openingInfo")).toContain("Ruy Lopez");
	expect(text("openingName")).toContain("Ruy Lopez");
	expect(rows().length).toBeGreaterThan(0);
});

test("leaving book keeps the name and says where", () => {
	command(`${RUY_LOPEZ} Ke7`);
	refreshOpening();
	expect(text("openingStatus")).toBe("Out of book after 3… Ke7");
	expect(dom.getElementById("openingInfo").className).toBe("outOfBook");
	expect(dom.getElementById("openingName").className).toBe("outOfBook");
	expect(rows().length).toBe(0);
});

test("the start position lists the book moves under No opening", () => {
	refreshOpening();
	expect(text("openingStatus")).toBe("No opening");
	expect(rows().length).toBe(20);
	expect(rows()[0].onclick).toBeDefined();
});

test("an unchanged position is not rebuilt, so focus and clicks survive", () => {
	command(RUY_LOPEZ);
	refreshOpening();
	const first = rows()[0];
	refreshOpening();
	expect(rows()[0]).toBe(first);
	state.gameMode = 2;
	refreshOpening();
	expect(rows()[0]).not.toBe(first);
});

test("a custom position has no opening", () => {
	command("8/8/8/4k3/8/8/8/4K3 w - - 0 1");
	refreshOpening();
	expect(text("openingStatus")).toBe("No opening");
	expect(text("openingInfo")).toBe("");
});

test("a named line plays as a variation and Revert restores the game", () => {
	command(RUY_LOPEZ);
	const fen = getCurFEN();
	const length = state.history.length;
	playLine(book.lineMoves(lineIndex("Ruy Lopez: Berlin Defense")));
	expect(state.history2).not.toBeNull();
	const found = book.openingAt(
		book.getBook(),
		state.history,
		state.historyindex,
	);
	expect(found.name).toBe("Ruy Lopez: Berlin Defense");
	command("revert");
	expect(state.history.length).toBe(length);
	expect(getCurFEN()).toBe(fen);
});

test("a second line keeps the first snapshot, so Revert returns to the game", () => {
	command(RUY_LOPEZ);
	const fen = getCurFEN();
	playLine(book.lineMoves(lineIndex("Ruy Lopez: Berlin Defense")));
	playLine(book.lineMoves(lineIndex("Sicilian Defense")));
	command("revert");
	expect(getCurFEN()).toBe(fen);
});

test("a continuation row plays its move as a variation", () => {
	command(RUY_LOPEZ);
	refreshOpening();
	// The board's render pass fills curmoves; it never runs under the stub.
	const pos = parseFEN(getCurFEN());
	const legal = genMoves(pos);
	state.curmoves = legal.map((move) => ({
		move,
		san: sanMove(pos, move, legal),
	}));
	const length = state.history.length;
	rows()[0].onclick();
	expect(state.history.length).toBe(length + 1);
	expect(state.history2).not.toBeNull();
});

test("in a game the name and the rows are not clickable", () => {
	command(RUY_LOPEZ);
	state.gameMode = 2;
	refreshOpening();
	expect(rows().length).toBeGreaterThan(0);
	for (const row of rows()) expect(row.onclick).toBeUndefined();
	const title = dom.getElementById("openingName").children[1];
	expect(title.onclick).toBeUndefined();
});
