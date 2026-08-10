/** Driving the engines: analysing the current position and playing moves. */

import { generateFEN, parseFEN } from "../chess/fen.js";
import { sanMove } from "../chess/notation.js";
import { checkPosition, doMove, genMoves } from "../chess/rules.js";
import { historyAdd } from "../game/history.js";
import { getCurFEN, setCurFEN } from "../game/position.js";
import { state } from "../state.js";
import { showBoard } from "../ui/board.js";
import { repaintGraph } from "../ui/graph.js";
import { requestInfoUpdate } from "../ui/layout.js";
import { showEvals } from "../ui/moves.js";
import { updateTooltip } from "../ui/tooltip.js";
import { ensurePlayEngine } from "./engines.js";

export function addHistoryEval(index, score, depth, move) {
	const entry = state.history[index];
	if (entry.evaluation == null || entry.evaluation.depth < depth) {
		const black = entry.fen.indexOf(" b ") > 0;
		entry.evaluation = { score: score, depth: depth, black: black, move: move };
		repaintGraph();
		requestInfoUpdate();
	}
}

export function evalNext() {
	for (let i = 0; i < state.curmoves.length; i++) {
		if (state.curmoves[i].depth < state.analysisEngine.depth) {
			const curpos = state.curmoves[i].fen;
			state.analysisEngine.score = null;
			if (!state.analysisEngine.waiting) return;
			state.analysisEngine.waiting = false;
			const initialdepth = state.analysisEngine.depth;
			let savedpv = [];
			state.analysisEngine.eval(
				curpos,
				function done(str) {
					state.analysisEngine.waiting = true;
					if (i >= state.curmoves.length || state.curmoves[i].fen !== curpos)
						return;
					if (
						state.analysisEngine.score != null &&
						state.analysisEngine.depth === initialdepth
					) {
						state.curmoves[i].eval = state.curmoves[i].w
							? state.analysisEngine.score
							: -state.analysisEngine.score;
						state.curmoves[i].depth = state.analysisEngine.depth;
						const m = str.match(/^bestmove\s(\S+)(?:\sponder\s(\S+))?/);
						state.curmoves[i].answer =
							m &&
							m.length > 1 &&
							m[1] != null &&
							(m[1].length === 4 || m[1].length === 5)
								? m[1]
								: null;
						state.curmoves[i].answerpv = [];
						let pvtext = "";
						if (state.curmoves[i].answer != null) {
							if (savedpv.length < 1 || savedpv[0] !== m[1]) savedpv = [m[1]];
							if (
								m.length > 2 &&
								m[2] != null &&
								m[2].length !== 4 &&
								m[2].length !== 5
							) {
								if (savedpv.length < 2 || savedpv[1] !== m[2])
									savedpv = [m[1], m[2]];
							}
							let nextpos = parseFEN(curpos);
							for (let j = 0; j < savedpv.length; j++) {
								if (pvtext.length > 0) pvtext += " ";
								const move = parseBestMove(savedpv[j]);
								pvtext += sanMove(nextpos, move, genMoves(nextpos));
								state.curmoves[i].answerpv.push(savedpv[j]);
								if (j + 1 < savedpv.length)
									nextpos = doMove(nextpos, move.from, move.to, move.p);
							}
						}
						state.curmoves[i].pvtext = pvtext.length > 0 ? pvtext : "-";
						showEvals();
					}
					if (!state.analysisEngine.kill) evalNext();
				},
				function info(_depth, _score, pv) {
					savedpv = pv;
				},
			);
			return;
		}
	}
	if (
		state.curmoves.length > 0 &&
		state.history[state.historyindex].fen === getCurFEN()
	)
		addHistoryEval(
			state.historyindex,
			state.curmoves[0].w ? -state.curmoves[0].eval : state.curmoves[0].eval,
			state.analysisEngine.depth,
			state.curmoves[0].move,
		);
	for (let i = state.history.length - 1; i >= 0; i--) {
		if (
			state.history[i].evaluation == null ||
			state.history[i].evaluation.depth < state.analysisEngine.depth - 1
		) {
			const curpos = state.history[i].fen;
			state.analysisEngine.score = null;
			if (!state.analysisEngine.waiting) return;
			if (checkPosition(parseFEN(curpos)).length > 0) {
				addHistoryEval(i, null, state.analysisEngine.depth - 1);
				if (!state.analysisEngine.kill) evalNext();
			} else {
				state.analysisEngine.waiting = false;
				state.analysisEngine.eval(curpos, function done(str) {
					state.analysisEngine.waiting = true;
					if (i >= state.history.length || state.history[i].fen !== curpos)
						return;
					if (state.analysisEngine.score != null) {
						const m = str.match(/^bestmove\s(\S+)(?:\sponder\s(\S+))?/);
						const answer =
							m && m.length > 1 && (m[1].length === 4 || m[1].length === 5)
								? m[1]
								: null;
						addHistoryEval(
							i,
							state.analysisEngine.score,
							state.analysisEngine.depth - 1,
							parseBestMove(answer),
						);
					}
					if (!state.analysisEngine.kill) evalNext();
				});
			}
			return;
		}
	}
}

export function applyEval(m, s, d) {
	if (s == null || m.length < 4 || state.analysisEngine.depth === 0) return;
	for (let i = 0; i < state.curmoves.length; i++) {
		if (
			state.curmoves[i].move.from.x === "abcdefgh".indexOf(m[0]) &&
			state.curmoves[i].move.from.y === "87654321".indexOf(m[1]) &&
			state.curmoves[i].move.to.x === "abcdefgh".indexOf(m[2]) &&
			state.curmoves[i].move.to.y === "87654321".indexOf(m[3])
		) {
			if (d > state.curmoves[i].depth) {
				state.curmoves[i].eval = state.curmoves[i].w ? -s : s;
				state.curmoves[i].depth = d;
				showEvals();
			}
			break;
		}
	}
}

