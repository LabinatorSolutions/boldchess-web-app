/**
 * Test harness for the browser code.
 *
 * This is the only file that knows how the client is packaged. The chess core,
 * the UCI wrapper and the classical evaluation now live in public/src as ES
 * modules with no DOM dependencies, so they import directly - the same suite
 * that verified the monolith verifies the modules.
 */

import * as draws from "../public/src/chess/draws.js";
import * as fen from "../public/src/chess/fen.js";
import * as notation from "../public/src/chess/notation.js";
import * as rules from "../public/src/chess/rules.js";
import * as config from "../public/src/config.js";
import * as staticEval from "../public/src/eval/static-eval-list.js";
import * as terms from "../public/src/eval/terms.js";

/** The pure chess and evaluation surface under test. */
export function loadChessCore() {
	return {
		...config,
		...fen,
		...rules,
		...notation,
		...draws,
		...staticEval,
		...terms,
	};
}

/**
 * Count leaf nodes of the move tree - the standard chess correctness check.
 * Any change to move generation, castling, en passant or promotion that alters
 * behaviour shows up here immediately.
 */
export function perft(core, position, depth) {
	const moves = core.genMoves(position);
	if (depth <= 1) return moves.length;
	let nodes = 0;
	for (const move of moves) {
		nodes += perft(
			core,
			core.doMove(position, move.from, move.to, move.p),
			depth - 1,
		);
	}
	return nodes;
}
