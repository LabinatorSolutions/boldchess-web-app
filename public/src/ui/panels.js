/** Panel layout: showing, hiding, resizing and dragging the boxes. */

import { board, parseFEN } from "../chess/fen.js";
import { isMobile } from "../env.js";
import { getCurFEN } from "../game/position.js";
import { defaultMouseMove, isEdit, onMouseUp } from "../input/mouse.js";
import { state } from "../state.js";
import { showLegalMoves } from "./board.js";
import { byId, makeButton } from "./dom.js";
import { graphMouseMove } from "./graph.js";
import { checkSizes, setupTouchEvents } from "./layout.js";
import { repaintStatic } from "./static-view.js";

/**
 * Spoken names of the panels, keyed by the suffix of their `w<Name>` id.
 *
 * @type {Record<string, string>}
 */
const PANEL_NAMES = {
	Chessboard: "Chessboard",
	Moves: "Moves",
	History: "History of moves",
	Graph: "Evaluation graph",
	Static: "Static evaluation",
	Opening: "Opening explorer",
	Report: "Game report",
	Edit: "Chessboard editor",
};

/** @param {string} id */
function panelName(id) {
	return PANEL_NAMES[id] || id;
}

export function repaintSidebars() {
	requestAnimationFrame(() => {
		const pos = parseFEN(getCurFEN());
		let whitemat = [],
			blackmat = [],
			points = 0;

		for (let x = 0; x < 8; x++) {
			for (let y = 0; y < 8; y++) {
				const p = board(pos, x, y).toLowerCase();
				const col = board(pos, x, y) !== p;
				const index = "pnbrqk".indexOf(p);
				if (index >= 0) {
					if (col) whitemat.push(index);
					else blackmat.push(index);
					points += (col ? 1 : -1) * [1, 3, 3, 5, 9, 0][index];
				}
			}
		}

		whitemat.sort();
		blackmat.sort();

		for (let i = 0, j = 0; i < whitemat.length && j < blackmat.length; ) {
			if (whitemat[i] === blackmat[j]) {
				whitemat.splice(i, 1);
				blackmat.splice(j, 1);
			} else if (whitemat[i] < blackmat[j]) i++;
			else if (whitemat[i] > blackmat[j]) j++;
		}

		const elem = byId("materialWrapper");
		while (elem.firstChild) elem.removeChild(elem.firstChild);

		/**
		 * @param {number[]} mat
		 * @param {boolean} flip
		 */
		const fmat = (mat, flip) => {
			const fragment = document.createDocumentFragment();
			for (let i = 0; i < mat.length; i++) {
				const node1 = document.createElement("DIV");
				node1.className = "pnbrqk"[mat[i]];
				const d = `${(mat.length - 1 - i) * 16}px`;
				if (flip) node1.style.top = d;
				else node1.style.bottom = d;
				fragment.appendChild(node1);
			}
			elem.appendChild(fragment);
		};

		if (points < 0) fmat(whitemat, state.flip);
		fmat(blackmat, !state.flip);
		if (points >= 0) fmat(whitemat, state.flip);

		if (points !== 0) {
			const node1 = document.createElement("DIV");
			node1.appendChild(document.createTextNode(`+${Math.abs(points)}`));
			const down = (points > 0 && !state.flip) || (points < 0 && state.flip);
			const d = `${(state.flip !== down ? whitemat.length : blackmat.length) * 16}px`;
			if (down) node1.style.bottom = d;
			else node1.style.top = d;
			elem.appendChild(node1);
		}

		const topElem = byId("namesWrapperTop");
		while (topElem.firstChild) topElem.removeChild(topElem.firstChild);
		topElem.appendChild(
			document.createTextNode(state.flip ? state.wname : state.bname),
		);

		const bottomElem = byId("namesWrapperBottom");
		while (bottomElem.firstChild) bottomElem.removeChild(bottomElem.firstChild);
		bottomElem.appendChild(
			document.createTextNode(state.flip ? state.bname : state.wname),
		);
	});
}

