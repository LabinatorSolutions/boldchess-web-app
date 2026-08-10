/**
 * Engine lifecycle.
 *
 * Two Stockfish instances are used: one analyses whatever position is on the
 * board, the other plays at a limited strength. Each one instantiates the
 * ~7 MB WASM build, so the playing engine is only started when the player
 * actually enters a play mode - analysis-only sessions never pay for it.
 */

import { state } from "../state.js";
import { loadEngine } from "./uci.js";

/** Apply the player's chosen Elo to the playing engine. */
export function applyPlayStrength(engine) {
	if (!engine?.ready) return;
	engine.send("setoption name UCI_LimitStrength value true");
	engine.send(`setoption name UCI_Elo value ${state.userUciEloRating}`);
}

/** Start the analysis engine. Called once at start up. */
export function startAnalysisEngine() {
	if (state.analysisEngine == null) state.analysisEngine = loadEngine();
	return state.analysisEngine;
}

/** Start the playing engine on first use, and return it. */
export function ensurePlayEngine() {
	if (state.playEngine == null) {
		state.playEngine = loadEngine(applyPlayStrength);
	} else {
		applyPlayStrength(state.playEngine);
	}
	return state.playEngine;
}
