/** Thin UCI wrapper around the Stockfish Web Worker. Contains no DOM access. */

import { DEFAULT_DEPTH } from "../config.js";

export function loadEngine(onReady) {
	const engine = {
		ready: false,
		/** Set when the worker could not be started; the engine is inert. */
		failed: false,
		kill: false,
		waiting: true,
		depth: DEFAULT_DEPTH,
		lastnodes: 0,
	};

	// Without a usable worker the engine stays inert rather than half-built:
	// callers would otherwise hit "engine.send is not a function".
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
		worker = new Worker("./engine/stockfish-18-lite.js");
	} catch (error) {
		return disable(error.message);
	}
	worker.onmessage = (e) => {
		if (engine.messagefunc) engine.messagefunc(e.data);
	};
	engine.send = function send(cmd, message) {
		cmd = String(cmd).trim();
		engine.messagefunc = message;
		worker.postMessage(cmd);
	};
	engine.eval = function evaluate(fen, done, info) {
		engine.send(`position fen ${fen}`);
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
