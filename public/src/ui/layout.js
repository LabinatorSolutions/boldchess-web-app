/** Responsive sizing and the mobile layout. */

import { isMobile } from "../env.js";
import { state } from "../state.js";
import { updateInfo } from "./board.js";
import { getCurScale } from "./dom.js";
import { repaintGraph } from "./graph.js";

/**
 * The layout used to be re-checked twice a second by a `setInterval`, which
 * meant two forced style recalculations per second for the whole session. The
 * same work now runs only when something actually changes size.
 */

let sizeCheckQueued = false;

/** Run checkSizes once on the next frame, however many times it is requested. */
export function scheduleSizeCheck() {
	if (sizeCheckQueued) return;
	sizeCheckQueued = true;
	requestAnimationFrame(() => {
		sizeCheckQueued = false;
		checkSizes();
	});
}

/** Watch everything checkSizes measures. */
export function observeSizes() {
	const observer = new ResizeObserver(scheduleSizeCheck);
	for (const id of [
		"container",
		"colLeft",
		"colRight",
		"graphWrapper",
		"wChessboard",
		"boxBoard",
	]) {
		const element = document.getElementById(id);
		if (element) observer.observe(element);
	}
	window.addEventListener("resize", scheduleSizeCheck);
	window.addEventListener("orientationchange", scheduleSizeCheck);
}

/**
 * The engine reports progress far faster than the header can usefully be
 * redrawn, so position info is refreshed on a timer rather than per message.
 */
const INFO_REFRESH_MS = 250;
let infoTimer = null;

export function requestInfoUpdate() {
	state.wantUpdateInfo = true;
	if (infoTimer != null) return;
	infoTimer = window.setTimeout(() => {
		infoTimer = null;
		if (!state.wantUpdateInfo) return;
		state.wantUpdateInfo = false;
		updateInfo();
	}, INFO_REFRESH_MS);
}

export function checkSizes() {
	if (
		isMobile &&
		(document.activeElement == null ||
			document.activeElement.tagName !== "INPUT")
	)
		setupMobileLayout(false);

	// Graph
	const cw = document.getElementById("graphWrapper").clientWidth;
	const ch = document.getElementById("graphWrapper").clientHeight;
	const canvas = document.getElementById("graph");
	if (canvas.width !== cw || canvas.height !== ch) repaintGraph();

	// Chessboard
	const targetScale = Math.round(getCurScale() * 1000) / 1000;
	const targetMargin =
		(document.getElementById("wChessboard").clientWidth -
			(document.getElementById("boxBoard").clientWidth + 4) * targetScale) /
			2 -
		0.5;
	const oldScale = parseFloat(
		document
			.getElementById("boxBoard")
			.style.transform.replace("scale(", "")
			.replace(")", ""),
	);
	const oldMargin = parseFloat(
		document.getElementById("boxBoardOuter").style.marginLeft.replace("px", ""),
	);
	if (
		Math.round(oldScale * 1000) !== Math.round(targetScale * 1000) ||
		Math.round(oldMargin) !== Math.round(targetMargin)
	) {
		document.getElementById("boxBoard").style.transform =
			`scale(${targetScale})`;
		document.getElementById("boxBoardOuter").style.marginLeft =
			document.getElementById("boxBoardOuter").style.marginRight =
				`${targetMargin}px`;
	}

	if (state.wantUpdateInfo) {
		state.wantUpdateInfo = false;
		updateInfo();
	}
}

