/**
 * The history entries themselves.
 *
 * `historyAdd` and `addHistoryEval` are the only two places that build and fill
 * in an entry, so between them they pin the `{fen, evaluation, move, san}`
 * shape the rest of the UI reads.
 */

import { beforeAll, beforeEach, expect, test } from "bun:test";
import { installDomStub } from "./dom-stub.js";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";

let state;
let historyEntry;
let historyAdd;
let addHistoryEval;
let setCurFEN;

beforeAll(async () => {
	installDomStub();
	({ historyEntry, state } = await import("../public/src/state.js"));
	({ historyAdd } = await import("../public/src/game/history.js"));
	({ addHistoryEval } = await import("../public/src/engine/analysis.js"));
	({ setCurFEN } = await import("../public/src/game/position.js"));
});

beforeEach(() => {
	setCurFEN(START);
	state.history = [historyEntry(START)];
	state.historyindex = 0;
	state.history2 = null;
	state.analysisEngine = { ready: true, depth: 16 };
});

test("a new entry carries the fen, the move and its SAN", () => {
	const move = { from: { x: 4, y: 6 }, to: { x: 4, y: 4 }, p: null };
	historyAdd(AFTER_E4, null, move, "e4");
	expect(state.history.length).toBe(2);
	expect(state.history[1]).toEqual({
		fen: AFTER_E4,
		evaluation: null,
		move,
		san: "e4",
	});
	expect(state.historyindex).toBe(1);
});

test("re-adding the position already shown is ignored", () => {
	historyAdd(START, null, null, null);
	expect(state.history.length).toBe(1);
	expect(state.historyindex).toBe(0);
});

test("adding from the middle of the game drops the moves that followed", () => {
	historyAdd(AFTER_E4, null, null, "e4");
	historyAdd("8/8/8/4k3/8/8/4K3/8 w - - 0 1", null, null, null);
	state.historyindex = 0;
	historyAdd(AFTER_E4, null, null, "e4");
	expect(state.history.length).toBe(2);
	expect(state.history[1].fen).toBe(AFTER_E4);
});

test("a replayed position recovers the evaluation it already had", () => {
	const evaluation = { score: 31, depth: 20, black: true, move: null };
	const oldhistory = [historyEntry(START), historyEntry(AFTER_E4, evaluation)];
	historyAdd(AFTER_E4, oldhistory, null, "e4");
	expect(state.history[1].evaluation).toBe(evaluation);
});

test("a move played over the board snapshots the mainline first", () => {
	historyAdd(AFTER_E4, null, null, "e4");
	expect(state.history2).toEqual({ index: 0, entries: [historyEntry(START)] });
	// Only the first move off the mainline takes a snapshot.
	const snapshot = state.history2;
	historyAdd("8/8/8/4k3/8/8/4K3/8 w - - 0 1", null, null, null);
	expect(state.history2).toBe(snapshot);
});

test("an evaluation is recorded against the entry it belongs to", () => {
	historyAdd(AFTER_E4, null, null, "e4");
	addHistoryEval(1, 42, 12, null);
	expect(state.history[1].evaluation).toEqual({
		score: 42,
		depth: 12,
		black: true,
		move: null,
	});
	expect(state.history[1].san).toBe("e4");
});

test("a deeper search replaces the evaluation, a shallower one does not", () => {
	addHistoryEval(0, 10, 12, null);
	addHistoryEval(0, 20, 18, null);
	expect(state.history[0].evaluation.score).toBe(20);
	addHistoryEval(0, 30, 6, null);
	expect(state.history[0].evaluation.score).toBe(20);
});

test("the evaluation records which side was to move", () => {
	addHistoryEval(0, 10, 12, null);
	expect(state.history[0].evaluation.black).toBe(false);
	historyAdd(AFTER_E4, null, null, "e4");
	addHistoryEval(1, 10, 12, null);
	expect(state.history[1].evaluation.black).toBe(true);
});
