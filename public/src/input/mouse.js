/** Mouse, touch and wheel handling: dragging pieces, clicking squares, editing. */

import { bounds, generateFEN, parseFEN } from "../chess/fen.js";
import { doMove, fixCastling, isLegal } from "../chess/rules.js";
import { START } from "../config.js";
import { doComputerMove } from "../engine/analysis.js";
import { historyAdd, historyMove } from "../game/history.js";
import { getCurFEN, getCurSan, setCurFEN } from "../game/position.js";
import { state } from "../state.js";
import { finalArrow3, showArrow3 } from "../ui/arrows.js";
import { showBoard, showLegalMoves } from "../ui/board.js";
import { getClientY, getCurScale, setElemText } from "../ui/dom.js";
import { graphMouseDown, graphMouseMove } from "../ui/graph.js";
import { showHideMenu } from "../ui/menu.js";
import { updateTooltip, updateTooltipPos } from "../ui/tooltip.js";

export function onMouseDown(e) {
	if (state.menu) showHideMenu(false, e);
	if (e == null) e = window.event;
	let target = e.target != null ? e.target : e.srcElement;
	let elem = target;
	if (
		document.onmousemove === graphMouseMove &&
		target != null &&
		target.id !== "graphWrapper" &&
		target.id !== "graph"
	) {
		document.getElementById("graphWrapper").onmouseout();
	} else if (document.onmousemove === graphMouseMove) {
		graphMouseDown(e);
		return;
	}
	if (state.dragElement != null) return true;
	if (
		target != null &&
		target.className === "cbCell" &&
		target.children[0].id === "chessboard1"
	) {
		target = target.children[0];
		const bb = document.getElementById("chessboard1").getBoundingClientRect();
		const w = bb.width / 8;
		const cx = Math.round((e.clientX - bb.left - w / 2) / w);
		const cy = Math.round((e.clientY - bb.top - w / 2) / w);
		for (let i = 0; i < target.children.length; i++) {
			const e0 = target.children[i];
			if (e0.style.left === `${cx * 40}px` && e0.style.top === `${cy * 40}px`)
				elem = e0;
		}
	}
	while (
		target != null &&
		target.id !== "chessboard1" &&
		target.id !== "editWrapper" &&
		target.tagName !== "BODY"
	) {
		target = target.parentNode;
	}
	if (target == null) return true;
	if (elem.id === "editWrapper" || elem.className.length < 3) return;
	if (target.id !== "editWrapper" && target.id !== "chessboard1") return true;

	const edit = isEdit();
	if (
		edit &&
		target.id === "chessboard1" &&
		elem.className != null &&
		(e.which === 2 || e.button === 4)
	) {
		if (getPaintPiece() === elem.className[2]) setPaintPiece("S");
		else setPaintPiece(elem.className[2]);
		if (e?.preventDefault) e.preventDefault();
		return;
	}
	if (
		target.id === "chessboard1" &&
		edit &&
		(getPaintPiece() !== "S" || e.which === 3 || e.button === 2)
	) {
		if (e?.preventDefault) e.preventDefault();
		paintMouse(e);
		return;
	}

	document.onmousemove = onMouseMove;
	document.body.focus();
	document.onselectstart = () => false;
	elem.ondragstart = () => false;
	state.dragActive = false;
	state.dragElement = elem;
	state.startX = e.clientX;
	state.startY = e.clientY;
	state.dragCtrl = target.id === "editWrapper" ? true : e.ctrlKey;
	state.dragLMB = e.which === 3 || e.button === 2 ? 1 : 0;
	return false;
}