/**
 * @param {string} name
 * @param {boolean} [targetState] Shown or hidden; toggles when omitted.
 */
export function showHideWindow(name, targetState) {
	if (isMobile && name !== "Chessboard") {
		const wb = byId("wb").children;
		for (let i = 0; i < wb.length; i++) {
			if (wb[i].tagName !== "DIV") continue;
			const wbId = wb[i].id.substring(2);
			if (wbId === "Chessboard") continue;
			byId(`w${wbId}`).style.display = "none";
			const wbElem = byId(`wb${wbId}`);
			wbElem.className = wbElem.className.replace(" selected", "");
			wbElem.setAttribute("aria-pressed", "false");
		}
	}
	const boxElem = byId(`w${name}`);
	const newState =
		targetState == null ? boxElem.style.display === "none" : targetState;
	boxElem.style.display = newState ? "" : "none";
	const wbElem = byId(`wb${name}`);
	wbElem.className =
		wbElem.className.replace(" selected", "") + (newState ? " selected" : "");
	wbElem.setAttribute("aria-pressed", String(newState));
	checkSizes();
	if ((name === "Edit" || isMobile) && isEdit()) showLegalMoves(null);
	if (name === "Graph" && document.onmousemove === graphMouseMove)
		byId("graphWrapper").dispatchEvent(new MouseEvent("mouseout"));
	if (name === "Static" && newState) repaintStatic();
}

export function setupBoxes() {
	const elems = [byId("colLeft"), byId("colRight")];
	for (let j = 0; j < elems.length; j++)
		for (let i = 0; i < elems[j].children.length; i++) {
			const div = /** @type {HTMLElement} */ (elems[j].children[i]);
			if (div.tagName !== "DIV") continue;
			if (div.className !== "box") continue;
			if (!isMobile) {
				setupDragElement(div);
				const divCloseIcon = document.createElement("div");
				divCloseIcon.className = "closeIcon";
				makeButton(divCloseIcon, `Close ${panelName(div.id.substring(1))}`);
				divCloseIcon.onclick = () => {
					showHideWindow(div.id.substring(1));
				};
				div.appendChild(divCloseIcon);
			}
			if (!isMobile || div.id !== "wChessboard") {
				const divBoxIcon = document.createElement("div");
				divBoxIcon.className = `boxIcon icon${div.id.substring(1)}`;
				div.appendChild(divBoxIcon);
			}
			const wbIcon = document.createElement("div");
			wbIcon.id = `wb${div.id.substring(1)}`;
			wbIcon.className = `wbButton icon${div.id.substring(1)}`;
			const shown = div.style.display !== "none";
			if (shown) wbIcon.className += " selected";
			makeButton(wbIcon, panelName(div.id.substring(1)));
			wbIcon.setAttribute("aria-pressed", String(shown));

			wbIcon.onclick = () => {
				showHideWindow(wbIcon.id.substring(2));
			};
			byId("wb").appendChild(wbIcon);
		}
}