export function parseBestMove(m) {
	if (m == null || m.length < 4) return null;
	const from = {
		x: "abcdefgh".indexOf(m[0]),
		y: "87654321".indexOf(m[1]),
	};
	const to = {
		x: "abcdefgh".indexOf(m[2]),
		y: "87654321".indexOf(m[3]),
	};
	const p = m.length > 4 ? "nbrq".indexOf(m[4]) : -1;
	if (p < 0)
		return {
			from: from,
			to: to,
		};
	return {
		from: from,
		to: to,
		p: "NBRQ"[p],
	};
}

export function updateSkillLevelBasedOnDepth(depth) {
	let skillLevel;
	if (depth >= 1 && depth <= 10) {
		skillLevel = depth;
	} else {
		switch (depth) {
			case 11:
				skillLevel = 12;
				break;
			case 12:
				skillLevel = 14;
				break;
			case 13:
				skillLevel = 16;
				break;
			case 14:
				skillLevel = 18;
				break;
			default:
				skillLevel = 20; // Any depth 15 or higher sets the skill to 20
		}
	}
	state.analysisEngine.send(`setoption name Skill Level value ${skillLevel}`);
}

export function evalAll() {
	if (state.coachMode === false && state.play != null) {
		return;
	}
	if (
		state.analysisEngine == null ||
		!state.analysisEngine.ready ||
		!state.analysisEngine.waiting
	) {
		if (state.analysisEngine) state.analysisEngine.kill = true;
		window.setTimeout(evalAll, 50);
		return;
	}
	state.analysisEngine.kill = false;
	state.analysisEngine.waiting = false;
	for (let i = 0; i < state.curmoves.length; i++) {
		state.curmoves[i].eval = null;
		state.curmoves[i].depth = null;
	}
	if (state.analysisEngine.depth === 0) {
		state.analysisEngine.waiting = true;
		return;
	}
	const fen = getCurFEN();
	state.analysisEngine.send("stop");
	state.analysisEngine.send("ucinewgame");
	updateSkillLevelBasedOnDepth(state.analysisEngine.depth);
	state.analysisEngine.score = null;
	if (state.curmoves.length === 0) {
		state.analysisEngine.waiting = true;
		if (!state.analysisEngine.kill) evalNext();
		return;
	}
	state.analysisEngine.eval(
		fen,
		function done(str) {
			state.analysisEngine.waiting = true;
			if (fen !== getCurFEN()) return;
			const matches = str.match(/^bestmove\s(\S+)(?:\sponder\s(\S+))?/);
			if (matches && matches.length > 1) {
				applyEval(
					matches[1],
					state.analysisEngine.score,
					state.analysisEngine.depth - 1,
				);
				if (state.history[state.historyindex].fen === fen)
					addHistoryEval(
						state.historyindex,
						state.analysisEngine.score,
						state.analysisEngine.depth - 1,
						parseBestMove(matches[1]),
					);
			}
			if (!state.analysisEngine.kill) evalNext();
		},
		function info(depth, score, pv) {
			if (fen !== getCurFEN() || depth <= 10) return;
			applyEval(pv[0], score, depth - 1);
			if (state.history[state.historyindex].fen === fen)
				addHistoryEval(
					state.historyindex,
					score,
					depth - 1,
					parseBestMove(pv[0]),
				);
		},
	);
}

export function doComputerMove() {
	if (state.play == null) return;
	const fen = getCurFEN();
	if (state.isPlayerWhite && fen.indexOf(" w ") > 0) return;
	if (!state.isPlayerWhite && fen.indexOf(" b ") > 0) return;

	if (state.playEngine != null && !state.playEngine.waiting) {
		if (state.playEngine) state.playEngine.kill = true;
		window.setTimeout(doComputerMove, 50);
		return;
	}
	const playEngine = ensurePlayEngine();
	// A failed engine never becomes ready; retrying would spin forever.
	if (playEngine.failed) return;
	if (state.playEngine == null || !state.playEngine.ready) {
		window.setTimeout(doComputerMove, 100);
		return;
	} else {
		state.playEngine.kill = false;
		state.playEngine.waiting = false;
		state.playEngine.send("stop");
		state.playEngine.send("ucinewgame");
		state.playEngine.score = null;
		state.playEngine.eval(fen, function done(str) {
			state.playEngine.waiting = true;
			if (fen !== getCurFEN()) return;
			const matches = str.match(/^bestmove\s(\S+)(?:\sponder\s(\S+))?/);
			if (matches && matches.length > 1) {
				const move = parseBestMove(matches[1]);
				const fenBeforeMove = getCurFEN(); // FEN before the engine's move
				const pos = doMove(parseFEN(fenBeforeMove), move.from, move.to, move.p); // Apply the engine's move
				setCurFEN(generateFEN(pos)); // Update to the new position
				// Compute SAN notation for the engine's move
				const san = sanMove(
					parseFEN(fenBeforeMove),
					move,
					genMoves(parseFEN(fenBeforeMove)),
				);
				// Add only one entry to history with the new position, move, and SAN notation
				historyAdd(getCurFEN(), null, move, san);
				// Optional: Log history for debugging
				// console.log('History:', state.history);
				updateTooltip("");
				showBoard(false);
			}
		});
	}
}
