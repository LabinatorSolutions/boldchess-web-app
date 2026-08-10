/** Rendering the board: pieces, legal-move dots and the position header. */

import { colorflip, parseFEN, parseMoveNumber } from "../chess/fen.js";
import { isLegal, isWhiteCheck } from "../chess/rules.js";
import { command } from "../commands.js";
import { evalAll } from "../engine/analysis.js";
import { historyMove } from "../game/history.js";
import { getCurFEN } from "../game/position.js";
import { state } from "../state.js";
import { repaintLastMoveArrow, setArrow, showArrow3 } from "./arrows.js";
import {
	getCircleClassName,
	getElemText,
	getEvalText,
	scrollReset,
	setElemText,
} from "./dom.js";
import { getGraphPointColor, repaintGraph } from "./graph.js";
import { reloadMenu } from "./menu.js";
import { refreshMoves } from "./moves.js";
import { repaintSidebars } from "./panels.js";
import { repaintStatic } from "./static-view.js";
import { updateTooltip } from "./tooltip.js";

export function showLegalMoves(from) {
	setArrow(from == null);
	const pos = parseFEN(getCurFEN());
	let elem = document.getElementById("chessboard1");
	for (let i = 0; i < elem.children.length; i++) {
		const div = elem.children[i];
		if (div.tagName !== "DIV") continue;
		if (div.style.zIndex > 0) continue;
		let x = parseInt(div.style.left.replace("px", ""), 10) / 40;
		let y = parseInt(div.style.top.replace("px", ""), 10) / 40;
		if (state.flip) {
			x = 7 - x;
			y = 7 - y;
		}
		let c = `${div.className.split(" ")[0]} ${div.className.split(" ")[1]}`;
		if (div.className.indexOf(" h2") >= 0) c += " h2";
		div.className = c;
		div.onmouseover = null;
		setElemText(div, "");
		if (from == null || from.x < 0 || from.y < 0) continue;
		if (from.x === x && from.y === y) {
			div.className += " h0";
			state.clickFromElem = div;
		} else if (
			isLegal(pos, from, {
				x: x,
				y: y,
			})
		) {
			if (state.curmoves.length === 0) continue;
			let text = "",
				san = "",
				answerpv = null,
				cl = null;
			for (let j = 0; j < state.curmoves.length; j++) {
				if (
					state.curmoves[j].move.from.x === from.x &&
					state.curmoves[j].move.from.y === from.y &&
					state.curmoves[j].move.to.x === x &&
					state.curmoves[j].move.to.y === y &&
					(state.curmoves[j].move.p === "Q" || state.curmoves[j].move.p == null)
				) {
					text = getEvalText(state.curmoves[j].eval, true);
					san = state.curmoves[j].san;
					answerpv = state.curmoves[j].answerpv;
					cl = getCircleClassName(j);
					break;
				}
			}
			div.className += " h1";
			setElemText(div, text);
			div.tooltip = san + (text.length > 0 ? ` ${text}` : "");
			div.answerpv = answerpv == null ? [] : answerpv;
			div.cl = cl == null ? "circle" : cl;
			div.onmouseover = function (e) {
				updateTooltip(this.tooltip, this.answerpv, null, this.cl, e);
			};
			div.onmouseout = () => {
				updateTooltip("");
			};
		}
		updateTooltip("");
	}

	elem = document.getElementById("editWrapper").children[0];
	for (let i = 0; i < elem.children.length; i++) {
		const div = elem.children[i];
		if (div.tagName !== "DIV") continue;
		if (div.style.zIndex > 0) continue;
		const x = -parseInt(div.style.left.replace("px", ""), 10) / 40 - 1;
		const y = -parseInt(div.style.top.replace("px", ""), 10) / 40 - 1;
		const c = `${div.className.split(" ")[0]} ${div.className.split(" ")[1]}`;
		div.className = c;
		setElemText(div, "");
		if (from == null || from.x >= 0 || from.y >= 0) continue;
		if (from.x === x && from.y === y) {
			div.className += " h0";
			state.clickFromElem = div;
		}
	}
	showArrow3(null);

	state.clickFrom = from;
}

export function updateLegalMoves() {
	const elem = document.getElementById("chessboard1");
	for (let i = 0; i < elem.children.length; i++) {
		const div = elem.children[i];
		if (
			div.tagName !== "DIV" ||
			div.style.zIndex > 0 ||
			div.className.indexOf(" h1") < 0 ||
			div.cl !== "circle"
		)
			continue;
		for (let j = 0; j < state.curmoves.length; j++) {
			if (div.tooltip === state.curmoves[j].san) {
				const text = getEvalText(state.curmoves[j].eval, true);
				const san = state.curmoves[j].san;
				const answerpv = state.curmoves[j].answerpv;
				const cl = getCircleClassName(j);
				setElemText(div, text);
				div.tooltip = san + (text.length > 0 ? ` ${text}` : "");
				div.answerpv = answerpv == null ? [] : answerpv;
				div.cl = cl == null ? "circle" : cl;
				div.onmouseover = function (e) {
					updateTooltip(this.tooltip, this.answerpv, null, this.cl, e);
				};
				div.onmouseout = () => {
					updateTooltip("");
				};
				if (
					state.tooltipState &&
					getElemText(document.getElementById("tooltip").firstChild) ===
						state.curmoves[j].san
				)
					updateTooltip(div.tooltip, div.answerpv, null, div.cl, null);
				break;
			}
		}
	}
}

