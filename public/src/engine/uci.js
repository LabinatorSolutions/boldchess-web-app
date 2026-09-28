/** Thin UCI wrapper around the Stockfish Web Worker. Contains no DOM access. */

import { generateFEN, parseFEN } from "../chess/fen.js";
import { DEFAULT_DEPTH } from "../config.js";

/**
 * @typedef {object} Engine
 * @property {boolean} ready
 * @property {boolean} failed Set when the worker could not be started; the engine is inert.
 * @property {boolean} kill
 * @property {boolean} waiting
 * @property {number} depth
 * @property {number} lastnodes
 * @property {string} [fen] The position the running search's output belongs to.
 * @property {number | null} [score] The search's latest score, for the side to move.
 * @property {(str: string) => void} [messagefunc]
 * @property {(cmd: string, message?: (str: string) => void) => void} send
 * @property {(fen: string, done: (str: string) => void, info?: (depth: number, score: number, pv: string[]) => void) => void} eval
 */

/**
 * @param {(engine: Engine) => void} [onReady]
 * @returns {Engine}
 */
export function loadEngine(onReady) {
	const engine = /** @type {Engine} */ ({
		ready: false,
		/** Set when the worker could not be started; the engine is inert. */
		failed: false,
		kill: false,
		waiting: true,
		depth: DEFAULT_DEPTH,
		lastnodes: 0,
	});

	// Without a usable worker the engine stays inert rather than half-built:
	// callers would otherwise hit "engine.send is not a function".
	/** @param {string} reason */
	function disable(reason) {
		console.error("Chess engine unavailable:", reason);
		engine.failed = true;
		engine.send = () => {};
		engine.eval = () => {};
		return engine;
	}

	if (typeof Worker === "undefined") {
		return disable("this browser has no Web Worker support");
	}
	let worker;
	try {
		worker = new Worker("./engine/stockfish-19-lite.js");
	} catch (error) {
		return disable(error instanceof Error ? error.message : String(error));
	}
	worker.onmessage = (e) => {
		if (engine.messagefunc) engine.messagefunc(e.data);
	};
	engine.send = function send(cmd, message) {
		cmd = String(cmd).trim();
		// A command without a listener (setoption, stop) leaves the current one
		// in place: replacing it would swallow a running search's bestmove, its
		// done() would never fire, and the analysis loop would wait forever.
		if (message !== undefined) engine.messagefunc = message;
		worker.postMessage(cmd);
	};
	engine.eval = function evaluate(fen, done, info) {
		// Round-trip through the parser so nothing malformed reaches the engine:
		// Stockfish 19 aborts its worker (for good) on an invalid FEN. `fen`
		// itself stays the key the callbacks below compare against.
		engine.send(`position fen ${generateFEN(parseFEN(fen))}`);
		engine.send(`go depth ${engine.depth}`, function message(str) {
			let matches = str.match(
				/depth (\d+) .*score (cp|mate) ([-\d]+) .*nodes (\d+) .*pv (.+)/,
			);
			if (!matches)
				matches = str.match(/depth (\d+) .*score (cp|mate) ([-\d]+).*/);
			if (matches) {
				if (engine.lastnodes === 0) engine.fen = fen;
				if (matches.length > 4) {
					const nodes = Number(matches[4]);
					if (nodes < engine.lastnodes) engine.fen = fen;
					engine.lastnodes = nodes;
				}
				const depth = Number(matches[1]);
				const type = matches[2];
				let score = Number(matches[3]);
				if (type === "mate")
					score = (1000000 - Math.abs(score)) * (score <= 0 ? -1 : 1);
				engine.score = score;
				if (matches.length > 5) {
					const pv = matches[5].split(" ");
					if (info != null && engine.fen === fen) info(depth, score, pv);
				}
			}
			if (
				str.indexOf("bestmove") >= 0 ||
				str.indexOf("mate 0") >= 0 ||
				str === "info depth 0 score cp 0"
			) {
				if (engine.fen === fen) done(str);
				engine.lastnodes = 0;
			}
		});
	};
	engine.send("uci", function onuci(str) {
		if (str === "uciok") {
			engine.send("isready", function onready(str) {
				if (str === "readyok") {
					engine.ready = true;
					if (onReady) onReady(engine);
				}
			});
		}
	});
	return engine;
}