export function dragActivate() {
	if (state.dragElement == null) return;
	if (state.dragElement.parentNode == null) return;
	const dragFromEditTools = state.dragElement.parentNode.id !== "chessboard1";
	if (state.dragElement.className[2] === "-" && !dragFromEditTools) return;

	const clone = state.dragElement.cloneNode(false);
	if (!state.dragCtrl)
		state.dragElement.className = `${state.dragElement.className[0]} -`;
	state.dragElement = clone;
	state.dragElement.className = state.dragElement.className.substring(0, 3);
	state.dragElement.style.backgroundColor = "transparent";
	state.dragElement.style.background = "none";
	state.dragElement.style.zIndex = 10000;
	state.dragElement.style.pointerEvents = "none";
	state.dragElement.style.transform = `scale(${getCurScale()})`;
	document.getElementById("dragPiece").appendChild(state.dragElement);
	state.dragActive = true;
	if (!isEdit() && !state.dragCtrl)
		showLegalMoves({
			x: getDragX(state.startX),
			y: getDragY(state.startY),
		});
	if (dragFromEditTools) setPaintPiece(state.dragElement.className[2]);
}

export function doMoveHandler(move, copy) {
	updateTooltip("");
	const oldfen = getCurFEN(); // Position before the move
	let pos = parseFEN(oldfen);
	const legal =
		copy == null &&
		isLegal(pos, move.from, move.to) &&
		state.curmoves.length > 0;
	if (legal) {
		const san = getCurSan(move); // Get the SAN notation of the move
		if (pos.w !== state.play) {
			pos = doMove(pos, move.from, move.to, move.p); // Apply the move to the position
		}
		setCurFEN(generateFEN(pos)); // Update the current FEN to the new position
		// Store the new position along with the move and SAN notation in history
		historyAdd(getCurFEN(), null, move, san);
		// Optional: Log history for debugging
		// console.log('History:', state.history);
		requestAnimationFrame(() => {
			showBoard(getCurFEN() === oldfen);
			doComputerMove();
		});
	} else if (
		isEdit() &&
		(move.from.x !== move.to.x || move.from.y !== move.to.y)
	) {
		if (copy && bounds(move.to.x, move.to.y)) {
			pos.b[move.to.x][move.to.y] = copy;
		} else if (!copy && bounds(move.from.x, move.from.y)) {
			if (bounds(move.to.x, move.to.y))
				pos.b[move.to.x][move.to.y] = pos.b[move.from.x][move.from.y];
			pos.b[move.from.x][move.from.y] = "-";
		} else return false;
		fixCastling(pos);
		// Store SAN notation for edit moves as null
		historyAdd(oldfen, null, null, null); // Update this line
		setCurFEN(generateFEN(pos));
		historyAdd(getCurFEN(), null, null, null); // Update this line
		requestAnimationFrame(() => {
			showBoard(getCurFEN() === oldfen);
		});
	} else return false;
	return true;
}

export function onMouseMove(e) {
	requestAnimationFrame(() => {
		defaultMouseMove(e);
		if (
			document.onmousemove !== onMouseMove &&
			isEdit() &&
			getPaintPiece() !== "S"
		)
			paintMouse(e, getPaintPiece());
		if (state.dragElement == null) return;
		if (e == null) e = window.event;
		if (!state.dragActive) {
			if (
				Math.abs(e.clientX - state.startX) < 8 &&
				Math.abs(e.clientY - state.startY) < 8
			)
				return;
			if (state.dragLMB > 0) {
				const x1 = getDragX(state.startX),
					y1 = getDragY(state.startY),
					x2 = getDragX(e.clientX),
					y2 = getDragY(e.clientY);
				showArrow3({
					from: { x: x1, y: y1 },
					to: { x: x2, y: y2 },
				});
				state.dragLMB = 2;
				return;
			}
			if ("PNBRQK".indexOf(state.dragElement.className[2].toUpperCase()) < 0)
				return;
			dragActivate();
		}

		state.dragElement.style.left = `${e.clientX * state.bodyScale - 20}px`;
		state.dragElement.style.top = `${getClientY(e) - 20}px`;
		state.dragElement.style.color = "transparent";
		setElemText(state.dragElement, "-"); // force browser to refresh pop-up
	});
}

