/** The move list panel and its evaluations. */

import { colorflip, generateFEN, parseFEN } from "../chess/fen.js";
import { sanMove } from "../chess/notation.js";
import {
	checkPosition,
	doMove,
	genMoves,
	isWhiteCheck,
} from "../chess/rules.js";
import { gameDrawReason, getCurFEN } from "../game/position.js";
import { doMoveHandler } from "../input/mouse.js";
import { state } from "../state.js";
import { setArrow } from "./arrows.js";
import { updateLegalMoves } from "./board.js";
import { byId, getCircleClassName, getEvalText, setElemText } from "./dom.js";
import { showHideMenu } from "./menu.js";
import { updateTooltip } from "./tooltip.js";

/**
 * Rebuild the move list for the position on the board. Synchronous: showBoard
 * calls it from its own frame and starts the analysis right after, which must
 * see this position's moves, not the previous one's (a search on the stale
 * list used to stall the analysis loop).
 */
export function refreshMoves() {
	const pos = parseFEN(getCurFEN());
	state.curmoves = [];
	setElemText(byId("moves"), "");
	const errmsgs = checkPosition(pos);
	if (errmsgs.length === 0) {
		const moves = genMoves(pos);
		for (let i = 0; i < moves.length; i++) {
			state.curmoves.push({
				move: moves[i],
				san: sanMove(pos, moves[i], moves),
				fen: generateFEN(doMove(pos, moves[i].from, moves[i].to, moves[i].p)),
				w: !pos.w,
				eval: null,
				depth: 0,
			});
		}

		// Checkmate and stalemate end the game on the board itself, so they
		// take precedence over the draw rules: a mate delivered on the move
		// that completes a repetition still stands.
		const drawReason =
			state.curmoves.length > 0 ? gameDrawReason(getCurFEN()) : null;

		if (drawReason != null) {
			state.curmoves = []; // Clear legal moves to prevent further play
			const fragment = document.createDocumentFragment();
			const div0 = document.createElement("div");
			div0.style.padding = "8px 16px";
			const div = document.createElement("div");
			div.style.backgroundColor = "#894e00"; // distinct color for draw
			div.className = "positionStatus";
			setElemText(div, `Draw - ${drawReason}`);
			div0.appendChild(div);
			const ul = document.createElement("ul"),
				li = document.createElement("li");
			setElemText(li, "Draw");
			ul.appendChild(li);
			div0.appendChild(ul);
			fragment.appendChild(div0);
			byId("moves").appendChild(fragment);
		} else if (state.curmoves.length === 0) {
			const matecheck =
				(pos.w && isWhiteCheck(pos)) ||
				(!pos.w && isWhiteCheck(colorflip(pos)));
			const fragment = document.createDocumentFragment();
			const div0 = document.createElement("div");
			div0.style.padding = "8px 16px";
			const div = document.createElement("div");
			div.style.backgroundColor = "#800080";
			div.className = "positionStatus";
			setElemText(div, matecheck ? "Checkmate" : "Stalemate");
			div0.appendChild(div);
			const ul = document.createElement("ul"),
				li = document.createElement("li");
			setElemText(
				li,
				matecheck && pos.w ? "Black wins" : matecheck ? "White wins" : "Draw",
			);
			ul.appendChild(li);
			div0.appendChild(ul);
			fragment.appendChild(div0);
			byId("moves").appendChild(fragment);
		} else {
			showEvals();
		}
	} else {
		const fragment = document.createDocumentFragment();
		const div0 = document.createElement("div");
		div0.style.padding = "8px 16px";
		const div = document.createElement("div");
		div.style.backgroundColor = "#bb0000";
		div.className = "positionStatus";
		setElemText(div, "Illegal position");
		div0.appendChild(div);
		fragment.appendChild(div0);
		byId("moves").appendChild(fragment);
	}
}

