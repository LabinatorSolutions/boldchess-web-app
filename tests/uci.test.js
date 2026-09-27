/**
 * The UCI wrapper, driven against a fake Worker that records what it is sent.
 *
 * Stockfish 19 aborts its worker on some malformed FENs, so every position the
 * wrapper sends has to have been normalized first.
 */

import { afterAll, beforeAll, expect, test } from "bun:test";
import { loadEngine } from "../public/src/engine/uci.js";

const sent = [];
const workers = [];
let RealWorker;

beforeAll(() => {
	RealWorker = globalThis.Worker;
	globalThis.Worker = class {
		constructor() {
			workers.push(this);
		}
		postMessage(message) {
			sent.push(message);
		}
	};
});

afterAll(() => {
	globalThis.Worker = RealWorker;
});

test("positions are normalized before they reach the engine", () => {
	const engine = loadEngine();
	sent.length = 0;
	engine.eval(
		"rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e3 0 1",
		() => {},
	);
	expect(sent[0]).toBe(
		"position fen rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1",
	);
	expect(sent[1]).toBe(`go depth ${engine.depth}`);
});

test("a command without a listener does not cut off a running search", () => {
	const engine = loadEngine();
	const worker = workers[workers.length - 1];
	let answer = null;
	engine.eval(
		"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
		(str) => {
			answer = str;
		},
	);
	// Entering analysis mode sets the skill level while the loop searches.
	engine.send("setoption name Skill Level value 20");
	worker.onmessage({
		data: "info depth 1 seldepth 1 multipv 1 score cp 20 nodes 20 nps 20 time 1 pv e2e4",
	});
	worker.onmessage({ data: "bestmove e2e4 ponder e7e5" });
	expect(answer).toBe("bestmove e2e4 ponder e7e5");
});