export function onMouseUp(e) {
	if (document.onmousemove === graphMouseMove) return;
	onMouseMove(e);
	if (
		!state.dragActive &&
		state.clickFrom != null &&
		state.clickFromElem != null &&
		state.clickFromElem.className.indexOf(" h0") > 0 &&
		state.dragLMB === 0
	) {
		const oldDragElement = state.dragElement;
		state.dragElement = state.clickFromElem;
		const x2 = getDragX(e.clientX);
		const y2 = getDragY(e.clientY);
		state.dragElement = null;
		if (
			!doMoveHandler({
				from: state.clickFrom,
				to: {
					x: x2,
					y: y2,
				},
			})
		)
			state.dragElement = oldDragElement;
	}
	if (state.dragElement != null) {
		let x1 = getDragX(state.startX),
			y1 = getDragY(state.startY);
		const x2 = getDragX(e.clientX),
			y2 = getDragY(e.clientY);
		if (state.dragActive) {
			if (
				!doMoveHandler(
					{
						from: {
							x: x1,
							y: y1,
						},
						to: {
							x: x2,
							y: y2,
						},
					},
					state.dragCtrl ? state.dragElement.className[2] : null,
				)
			) {
				showBoard(true);
			} else {
				if (!bounds(x1, y1)) setPaintPiece("S");
			}
		} else {
			const ew1br = document
				.getElementById("editWrapper")
				.children[0].children[0].getBoundingClientRect();
			const ew1w = ew1br.width;
			if (state.dragElement.parentNode.id !== "chessboard1") {
				x1 = -Math.round((e.clientX - ew1br.left - ew1w / 2) / ew1w) - 1;
				y1 = -Math.round((e.clientY - ew1br.top - ew1w / 2) / ew1w) - 1;
				if (state.dragElement.parentNode.className !== "cb" || x1 > 0 || y1 > 0)
					x1 = y1 = -99;
			}
			if (e.which === 3 || e.button === 2) {
				if (state.dragElement.parentNode.id === "chessboard1") {
					if (state.dragLMB === 1) {
						const c = state.dragElement.className;
						state.dragElement.className =
							c.split(" ")[0] +
							" " +
							c.split(" ")[1] +
							(c.indexOf(" h0") >= 0 ? " h0" : "") +
							(c.indexOf(" h1") >= 0 ? " h1" : "") +
							(c.indexOf(" h2") >= 0 ? " h2" : "") +
							(c.indexOf(" h3") < 0 ? " h3" : "");
					}
					finalArrow3();
				} else {
					let list =
							document.getElementById("editWrapper").children[0].children,
						p = null;
					for (let i = 0; i < list.length; i++) {
						const x1c =
							-Math.round(
								(list[i].getBoundingClientRect().left - ew1br.left) / ew1w,
							) - 1;
						const y1c =
							-Math.round(
								(list[i].getBoundingClientRect().top - ew1br.top) / ew1w,
							) - 1;
						if (list[i].className != null && x1c === x1 && y1c === y1)
							p = list[i].className[2];
					}
					if (p != null) {
						if (p === "S") setCurFEN(START);
						else if (p === "-") setCurFEN("8/8/8/8/8/8/8/8 w - - 0 0");
						else {
							const pos = parseFEN(getCurFEN());
							for (let x = 0; x < 8; x++)
								for (let y = 0; y < 8; y++)
									if (pos.b[x][y] === p) pos.b[x][y] = "-";
							fixCastling(pos);
							setCurFEN(generateFEN(pos));
						}
						showBoard();
					}
				}
			} else if (
				(state.clickFrom != null &&
					state.clickFromElem != null &&
					state.clickFromElem.className.indexOf(" h0") > 0 &&
					state.clickFrom.x === x1 &&
					state.clickFrom.y === y1) ||
				(state.dragElement.className[2] === "-" &&
					state.dragElement.parentNode.id === "chessboard1")
			) {
				showLegalMoves(null);
			} else {
				showLegalMoves({
					x: x1,
					y: y1,
				});
			}
		}
	} else {
		if (
			state.clickFrom == null ||
			(state.clickFrom.x > 0 && state.clickFrom.y > 0) ||
			(state.clickFromElem != null &&
				state.clickFromElem.className[2] === "S" &&
				(e.which === 1 || e.button === 0))
		)
			showLegalMoves(null);
	}
	document.onmousemove = defaultMouseMove;
	document.onselectstart = null;
	state.dragElement = null;
}