export function showEvals() {
	setElemText(byId("moves"), "");
	setElemText(byId("buttonMovesPv"), state.movesPv ? "PV" : "Reply");
	if (state.curmoves.length > 0) {
		/**
		 * @param {import("../state.js").MoveItem} a
		 * @param {import("../state.js").MoveItem} b
		 */
		const sortfunc = (a, b) => {
			const a0 =
				a.eval == null ? -2000000 : a.eval * (state.curmoves[0].w ? -1 : 1);
			const b0 =
				b.eval == null ? -2000000 : b.eval * (state.curmoves[0].w ? -1 : 1);

			let r = 0;
			if (a0 < b0 || (a0 === b0 && a.san < b.san)) r = 1;
			if (a0 > b0 || (a0 === b0 && a.san > b.san)) r = -1;
			return r;
		};
		state.curmoves.sort(sortfunc);
	}
	for (let i = 0; i < state.curmoves.length; i++) {
		const node1 = document.createElement("DIV");
		node1.className = "line";
		const node0 = document.createElement("SPAN");
		node0.className = getCircleClassName(i);
		const node2 = document.createElement("SPAN");
		node2.appendChild(document.createTextNode(state.curmoves[i].san));
		node2.className = "san";
		const node3 = document.createElement("SPAN");
		node3.className = "eval";
		const node6 = document.createElement("SPAN");
		node6.className = "pv";
		if (state.movesPv)
			node6.appendChild(
				document.createTextNode(state.curmoves[i].pvtext || "?"),
			);
		else
			node6.appendChild(
				document.createTextNode(
					(state.curmoves[i].pvtext || "?").split(" ")[0],
				),
			);
		const node7 = document.createElement("SPAN");
		node7.className = "depth";
		node7.appendChild(
			document.createTextNode(String(state.curmoves[i].depth ?? "?")),
		);

		const text = getEvalText(state.curmoves[i].eval, false);
		if (text.indexOf(".") >= 0) {
			const node4 = document.createElement("SPAN");
			node4.className = "numleft";
			node4.appendChild(
				document.createTextNode(text.substring(0, text.indexOf(".") + 1)),
			);
			const node5 = document.createElement("SPAN");
			node5.className = "numright";
			node5.appendChild(
				document.createTextNode(text.substring(text.indexOf(".") + 1)),
			);
			node3.appendChild(node4);
			node3.appendChild(node5);
		} else {
			node3.appendChild(document.createTextNode(text));
		}
		node1.appendChild(node0);
		node1.appendChild(node2);
		node1.appendChild(node3);
		node1.appendChild(node6);
		node1.appendChild(node7);
		node1.index = i;
		node1.onmouseover = () => {
			highlightMove(i, true);
		};
		node1.onmouseout = () => {
			highlightMove(i, false);
		};
		node1.onmousedown = () => {
			if (state.menu) showHideMenu(false);
			doMoveHandler(state.curmoves[i].move);
		};
		if (
			state.historyindex + 1 < state.history.length &&
			state.history[state.historyindex + 1].san === state.curmoves[i].san
		)
			node1.style.color = "#64c4db";
		byId("moves").appendChild(node1);
	}
	if (state.arrow) setArrow(true);
	updateLegalMoves();
}

/**
 * @param {number} index
 * @param {boolean} on
 */
export function highlightMove(index, on) {
	setArrow(!on);
	if (state.dragElement != null) return;
	const elem = byId("chessboard1");
	const x1 = state.curmoves[index].move.from.x;
	const y1 = state.curmoves[index].move.from.y;
	const x2 = state.curmoves[index].move.to.x;
	const y2 = state.curmoves[index].move.to.y;
	const text = getEvalText(state.curmoves[index].eval, true);
	for (let i = 0; i < elem.children.length; i++) {
		const div = /** @type {HTMLElement} */ (elem.children[i]);
		if (div.tagName !== "DIV") continue;
		if (Number(div.style.zIndex) > 0) continue;
		let x = parseInt(div.style.left.replace("px", ""), 10) / 40;
		let y = parseInt(div.style.top.replace("px", ""), 10) / 40;
		if (state.flip) {
			x = 7 - x;
			y = 7 - y;
		}
		let c = `${div.className.split(" ")[0]} ${div.className.split(" ")[1]}`;
		setElemText(div, "");
		if (div.className.indexOf(" h2") >= 0) c += " h2";
		if (on && x1 === x && y1 === y) div.className = `${c} h0`;
		else if (on && x2 === x && y2 === y) {
			div.className = `${c} h1`;
			setElemText(div, text);
		} else div.className = c;
		div.onmouseover = null;
	}
	if (on) updateTooltip("", state.curmoves[index].answerpv);
	else updateTooltip("");
}