/** @param {HTMLElement} elmnt */
export function setupDragElement(elmnt) {
	let pos1 = 0,
		pos2 = 0,
		pos3 = 0,
		pos4 = 0;
	const oldDisplay = elmnt.style.display;
	elmnt.style.display = "";
	elmnt.originalWidth =
		elmnt.style.width = `${elmnt.getBoundingClientRect().width - 2}px`;
	elmnt.originalHeight =
		elmnt.style.height = `${elmnt.getBoundingClientRect().height - 2}px`;
	elmnt.style.display = oldDisplay;
	const titleBar = /** @type {HTMLElement} */ (elmnt.firstElementChild);
	titleBar.onmousedown = startBoxDrag;
	titleBar.ondblclick = () => {
		elmnt.style.width = String(elmnt.originalWidth);
		elmnt.style.height = String(elmnt.originalHeight);
		elmnt.style.left = "";
		elmnt.style.top = "";
		elmnt.style.position = "";
		elmnt.style.zIndex = "4";
	};
	setupTouchEvents(titleBar, startBoxDrag, moveBoxDrag, endBoxDrag);

	const resizeSquare = document.createElement("div");
	resizeSquare.style.position = "absolute";
	resizeSquare.style.bottom = resizeSquare.style.right = "0";
	resizeSquare.style.width = resizeSquare.style.height = "12px";
	resizeSquare.style.cursor = "nw-resize";
	resizeSquare.onmousedown = startBoxResize;
	resizeSquare.ondblclick = () => {
		elmnt.style.width = String(elmnt.originalWidth);
		elmnt.style.height = String(elmnt.originalHeight);
	};
	setupTouchEvents(resizeSquare, startBoxResize, moveBoxResize, endBoxDrag);
	elmnt.appendChild(resizeSquare);

	/** @param {MouseEvent | Touch} e */
	function startBoxDrag(e) {
		e = e || /** @type {MouseEvent} */ (window.event);
		if ("preventDefault" in e) e.preventDefault();
		pos3 = e.clientX;
		pos4 = e.clientY;
		document.onmouseup = endBoxDrag;
		document.onmousemove = moveBoxDrag;
	}

	/** @param {MouseEvent | Touch} e */
	function moveBoxDrag(e) {
		e = e || /** @type {MouseEvent} */ (window.event);
		if ("preventDefault" in e) e.preventDefault();
		if (elmnt.style.position !== "absolute") {
			elmnt.style.width = `${elmnt.getBoundingClientRect().width - 2}px`;
			elmnt.style.height = `${elmnt.getBoundingClientRect().height - 2}px`;
			elmnt.style.left =
				elmnt.getBoundingClientRect().left -
				byId("container").getBoundingClientRect().left +
				"px";
			elmnt.style.top =
				elmnt.getBoundingClientRect().top -
				byId("container").getBoundingClientRect().top -
				8 +
				"px";
			elmnt.style.position = "absolute";
		}

		pos1 = pos3 - e.clientX;
		pos2 = pos4 - e.clientY;
		pos3 = e.clientX;
		pos4 = e.clientY;
		const x0 = parseFloat(elmnt.style.left.replace("px", "")) || 0;
		const y0 = parseFloat(elmnt.style.top.replace("px", "")) || 0;
		elmnt.style.left = `${x0 - pos1}px`;
		elmnt.style.top = `${y0 - pos2}px`;
		elmnt.style.zIndex = "5";
		elmnt.style.cursor = "move";
	}

	function endBoxDrag() {
		document.onmouseup = onMouseUp;
		document.onmousemove = defaultMouseMove;
		elmnt.style.zIndex = "4";
		elmnt.style.cursor = "";
	}

	/** @param {MouseEvent | Touch} e */
	function startBoxResize(e) {
		e = e || /** @type {MouseEvent} */ (window.event);
		if ("preventDefault" in e) e.preventDefault();
		pos3 = e.clientX;
		pos4 = e.clientY;
		elmnt.style.width = `${elmnt.getBoundingClientRect().width - 2}px`;
		elmnt.style.height = `${elmnt.getBoundingClientRect().height - 2}px`;
		document.onmouseup = endBoxDrag;
		document.onmousemove = moveBoxResize;
	}

	/** @param {MouseEvent | Touch} e */
	function moveBoxResize(e) {
		e = e || /** @type {MouseEvent} */ (window.event);
		if ("preventDefault" in e) e.preventDefault();
		pos1 = pos3 - e.clientX;
		pos2 = pos4 - e.clientY;
		pos3 = e.clientX;
		pos4 = e.clientY;
		const x0 = parseFloat(elmnt.style.width.replace("px", "")) || 0;
		const y0 = parseFloat(elmnt.style.height.replace("px", "")) || 0;
		elmnt.style.width = `${x0 - pos1}px`;
		elmnt.style.height = `${y0 - pos2}px`;
		elmnt.style.zIndex = "5";
		elmnt.style.cursor = "nw-resize";
	}
}
