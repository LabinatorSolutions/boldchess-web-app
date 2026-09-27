/**
 * Playing moves over the board: whose turn it is, promotions, the promotion
 * preference, draw detection and the analysis loop's start-up guard.
 *
 * These run under the DOM stub, whose `requestAnimationFrame` never fires, so
 * they assert on the state and the history rather than on rendering.
 */

import { beforeAll, beforeEach, expect, test } from "bun:test";
import { installDomStub } from "./dom-stub.js";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";

let dom;
let state;
let historyEntry;
let getCurFEN;
let setCurFEN;
let isThreefoldRepetition;
let gameDrawReason;
let togglePromotionPiece;
let getPromotionPiece;
let doMoveHandler;
let evalAll;
let getParameterByName;
let parseFEN;
let genMoves;
let sanMove;

beforeAll(async () => {
	dom = installDomStub();
	({ historyEntry, state } = await import("../public/src/state.js"));
	({
		getCurFEN,
		setCurFEN,
		isThreefoldRepetition,
		gameDrawReason,
		togglePromotionPiece,
		getPromotionPiece,
	} = await import("../public/src/game/position.js"));
	({ doMoveHandler } = await import("../public/src/input/mouse.js"));
	({ evalAll } = await import("../public/src/engine/analysis.js"));
	({ getParameterByName } = await import("../public/src/commands.js"));
	({ parseFEN } = await import("../public/src/chess/fen.js"));
	({ genMoves } = await import("../public/src/chess/rules.js"));
	({ sanMove } = await import("../public/src/chess/notation.js"));
});

/** List the legal moves of the position on the board, as `refreshMoves` does. */
function listMoves() {
	const pos = parseFEN(getCurFEN());
	const moves = genMoves(pos);
	state.curmoves = moves.map((move) => ({
		move,
		san: sanMove(pos, move, moves),
	}));
}

/** Put `fen` on the board as a fresh game, with its legal moves listed. */
function setUp(fen) {
	setCurFEN(fen);
	state.history = [historyEntry(fen)];
	state.historyindex = 0;
	state.history2 = null;
	listMoves();
}

beforeEach(() => {
	state.gameMode = 1; // analysis
	state.play = null;
	state.analysisEngine = undefined;
	globalThis.localStorage.removeItem("promotionPiece");
	setUp(START);
});

test("in play mode the player cannot move for the engine", () => {
	state.play = 0; // the player has White, the engine Black
	setUp(AFTER_E4);
	doMoveHandler({ from: { x: 4, y: 1 }, to: { x: 4, y: 3 } }); // ...e5
	expect(getCurFEN()).toBe(AFTER_E4);
	expect(state.history.length).toBe(1);
});

test("in play mode the player's own move is played", () => {
	state.play = 0;
	doMoveHandler({ from: { x: 4, y: 6 }, to: { x: 4, y: 4 } }); // e4
	expect(getCurFEN()).toContain("4P3");
	expect(state.history.length).toBe(2);
});

test("playing Black, the player cannot move White's pieces", () => {
	state.play = 1;
	doMoveHandler({ from: { x: 4, y: 6 }, to: { x: 4, y: 4 } });
	expect(getCurFEN()).toBe(START);
});

test("with nobody playing, both sides can be moved", () => {
	doMoveHandler({ from: { x: 4, y: 6 }, to: { x: 4, y: 4 } });
	listMoves();
	doMoveHandler({ from: { x: 4, y: 1 }, to: { x: 4, y: 3 } });
	expect(state.history.map((entry) => entry.san)).toEqual([null, "e4", "e5"]);
});

test("a promotion dragged on the board is recorded with its SAN", () => {
	setUp("8/4P3/8/8/8/8/k7/4K3 w - - 0 1");
	doMoveHandler({ from: { x: 4, y: 1 }, to: { x: 4, y: 0 } });
	expect(getCurFEN()).toBe("4Q3/8/8/8/8/8/k7/4K3 b - - 0 1");
	expect(state.history[1].san).toBe("e8=Q");
});

test("a dragged promotion honors the promotion preference", () => {
	globalThis.localStorage.setItem("promotionPiece", "N");
	setUp("8/4P3/8/8/8/8/k7/4K3 w - - 0 1");
	doMoveHandler({ from: { x: 4, y: 1 }, to: { x: 4, y: 0 } });
	expect(getCurFEN()).toBe("4N3/8/8/8/8/8/k7/4K3 b - - 0 1");
	expect(state.history[1].san).toBe("e8=N");
});

