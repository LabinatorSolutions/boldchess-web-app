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

export const state = {
	// Engines
	/** Stockfish instance used for background analysis. */
	analysisEngine: undefined,
	/** Second Stockfish instance, strength-limited, used when playing. */
	playEngine: undefined,
	/** Elo the playing engine is limited to. */
	userUciEloRating: 2000,

	// Game history
	/** One entry per ply: [fen, move, san, ...evaluation]. */
	history: [[START]],
	/** Snapshot of the main line while browsing a variation. */
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
	/** 0 = analysis, 1 = engine plays one side, 2 = two players. */
	gameMode: 1,
	isPlayerWhite: true,
	/** Side the engine is playing, or null when nobody is playing. */
	play: null,
	coachMode: false,
	coachModeLabel: "Active Coach Mode",

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
};