export function setupMobileLayout(init) {
	if (init) {
		document.getElementById("colLeft").style.width = "300px";
		document.getElementById("colRight").style.width = "300px";
		document.getElementById("wChessboard").style.margin = "8px 0 0 0";
		document.getElementById("wChessboard").style.resize = "none";
		document.getElementById("wGraph").style.display = "none";
		document.getElementById("wHistory").style.display = "none";
		document.getElementById("wMoves").style.height = "121px";
		document.getElementById("logo").style.height = "30px";
		document.getElementById("logo").style.padding = "0";
		document.getElementById("logo").style.transform = "scale(0.5)";
		document.getElementById("logo").style.transformOrigin = "top left";
		document.getElementById("logotextmain").style.top = "15px";
		document.getElementById("logotextmain").style.left = "75px";
		document.getElementById("logotextsub").style.top = "46px";
		document.getElementById("logotextsub").style.left = "75px";
		document.getElementById("toolbar").style.transform = "scale(2.3)";
		document.getElementById("toolbar").style.transformOrigin = "top left";
		document.getElementById("toolbar").style.top = "-2px";
		document.getElementById("toolbar").style.left = "345px";
		document.getElementById("toolbar").style.width = "112px";
		document.getElementById("wb").style.transform = "scale(2)";
		document.getElementById("positionInfo").style.display = "none";
		document.getElementById("searchWrapper").style.top = "0";
		document.getElementById("searchWrapper").style.height = "24px";
		document.getElementById("searchInput").style.padding = "4px 4px 3px 4px";
		document.getElementById("boxBoardOuter").style.marginTop = "31px";
		document.getElementById("buttonGo").style.padding = "3px 4px 5px 4px";
		document.getElementById("buttonGo").style.top = "0";
	}
	const winWidth = Math.min(window.innerWidth, window.outerWidth);
	const winHeight = Math.min(window.innerHeight, window.outerHeight);
	const horiz = winWidth > winHeight;
	const width = horiz ? 660 : 320;
	const scale = winWidth / width;
	state.bodyScale = 1 / scale;
	const height = horiz
		? Math.max(280, Math.min(504, winHeight / scale))
		: Math.max(490, winHeight / scale);
	document.body.style.display = "flex";
	document.body.style.transformOrigin = "top left";
	document.body.style.transform = `scale(${scale})`;
	document.body.style.width = `${width}px`;
	document.body.style.height = `${height}px`;
	document.body.style.overflowX = "hidden";
	document.getElementById("container").style.width = `${width}px`;
	document.getElementById("container").style.height = `${height}px`;
	document.getElementById("logo").style.position = horiz ? "absolute" : "";
	document.getElementById("logo").style.top = horiz ? "0" : "";
	document.getElementById("logo").style.left = horiz ? "355px" : "";
	document.getElementById("wChessboard").style.width = horiz ? "310px" : "";
	document.getElementById("wChessboard").style.height =
		`${horiz ? height - 16 : 300}px`;
	document.getElementById("wb").style.top = horiz ? "0" : "329px";
	document.getElementById("wb").style.right = horiz ? "324px" : "162px";
	document.getElementById("wb").style.width = horiz ? "21px" : "";
	document.getElementById("wb").style.height = horiz ? "120px" : "";
	document.getElementById("colLeft").style.minWidth = horiz ? "300px" : "";
	document.getElementById("colLeft").style.minHeight = horiz ? "1px" : "338px";
	document.getElementById("colLeft").style.paddingTop = horiz ? "" : "7px";
	document.getElementById("colLeft").style.marginLeft = horiz ? "5px" : "10px";
	document.getElementById("colRight").style.marginLeft = horiz
		? "45px"
		: "10px";
	document.getElementById("colRight").style.marginTop = horiz ? "29px" : "";

	const elems = document.getElementById("colRight");
	for (let i = 0; i < elems.children.length; i++) {
		const div = elems.children[i];
		if (div.tagName !== "DIV" || div.className !== "box") continue;
		div.style.height = `${horiz ? 243 + height - 280 : 121 + height - 490}px`;
		div.style.margin = "0";
		div.style.resize = "none";
	}
}

export function setupTouchEvents(elem, funcStart, funcMove, funcEnd) {
	const onTouch = (e) => {
		if (e.cancelable) e.preventDefault();
		if (e.touches.length > 1 || (e.type === "touchend" && e.touches.length > 0))
			return;
		switch (e.type) {
			case "touchstart":
				funcStart(e.changedTouches[0]);
				break;
			case "touchmove":
				funcMove(e.changedTouches[0]);
				break;
			case "touchend":
				funcEnd(e.changedTouches[0]);
				break;
		}
	};
	elem.addEventListener("touchstart", onTouch, false);
	elem.addEventListener("touchend", onTouch, false);
	elem.addEventListener("touchcancel", onTouch, false);
	elem.addEventListener("touchmove", onTouch, false);
}
