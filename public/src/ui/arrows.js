/** Move arrows drawn over the board. */

import { bounds } from "../chess/fen.js";
import { getCurFEN } from "../game/position.js";
import { state } from "../state.js";
import { byId } from "./dom.js";
import { getGraphPointColor } from "./graph.js";

/**
 * The played and the engine's move while the board shows the position a move
 * opened from the game report was played in, else null.
 *
 * @returns {{played: any, best: any}|null}
 */
export function reviewArrows() {
	const review = state.reviewMove;
	if (review == null) return null;
	const played = state.history[review.index];
	const before = state.history[review.index - 1];
	if (played?.fen !== review.fen || played.move == null) return null;
	if (
		state.historyindex !== review.index - 1 ||
		getCurFEN() !== before.fen ||
		before.evaluation?.move == null
	)
		return null;
	return { played: played.move, best: before.evaluation.move };
}

/** Draw or hide the report's review arrows (see `reviewArrows`). */
export function repaintReviewArrows() {
	requestAnimationFrame(() => {
		const arrows = reviewArrows();
		const elem = byId("arrowWrapper4");
		if (arrows == null) {
			elem.style.display = "none";
			return;
		}
		const svg = elem.children[0];
		placeLine(/** @type {SVGElement} */ (svg.children[1]), arrows.played);
		placeLine(/** @type {SVGElement} */ (svg.children[2]), arrows.best);
		elem.style.display = "block";
	});
}

/** @param {boolean} on */
export function setArrow(on) {
	state.arrow = on;
	if (
		reviewArrows() == null &&
		state.arrow &&
		state.curmoves.length > 0 &&
		state.curmoves[0].eval != null
	)
		showArrow1(state.curmoves[0].move);
	else showArrow1();
}

export function repaintLastMoveArrow() {
	requestAnimationFrame(() => {
		const lastmove =
			getCurFEN() === state.history[state.historyindex].fen
				? state.history[state.historyindex].move
				: null;
		if (lastmove != null) {
			const elem = byId("arrowWrapper2");
			if (elem.children[0].children != null) {
				const arrowFillColor = getGraphPointColor(state.historyindex);
				requestAnimationFrame(() => {
					const svg = elem.children[0];
					const head = svg.children[0].children[0].children[0];
					/** @type {SVGElement} */ (head).style.fill = arrowFillColor;
					/** @type {SVGElement} */ (svg.children[1]).style.stroke =
						arrowFillColor;
				});
			}
		}
		showArrow2(reviewArrows() == null ? lastmove : null);
	});
}

/**
 * Point an arrow line from `move.from` to `move.to` on the board.
 *
 * @param {SVGElement} line
 * @param {import("../chess/rules.js").Move} move
 */
function placeLine(line, move) {
	/** Pixel center of a board square along one axis. */
	const center = (/** @type {number} */ c) =>
		String(20 + (state.flip ? 7 - c : c) * 40);
	line.setAttribute("x1", center(move.from.x));
	line.setAttribute("y1", center(move.from.y));
	line.setAttribute("x2", center(move.to.x));
	line.setAttribute("y2", center(move.to.y));
}

/**
 * @param {import("../chess/rules.js").Move | null | undefined} move
 * @param {string} wrapperId
 * @param {number} [opacity]
 */
export function showArrowInternal(move, wrapperId, opacity = 1) {
	const elem = byId(wrapperId);
	if (move == null) {
		elem.style.display = "none";
		return;
	}
	if (elem.children[0].children == null) return;
	const line = /** @type {SVGElement} */ (elem.children[0].children[1]);
	placeLine(line, move);
	line.style.opacity = opacity.toFixed(2);
	elem.style.display = "block";
}

/**
 * @param {import("../chess/rules.js").Move | null} [move]
 * @param {number} [opacity]
 */
export function showArrow1(move, opacity) {
	const elem = byId("arrowWrapper1");
	const elem0 = elem.children[0];
	if (opacity == null || opacity === 1)
		for (let i = elem0.children.length - 1; i >= 2; i--)
			elem0.removeChild(elem0.children[i]);
	else elem.children[0].appendChild(elem0.children[1].cloneNode(false));
	showArrowInternal(move, "arrowWrapper1", opacity);
}

/** @param {import("../chess/rules.js").Move | null} [move] */
export function showArrow2(move) {
	showArrowInternal(move, "arrowWrapper2");
}

/** @param {import("../chess/rules.js").Move | null} [move] */
export function showArrow3(move) {
	const elem0 = byId("arrowWrapper3").children[0];
	if (elem0.children == null) return;
	if (move == null) {
		for (let i = elem0.children.length - 1; i >= 2; i--)
			elem0.removeChild(elem0.children[i]);
	} else if (
		(move.from.x === move.to.x && move.from.y === move.to.y) ||
		!bounds(move.from.x, move.from.y) ||
		!bounds(move.to.x, move.to.y)
	) {
		/** @type {SVGElement} */ (elem0.children[1]).style.display = "none";
	} else {
		/** @type {SVGElement} */ (elem0.children[1]).style.display = "";
	}
	showArrowInternal(move, "arrowWrapper3");
}

export function finalArrow3() {
	const elem = byId("arrowWrapper3");
	let list = elem.children[0].children,
		remElem = null;
	if (list == null) return;
	const drawn = /** @type {SVGElement} */ (list[1]);
	if (drawn.style.display === "none") return;
	for (let i = 2; i < list.length; i++) {
		if (
			list[i].getAttribute("x1") === list[1].getAttribute("x1") &&
			list[i].getAttribute("y1") === list[1].getAttribute("y1") &&
			list[i].getAttribute("x2") === list[1].getAttribute("x2") &&
			list[i].getAttribute("y2") === list[1].getAttribute("y2")
		)
			remElem = list[i];
	}
	if (remElem == null) {
		elem.children[0].appendChild(list[1].cloneNode(false));
	} else {
		elem.children[0].removeChild(remElem);
	}
	drawn.style.display = "none";
}