export function showBoard(noeval, refreshhistory, keepcontent) {
	requestAnimationFrame(() => {
		const pos = parseFEN(getCurFEN());
		const dragElem = document.getElementById("dragPiece");
		while (dragElem.firstChild) dragElem.removeChild(dragElem.firstChild);

		const elem = document.getElementById("chessboard1");
		if (keepcontent && elem.children.length !== 64) keepcontent = false;
		if (!keepcontent) while (elem.firstChild) elem.removeChild(elem.firstChild);

		const fragment = document.createDocumentFragment();
		let index = 0;
		for (let x = 0; x < 8; x++) {
			for (let y = 0; y < 8; y++) {
				const div = keepcontent
					? elem.children[index]
					: document.createElement("div");
				index++;
				div.style.left = `${(state.flip ? 7 - x : x) * 40}px`;
				div.style.top = `${(state.flip ? 7 - y : y) * 40}px`;
				div.className = `${(x + y) % 2 ? "d" : "l"} ${pos.b[x][y]}`;
				if (
					(pos.b[x][y] === "K" && isWhiteCheck(pos)) ||
					(pos.b[x][y] === "k" && isWhiteCheck(colorflip(pos)))
				) {
					div.className += " h2";
				}
				if (!keepcontent) fragment.appendChild(div);
			}
		}

		if (!keepcontent) elem.appendChild(fragment);

		if (
			state.clickFromElem != null &&
			state.clickFrom != null &&
			state.clickFrom.x >= 0 &&
			state.clickFrom.y >= 0
		)
			state.clickFromElem = null;
		document.getElementById("searchInput").value = getCurFEN();

		if (!noeval) {
			refreshMoves();
			if (refreshhistory) {
				for (let i = 0; i < state.history.length; i++) {
					if (state.history[i].length > 1 && state.history[i][1] != null)
						state.history[i][1].depth = -1;
				}
			}
			scrollReset("Moves");
			scrollReset("Static");
			if (state.analysisEngine && !state.analysisEngine.kill) evalAll();
		}

		document.getElementById("buttonStm").className = pos.w ? "white" : "black";

		// Batch updates
		setArrow(true);
		repaintLastMoveArrow();
		showArrow3(null);

		if (state.menu) reloadMenu();
		repaintGraph();
		repaintSidebars();
		updateInfo();
		repaintStatic();
		updateTooltip("");
	});
}

export function updateInfo() {
	const curfen = getCurFEN();
	const pos = parseFEN(curfen);
	let positionInfoText =
		"Position: " +
		(state.historyindex + 1) +
		" of " +
		state.history.length +
		" - Last Move: ";

	if (
		state.history[state.historyindex].length > 3 &&
		state.history[state.historyindex][3] != null
	) {
		const pos2 = parseFEN(state.history[state.historyindex][0]);
		positionInfoText +=
			(pos2.w ? `${pos2.m[1] - 1}... ` : `${pos2.m[1]}. `) +
			state.history[state.historyindex][3];
	} else positionInfoText += "-";

	const movesInfoText =
		(pos.w ? "White" : "Black") +
		" To Play (" +
		state.curmoves.length +
		" Legal Move" +
		(state.curmoves.length === 1 ? "" : "s") +
		")";

	// Batch DOM updates
	const positionInfoElem = document.getElementById("positionInfo");
	const movesInfoElem = document.getElementById("movesInfo");
	positionInfoElem.innerText = positionInfoText;
	movesInfoElem.innerText = movesInfoText;

	// History window
	const historyElem = document.getElementById("history");
	while (historyElem.firstChild)
		historyElem.removeChild(historyElem.firstChild);

	const historyFragment = document.createDocumentFragment();
	let lastmn = null,
		mn = null;

	for (let i = 0; i < state.history.length; i++) {
		mn = parseMoveNumber(state.history[i][0]);
		if (mn !== lastmn) {
			const span1 = document.createElement("span");
			setElemText(span1, `${mn}. `);
			span1.style.color = "#64c4db";
			historyFragment.appendChild(span1);
			lastmn = mn;
		}
		const san =
			state.history[i].length > 3 && state.history[i][3] != null
				? state.history[i][3]
				: "\u2605";
		const span2 = document.createElement("span");
		setElemText(span2, san);
		span2.className = `movelink${i === state.historyindex ? " selected" : ""}`;
		span2.targetindex = i;
		const c = getGraphPointColor(i);
		if (c !== "#008800") span2.style.borderBottomColor = c;
		span2.onclick = function () {
			const targetIndex = this.targetindex;
			if (
				targetIndex < state.history.length &&
				targetIndex >= 0 &&
				targetIndex !== state.historyindex
			) {
				historyMove(targetIndex - state.historyindex);
			}
		};
		historyFragment.appendChild(span2);
		historyFragment.appendChild(document.createTextNode(" "));
	}
	historyElem.appendChild(historyFragment);
}

export function refreshFlip() {
	const elem = document.getElementById("cbTable");
	for (let i = 0; i < 8; i++) {
		elem.children[0].children[0].children[1 + i].innerText =
			elem.children[0].children[9].children[1 + i].innerText = "abcdefgh"[
				state.flip ? 7 - i : i
			];
		elem.children[0].children[1 + i].children[0].innerText =
			elem.children[0].children[1 + i].children[i === 0 ? 2 : 1].innerText =
				"12345678"[state.flip ? i : 7 - i];
	}
	showBoard(true);
}

export function doFlip() {
	state.flip = !state.flip;
	refreshFlip();
}

export function refreshButtonRevert() {
	if (state.history2 == null) {
		document.getElementById("buttonRevert").className = "off";
		document.getElementById("buttonRevert").onclick = null;
	} else {
		document.getElementById("buttonRevert").className = "on";
		document.getElementById("buttonRevert").onclick = (e) => {
			command(e.ctrlKey ? "keep" : "revert");
		};
	}
}
