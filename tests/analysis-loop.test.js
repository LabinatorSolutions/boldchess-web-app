/**
 * The background analysis loop (`evalNext`) against a fake engine that holds
 * each search until the test answers it.
 *
 * `showBoard` rebuilds the move list one frame after it starts the analysis,
 * so a very fast search (a mate in one) can finish on the old list. The
 * answer is then stale, and the loop must drop it and carry on with the list
 * and history as they are now, not stop.
 */

import { beforeAll, beforeEach, expect, test } from "bun:test";
import { installDomStub } from "./dom-stub.js";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
const AFTER_D4 = "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1";
const AFTER_C4 = "rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq - 0 1";

let state;
let historyEntry;
let evalNext;
let setCurFEN;
/** Searches the fake engine was asked for, oldest first. */
let searches;

beforeAll(async () => {
	installDomStub();
	({ historyEntry, state } = await import("../public/src/state.js"));
	({ evalNext } = await import("../public/src/engine/analysis.js"));
	({ setCurFEN } = await import("../public/src/game/position.js"));
});

beforeEach(() => {
	searches = [];
	state.play = null;
	state.analysisEngine = {
		ready: true,
		waiting: true,
		kill: false,
		depth: 10,
		score: null,
		send() {},
		eval(fen, done) {
			searches.push({ fen, done });
		},
	};
	setCurFEN(START);
	state.history = [historyEntry(START)];
	state.historyindex = 0;
});

/** Answer the latest search, as Stockfish's final line does. */
function answer(score = 20) {
	state.analysisEngine.score = score;
	searches[searches.length - 1].done("bestmove e7e5");
}

const move = (fen) => ({ fen, w: false, eval: null, depth: 0 });

test("a stale move search is dropped and the loop goes on", () => {
	state.curmoves = [move(AFTER_E4)];
	evalNext();
	expect(searches.map((s) => s.fen)).toEqual([AFTER_E4]);
	state.curmoves = [move(AFTER_D4)]; // the list was rebuilt meanwhile
	answer();
	expect(searches.map((s) => s.fen)).toEqual([AFTER_E4, AFTER_D4]);
	expect(state.curmoves[0].depth).toBe(0);
});

test("a stale history search is dropped and the loop goes on", () => {
	state.curmoves = [];
	state.history = [historyEntry(START), historyEntry(AFTER_E4)];
	state.historyindex = 1;
	setCurFEN(AFTER_E4);
	evalNext();
	expect(searches.map((s) => s.fen)).toEqual([AFTER_E4]);
	state.history[1] = historyEntry(AFTER_C4); // the history changed meanwhile
	setCurFEN(AFTER_C4);
	answer();
	expect(searches.map((s) => s.fen)).toEqual([AFTER_E4, AFTER_C4]);
	expect(state.history[1].evaluation).toBeNull();
});
