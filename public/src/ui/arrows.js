/** Move arrows drawn over the board. */

import { bounds } from "../chess/fen.js";
import { getCurFEN } from "../game/position.js";
import { state } from "../state.js";
import { getGraphPointColor } from "./graph.js";

export function setArrow(on) {
	state.arrow = on;
	if (
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
			const elem = document.getElementById("arrowWrapper2");
			if (elem.children[0].children != null) {
				const arrowFillColor = getGraphPointColor(state.historyindex);
				requestAnimationFrame(() => {
					elem.children[0].children[0].children[0].children[0].style.fill =
						arrowFillColor;
					elem.children[0].children[1].style.stroke = arrowFillColor;
				});
			}
		}
		showArrow2(lastmove);
	});
}

export function showArrowInternal(move, wrapperId, opacity = 1) {
	const elem = document.getElementById(wrapperId);
	if (move == null) {
		elem.style.display = "none";
		return;
	}
	if (elem.children[0].children == null) return;
	const line = elem.children[0].children[1];
	line.setAttribute(
		"x1",
		20 + (state.flip ? 7 - move.from.x : move.from.x) * 40,
	);
	line.setAttribute(
		"y1",
		20 + (state.flip ? 7 - move.from.y : move.from.y) * 40,
	);
	line.setAttribute("x2", 20 + (state.flip ? 7 - move.to.x : move.to.x) * 40);
	line.setAttribute("y2", 20 + (state.flip ? 7 - move.to.y : move.to.y) * 40);
	line.style.opacity = opacity.toFixed(2);
	elem.style.display = "block";
}

export function showArrow1(move, opacity) {
	const elem = document.getElementById("arrowWrapper1");
	const elem0 = elem.children[0];
	if (opacity == null || opacity === 1)
		for (let i = elem0.children.length - 1; i >= 2; i--)
			elem0.removeChild(elem0.children[i]);
	else elem.children[0].appendChild(elem0.children[1].cloneNode(false));
	showArrowInternal(move, "arrowWrapper1", opacity);
}

export function showArrow2(move) {
	showArrowInternal(move, "arrowWrapper2");
}

export function showArrow3(move) {
	const elem0 = document.getElementById("arrowWrapper3").children[0];
	if (elem0.children == null) return;
	if (move == null) {
		for (let i = elem0.children.length - 1; i >= 2; i--)
			elem0.removeChild(elem0.children[i]);
	} else if (
		(move.from.x === move.to.x && move.from.y === move.to.y) ||
		!bounds(move.from.x, move.from.y) ||
		!bounds(move.to.x, move.to.y)
	) {
		elem0.children[1].style.display = "none";
	} else {
		elem0.children[1].style.display = "";
	}
	showArrowInternal(move, "arrowWrapper3");
}

export function finalArrow3() {
	const elem = document.getElementById("arrowWrapper3");
	let list = elem.children[0].children,
		remElem = null;
	if (list == null) return;
	if (list[1].style.display === "none") return;
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
	list[1].style.display = "none";
}
