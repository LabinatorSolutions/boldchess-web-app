/**
 * Pre-moves: the squares a piece may pre-move to, queueing one on the
 * engine's turn, and playing or dropping it after the engine's reply.
 *
 * The flow runs under the DOM stub, whose `requestAnimationFrame` never fires,
 * so the engine's reply is put on the board by hand and `playPremove` is
 * called directly, as `doComputerMove` does a frame after its reply.
 */

import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { installDomStub } from "./dom-stub.js";

const AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
/** Black to move can take the d5 pawn; White's knight on c3 recaptures. */
const RECAPTURE =
	"rnbqkbnr/ppp1pppp/8/3P4/8/2N5/PPPP1PPP/R1BQKBNR b KQkq - 1 3";

let state;
let historyEntry;
let getCurFEN;
let setCurFEN;
let doMoveHandler;
let playPremove;
let historyAdd;
let historyMove;
let parseFEN;
let generateFEN;
let doMove;
let genMoves;
let sanMove;
let premoveTargets;
let shownPremove;

beforeAll(async () => {
	installDomStub();
	({ historyEntry, state } = await import("../public/src/state.js"));
	({ getCurFEN, setCurFEN } = await import("../public/src/game/position.js"));
	({ doMoveHandler, playPremove } = await import(
		"../public/src/input/mouse.js"
	));
	({ historyAdd, historyMove } = await import("../public/src/game/history.js"));
	({ parseFEN, generateFEN } = await import("../public/src/chess/fen.js"));
	({ doMove, genMoves } = await import("../public/src/chess/rules.js"));
	({ sanMove } = await import("../public/src/chess/notation.js"));
	({ premoveTargets, shownPremove } = await import(
		"../public/src/game/premove.js"
	));
});

/** `e2` as `{x: 4, y: 6}`. */
const sq = (name) => ({
	x: "abcdefgh".indexOf(name[0]),
	y: 8 - Number(name[1]),
});
const mv = (from, to) => ({ from: sq(from), to: sq(to) });
const names = (squares) =>
	squares.map(({ x, y }) => "abcdefgh"[x] + (8 - y)).sort();

/** List the legal moves of the position on the board, as `refreshMoves` does. */
function listMoves() {
	const pos = parseFEN(getCurFEN());
	const moves = genMoves(pos);
	state.curmoves = moves.map((move) => ({
		move,
		san: sanMove(pos, move, moves),
	}));
}

/** A game against the engine (it plays Black) at `fen`, Black to move. */
function setUp(fen) {
	state.gameMode = 2;
	state.play = 0;
	setCurFEN(fen);
	state.history = [historyEntry(fen)];
	state.historyindex = 0;
	state.history2 = null;
	state.premove = null;
	listMoves();
}

/** The engine plays `from`-`to`, the way `doComputerMove` records it. */
function engineReplies(from, to) {
	const before = parseFEN(getCurFEN());
	const move = mv(from, to);
	setCurFEN(generateFEN(doMove(before, move.from, move.to)));
	historyAdd(getCurFEN(), null, move, sanMove(before, move, genMoves(before)));
	listMoves();
}

beforeEach(() => {
	globalThis.localStorage.removeItem("promotionPiece");
	setUp(AFTER_E4);
});

describe("premoveTargets", () => {
	// Parsed per test: describe bodies run before beforeAll's imports.
	const start = () =>
		parseFEN("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");

	test("pawns push once or twice and take on both diagonals", () => {
		expect(names(premoveTargets(start(), sq("e2")))).toEqual([
			"d3",
			"e3",
			"e4",
			"f3",
		]);
		expect(names(premoveTargets(start(), sq("e7")))).toEqual([
			"d6",
			"e5",
			"e6",
			"f6",
		]);
	});

	test("sliding pieces ignore what is in the way", () => {
		// A rook in the corner reaches its whole file and rank.
		expect(premoveTargets(start(), sq("a1"))).toHaveLength(14);
		expect(names(premoveTargets(start(), sq("b1")))).toEqual([
			"a3",
			"c3",
			"d2",
		]);
	});

	test("the king castles only while it has the right", () => {
		expect(names(premoveTargets(start(), sq("e1")))).toContain("g1");
		expect(names(premoveTargets(start(), sq("e1")))).toContain("c1");
		const noRights = parseFEN(
			"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w kq - 0 1",
		);
		expect(names(premoveTargets(noRights, sq("e1")))).not.toContain("g1");
	});

	test("an empty square has none", () => {
		expect(premoveTargets(start(), sq("e4"))).toEqual([]);
	});
});

test("the player's move on the engine's turn is queued, not played", () => {
	expect(doMoveHandler(mv("g1", "f3"))).toBe(true);
	expect(state.premove).toEqual({ move: mv("g1", "f3"), fen: AFTER_E4 });
	expect(getCurFEN()).toBe(AFTER_E4);
	expect(state.history).toHaveLength(1);
	expect(shownPremove(AFTER_E4)).toEqual(mv("g1", "f3"));
});

test("a square the piece cannot reach is not a pre-move", () => {
	expect(doMoveHandler(mv("g1", "g3"))).toBe(false);
	expect(state.premove).toBeNull();
});

test("the queued move is played after the engine's reply", () => {
	doMoveHandler(mv("g1", "f3"));
	engineReplies("e7", "e5");
	playPremove(AFTER_E4);
	expect(state.premove).toBeNull();
	expect(state.history.map((e) => e.san)).toEqual([null, "e5", "Nf3"]);
	expect(getCurFEN().split(" ")[1]).toBe("b");
});

test("a recapture onto the player's own square is played", () => {
	setUp(RECAPTURE);
	expect(doMoveHandler(mv("c3", "d5"))).toBe(true);
	engineReplies("d8", "d5");
	playPremove(RECAPTURE);
	expect(state.history.map((e) => e.san)).toEqual([null, "Qxd5", "Nxd5"]);
});

test("a pre-move the reply made illegal is dropped", () => {
	doMoveHandler(mv("e4", "e5"));
	engineReplies("e7", "e5");
	const fen = getCurFEN();
	playPremove(AFTER_E4);
	expect(state.premove).toBeNull();
	expect(getCurFEN()).toBe(fen);
	expect(state.history).toHaveLength(2);
});

test("stepping through History cancels a pre-move", () => {
	doMoveHandler(mv("g1", "f3"));
	historyMove(0);
	expect(state.premove).toBeNull();
});

test("analysis has no pre-moves", () => {
	state.gameMode = 1;
	state.play = null;
	expect(doMoveHandler(mv("g1", "f3"))).toBe(false);
	expect(state.premove).toBeNull();
});