test("the promotion toggle works before the menu has ever been opened", () => {
	expect(getPromotionPiece()).toBe("Q");
	togglePromotionPiece();
	expect(getPromotionPiece()).toBe("N");
	togglePromotionPiece();
	expect(getPromotionPiece()).toBe("Q");
});

test("the promotion preference survives storage being unavailable", () => {
	const storage = globalThis.localStorage;
	globalThis.localStorage = {
		getItem() {
			throw new Error("SecurityError");
		},
		setItem() {
			throw new Error("SecurityError");
		},
	};
	try {
		expect(getPromotionPiece()).toBe("Q");
		expect(() => togglePromotionPiece()).not.toThrow();
	} finally {
		globalThis.localStorage = storage;
	}
});

test("threefold repetition only counts positions up to the one shown", () => {
	// Both knights out and back twice: the start position occurs three times.
	const moves = [
		[6, 7, 5, 5],
		[6, 0, 5, 2],
		[5, 5, 6, 7],
		[5, 2, 6, 0],
		[6, 7, 5, 5],
		[6, 0, 5, 2],
		[5, 5, 6, 7],
		[5, 2, 6, 0],
	];
	for (const [x1, y1, x2, y2] of moves)
		doMoveHandler({ from: { x: x1, y: y1 }, to: { x: x2, y: y2 } });
	expect(state.history.length).toBe(9);
	expect(isThreefoldRepetition()).toBe(true);

	// Browsing back to the first occurrence is not a repetition.
	state.historyindex = 0;
	setCurFEN(state.history[0].fen);
	expect(isThreefoldRepetition()).toBe(false);
	state.historyindex = 4;
	setCurFEN(state.history[4].fen);
	expect(isThreefoldRepetition()).toBe(false);
});

/** Shuffle both knights out and back `times` times from the start position. */
function shuffleKnights(times) {
	const cycle = [
		[6, 7, 5, 5],
		[6, 0, 5, 2],
		[5, 5, 6, 7],
		[5, 2, 6, 0],
	];
	for (let i = 0; i < times; i++)
		for (const [x1, y1, x2, y2] of cycle)
			doMoveHandler({ from: { x: x1, y: y1 }, to: { x: x2, y: y2 } });
}

test("in a game, threefold repetition is an immediate draw", () => {
	state.gameMode = 4; // two players
	shuffleKnights(1); // the start position has occurred twice
	expect(gameDrawReason()).toBeNull();
	shuffleKnights(1); // three times
	expect(gameDrawReason()).toBe("Threefold Repetition");
});

test("in a game, the fifty-move rule is an immediate draw", () => {
	state.gameMode = 2; // playing White against the engine
	setUp("8/8/8/4k3/8/8/4K3/6R1 w - - 100 80");
	expect(gameDrawReason()).toBe("50-Move Rule");
	setUp("8/8/8/4k3/8/8/4K3/6R1 w - - 99 80");
	expect(gameDrawReason()).toBeNull();
});

test("in a game, a dead position is a draw", () => {
	state.gameMode = 3;
	setUp("8/8/8/4k3/8/8/4K3/6N1 w - - 0 80");
	expect(gameDrawReason()).toBe("Insufficient Material");
});

test("analysis never declares a draw", () => {
	shuffleKnights(4); // the start position has occurred five times
	expect(gameDrawReason()).toBeNull();
	setUp("8/8/8/4k3/8/8/4K3/6R1 w - - 150 120");
	expect(gameDrawReason()).toBeNull();
	setUp("8/8/8/4k3/8/8/4K3/8 w - - 0 80");
	expect(gameDrawReason()).toBeNull();
});

test("the analysis loop gives up on an engine that failed to start", () => {
	let retries = 0;
	const setTimeout = globalThis.window.setTimeout;
	globalThis.window.setTimeout = () => {
		retries++;
		return 0;
	};
	try {
		state.analysisEngine = { failed: true, ready: false, waiting: true };
		evalAll();
		expect(retries).toBe(0);
	} finally {
		globalThis.window.setTimeout = setTimeout;
	}
});

test("a malformed startup parameter is ignored instead of throwing", () => {
	expect(getParameterByName("a", "http://localhost/?a=%E0%A4%A")).toBe("");
	expect(getParameterByName("a", "http://localhost/?a=col2")).toBe("col2");
	expect(dom.alerts).toEqual([]);
});