export function onWheel(e) {
	if (state.menu) showHideMenu(false);
	if (e.ctrlKey) return;
	if (isEdit()) {
		const p = getPaintPiece();
		const str = "Spnbrqk-PNBRQK";
		let index = str.indexOf(p);
		if (index >= 0) {
			if (e.deltaY < 0) index--;
			if (e.deltaY > 0) index++;
			if (index < 0) index = str.length - 1;
			if (index === str.length) index = 0;
			setPaintPiece(str[index]);
		}
	} else {
		if (e.deltaY < 0) historyMove(-1);
		if (e.deltaY > 0) historyMove(+1);
	}
	e.preventDefault();
}

export function defaultMouseMove(event) {
	if (state.tooltipState) updateTooltipPos(event);
}

export function getDragX(x) {
	const bb = document.getElementById("chessboard1").getBoundingClientRect();
	const w = bb.width / 8;
	const offsetX = bb.left + w / 2;
	if (state.flip) return 7 - Math.round((x - offsetX) / w);
	else return Math.round((x - offsetX) / w);
}

export function getDragY(y) {
	const bb = document.getElementById("chessboard1").getBoundingClientRect();
	const h = bb.width / 8;
	const offsetY = bb.top + h / 2;
	if (state.flip) return 7 - Math.round((y - offsetY) / h);
	else return Math.round((y - offsetY) / h);
}

export function paintMouse(e, p) {
	if (e == null) e = window.event;
	const elem = e.target != null ? e.target : e.srcElement;
	if (elem.parentNode == null || elem.parentNode.id !== "chessboard1") return;
	const w = elem.getBoundingClientRect().width;
	const h = elem.getBoundingClientRect().height;
	const offsetX =
		document.getElementById("chessboard1").getBoundingClientRect().left + w / 2;
	const offsetY =
		document.getElementById("chessboard1").getBoundingClientRect().top + h / 2;
	let x1 = Math.round((e.clientX - offsetX) / w);
	let y1 = Math.round((e.clientY - offsetY) / h);
	if (state.flip) {
		x1 = 7 - x1;
		y1 = 7 - y1;
	}
	if (
		bounds(x1, y1) &&
		((state.clickFromElem != null &&
			state.clickFromElem.className.indexOf(" h0") > 0) ||
			e.which === 3 ||
			e.button === 2)
	) {
		const pos = parseFEN(getCurFEN());
		let newp = null;
		if (e.ctrlKey || e.which === 3 || e.button === 2) newp = "-";
		else newp = p != null ? p : state.clickFromElem.className[2];
		pos.b[x1][y1] = newp;
		fixCastling(pos);
		setCurFEN(generateFEN(pos));
		showBoard(null, null, true);
		if (p == null) {
			document.onmousemove = (event) => {
				paintMouse(event, newp);
			};
		}
	} else document.onmousemove = defaultMouseMove;
}

export function setPaintPiece(newp) {
	let list = document.getElementById("editWrapper").children[0].children,
		newe = null;
	for (let i = 0; i < list.length; i++) {
		if (list[i].className != null && list[i].className[2] === newp)
			newe = list[i];
	}
	if (newe != null) {
		const x2 =
			-Math.round(parseFloat(newe.style.left.replace("px", "")) / 40) - 1;
		const y2 =
			-Math.round(parseFloat(newe.style.top.replace("px", "")) / 40) - 1;
		showLegalMoves({
			x: x2,
			y: y2,
		});
	}
}

export function getPaintPiece() {
	const list = document.getElementById("editWrapper").children[0].children;
	for (let i = 0; i < list.length; i++) {
		if (list[i].className != null && list[i].className.indexOf(" h0") > 0)
			return list[i].className[2];
	}
	return "S";
}

export function isEdit() {
	return (
		state.clickFrom != null &&
		state.clickFromElem != null &&
		state.clickFromElem.className.indexOf(" h0") > 0 &&
		state.clickFrom.x < 0 &&
		state.clickFrom.y < 0
	);
}
