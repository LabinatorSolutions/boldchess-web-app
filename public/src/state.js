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

/** @typedef {import("./chess/fen.js").Square} Square */
/** @typedef {import("./chess/rules.js").Move} Move */
/** @typedef {import("./engine/uci.js").Engine} Engine */

/**
 * An engine result for a history entry. `score` is from the side to move's
 * point of view (mates as ±(1,000,000 − n)) and null for a position the engine
 * cannot search; `move` is the engine's best move there.
 *
 * @typedef {object} Evaluation
 * @property {number | null} score
 * @property {number} depth
 * @property {boolean} black
 * @property {Move | null} [move]
 */

/**
 * @typedef {object} HistoryEntry
 * @property {string} fen
 * @property {Evaluation | null} evaluation
 * @property {Move | null} move
 * @property {string | null} san
 */

/**
 * A legal move in the position shown, as the move list keeps it. `eval` is
 * from White's point of view; the engine's reply fields arrive with it.
 *
 * @typedef {object} MoveItem
 * @property {Move} move
 * @property {string} san
 * @property {string} fen The position after the move.
 * @property {boolean} w White to move after the move.
 * @property {number | null} eval
 * @property {number | null} depth
 * @property {string | null} [answer] The engine's reply, as a UCI move.
 * @property {string[]} [answerpv]
 * @property {string} [pvtext]
 */

/**
 * One ply of the game.
 *
 * `evaluation` is the engine's latest result for this position - an object with
 * `score`, `black` and `depth`, filled in by the analysis loop long after the
 * entry is created. `move` and `san` say how the position was reached and stay
 * null for the first entry, for positions set up by hand and for a FEN jump.
 *
 * @param {string} fen
 * @param {Evaluation | null} [evaluation]
 * @param {Move | null} [move]
 * @param {string | null} [san]
 * @returns {HistoryEntry}
 */
export function historyEntry(fen, evaluation = null, move = null, san = null) {
	return { fen, evaluation, move, san };
}

export const state = {
	// Engines
	/** Stockfish instance used for background analysis. */
	/** @type {Engine | undefined} */
	analysisEngine: undefined,
	/**
	 * Second Stockfish instance, strength-limited, used when playing.
	 *
	 * @type {Engine | undefined}
	 */
	playEngine: undefined,
	/** Elo the playing engine is limited to. */
	userUciEloRating: 2000,

	// Game history
	/**
	 * One `historyEntry` per ply.
	 *
	 * @type {HistoryEntry[]}
	 */
	history: [historyEntry(START)],
	/**
	 * Snapshot of the mainline while browsing a variation, as
	 * `{ index, entries }`, or null when there is nothing to revert to.
	 *
	 * @type {{index: number, entries: HistoryEntry[]} | null}
	 */
	history2: null,
	/** Index of the position currently shown. */
	historyindex: 0,
	/**
	 * Moves available in the current position, with their evaluations.
	 *
	 * @type {MoveItem[]}
	 */
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
	/**
	 * Side the engine plays (0 = Black, 1 = White), or null when it does not play.
	 *
	 * @type {number | null}
	 */
	play: null,
	coachMode: false,
	coachModeLabel: "Activate Coach Mode",

	// Dragging and clicking
	/** @type {HTMLElement | null} */
	dragElement: null,
	dragActive: false,
	/** @type {number | undefined} */
	startX: undefined,
	/** @type {number | undefined} */
	startY: undefined,
	/** @type {boolean | undefined} */
	dragCtrl: undefined,
	/**
	 * 0 = left button, 1 = right button, 2 = right-button drag done.
	 *
	 * @type {number | undefined}
	 */
	dragLMB: undefined,
	/** @type {Square | undefined} */
	clickFrom: undefined,
	/** @type {HTMLElement | undefined} */
	clickFromElem: undefined,
	/** @type {number | null} */
	lastMouseDataPos: null,

	// Panels
	tooltipState: false,
	wantUpdateInfo: true,
	staticSortByChange: false,
	movesPv: false,

	/**
	 * The player's queued pre-move and the position it was entered in, or
	 * null (see `game/premove.js`).
	 *
	 * @type {{move: Move, fen: string} | null}
	 */
	premove: null,

	// Game report
	/**
	 * The move opened from the report, as `{index, fen}` of the entry it
	 * reached, or null. While the board shows entry `index - 1`, the played
	 * and the engine's move are drawn there (see `reviewArrows`).
	 *
	 * @type {{index: number, fen: string} | null}
	 */
	reviewMove: null,
};
