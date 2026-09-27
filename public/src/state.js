/**
 * Mutable application state, shared across the UI modules.
 *
 * These were top-level `let` bindings in main.js. ES modules export live
 * bindings that importers cannot assign to, so the state lives on one object
 * instead: `state.flip = true` works from any module, and every read has a
 * visible owner.
 *
 * Anything derived from a position belongs in the chess modules, not here -
 * this is only what the UI needs to remember between events.
 */

import { START } from "./config.js";

/**
 * One ply of the game.
 *
 * `evaluation` is the engine's latest result for this position - an object with
 * `score`, `black` and `depth`, filled in by the analysis loop long after the
 * entry is created. `move` and `san` say how the position was reached and stay
 * null for the first entry, for positions set up by hand and for a FEN jump.
 */
export function historyEntry(fen, evaluation = null, move = null, san = null) {
	return { fen, evaluation, move, san };
}

export const state = {
	// Engines
	/** Stockfish instance used for background analysis. */
	analysisEngine: undefined,
	/** Second Stockfish instance, strength-limited, used when playing. */
	playEngine: undefined,
	/** Elo the playing engine is limited to. */
	userUciEloRating: 2000,

	// Game history
	/** One `historyEntry` per ply. */
	history: [historyEntry(START)],
	/**
	 * Snapshot of the mainline while browsing a variation, as
	 * `{ index, entries }`, or null when there is nothing to revert to.
	 */
	history2: null,
	/** Index of the position currently shown. */
	historyindex: 0,
	/** Moves available in the current position, with their evaluations. */
	curmoves: [],

	// Board presentation
	flip: false,
	arrow: false,
	menu: false,
	bodyScale: 1,
	boardColor: 0,

	// Players
	wname: "White",
	bname: "Black",
	/**
	 * Menu mode: 1 = analysis, 2 = player (White) vs engine, 3 = engine vs
	 * player (Black), 4 = two players.
	 */
	gameMode: 1,
	isPlayerWhite: true,
	/** Side the engine plays (0 = Black, 1 = White), or null when it does not play. */
	play: null,
	coachMode: false,
	coachModeLabel: "Activate Coach Mode",

	// Dragging and clicking
	dragElement: null,
	dragActive: false,
	startX: undefined,
	startY: undefined,
	dragCtrl: undefined,
	dragLMB: undefined,
	clickFrom: undefined,
	clickFromElem: undefined,
	lastMouseDataPos: null,

	// Panels
	tooltipState: false,
	wantUpdateInfo: true,
	staticSortByChange: false,
	movesPv: false,

	// Game report
	/**
	 * The move opened from the report, as `{index, fen}` of the entry it
	 * reached, or null. While the board shows entry `index - 1`, the played
	 * and the engine's move are drawn there (see `reviewArrows`).
	 */
	reviewMove: null,
};
