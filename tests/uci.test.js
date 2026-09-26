/**
 * The UCI wrapper, driven against a fake Worker that records what it is sent.
 *
 * Stockfish 19 aborts its worker on some malformed FENs, so every position the
 * wrapper sends has to have been normalised first.
 */

import { afterAll, beforeAll, expect, test } from "bun:test";
import { loadEngine } from "../public/src/engine/uci.js";

const sent = [];
let RealWorker;

beforeAll(() => {
	RealWorker = globalThis.Worker;
	globalThis.Worker = class {
		postMessage(message) {
			sent.push(message);
		}
	};
});

afterAll(() => {
	globalThis.Worker = RealWorker;
});

test("positions are normalised before they reach the engine", () => {
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
