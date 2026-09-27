/**
 * Application entry point.
 *
 * Everything else lives in ./src: the chess rules, the evaluation, the panels,
 * the input handlers. This file only wires the DOM to them at start up.
 */

import { setDefaultPromotionPiece } from "./src/chess/rules.js";
import { command, getParameterByName, setupInput } from "./src/commands.js";
import { startAnalysisEngine } from "./src/engine/engines.js";
import { isMobile } from "./src/env.js";
import { historyMove } from "./src/game/history.js";
import { getPromotionPiece } from "./src/game/position.js";
import { onKeyDown } from "./src/input/keyboard.js";
import {
	defaultMouseMove,
	onMouseDown,
	onMouseMove,
	onMouseUp,
	onWheel,
} from "./src/input/mouse.js";
import { loadBook } from "./src/openings/book.js";
import { state } from "./src/state.js";
import { doFlip, showBoard } from "./src/ui/board.js";
import { buildEditPalette } from "./src/ui/edit-palette.js";
import {
	graphMouseDown,
	graphMouseMove,
	repaintGraph,
	showGraphTooltip,
} from "./src/ui/graph.js";
import {
	checkSizes,
	observeSizes,
	requestInfoUpdate,
	setupMobileLayout,
	setupTouchEvents,
} from "./src/ui/layout.js";
import { menuPlayEngineWhite, showHideMenu } from "./src/ui/menu.js";
import { showEvals } from "./src/ui/moves.js";
import { setupBoxes, showHideWindow } from "./src/ui/panels.js";
import { repaintStatic } from "./src/ui/static-view.js";
import { updateTooltip } from "./src/ui/tooltip.js";

// The chess rules do not know about the UI, so hand them the promotion piece
// the player picked in the toolbar.
setDefaultPromotionPiece(getPromotionPiece);

// Markup that index.html cannot carry, because CSP's style-src no longer allows
// inline style attributes. This runs at module evaluation, before the
// DOMContentLoaded handler below can open the Edit panel.
//
// The two panels that start closed are marked `hidden` so they never paint;
// that is swapped here for the inline display the rest of the code expects,
// since showHideWindow and setupBoxes both read `style.display` to decide which
// way to toggle a panel. The palette squares are positioned by inline left/top
// for the same reason - the edit handlers read those values back.
for (const id of ["wStatic", "wOpening", "wReport", "wEdit"]) {
	const box = document.getElementById(id);
	box.removeAttribute("hidden");
	box.style.display = "none";
}
buildEditPalette();

document.addEventListener("DOMContentLoaded", () => {
	try {
		const url = new URL(document.location.href);
		const search_params = new URLSearchParams(url.search);

		if (search_params.has("mode")) {
			const mode = search_params.get("mode");

			if (mode === "play") {
				menuPlayEngineWhite();
			} else if (mode === "edit") {
				showHideWindow("Edit");
			}
		}
	} catch (error) {
		console.error("Failed to initialize the application:", error);
	}
});

window.onload = () => {
	// Load The Analysis & Playing Engines
	// The playing engine starts on demand (see engine/engines.js).
	startAnalysisEngine();
	// Book moves are graded without the engine, so when the book arrives the
	// grades change: redraw History (via the info refresh, which also covers the
	// report and Opening windows) and the graph. With analysis running they would
	// catch up anyway; with it off (depth 0, or a game without coach mode)
	// nothing else would redraw them.
	loadBook().then(() => {
		requestInfoUpdate();
		repaintGraph();
	});

	document.onmousedown = onMouseDown;
	document.onmouseup = onMouseUp;
	document.onmousemove = defaultMouseMove;
	document.onkeydown = onKeyDown;

	document.getElementById("chessboard1").oncontextmenu =
		document.getElementById("chessboard1").parentElement.oncontextmenu =
		document.getElementById("editWrapper").oncontextmenu =
			() => false;

	document.getElementById("chessboard1").parentElement.onwheel =
		document.getElementById("editWrapper").onwheel = onWheel;
	document.getElementById("buttonStm").onclick = () => {
		command("sidetomove");
	};
	document.getElementById("buttonFlip").onclick = () => {
		doFlip();
	};
	document.getElementById("buttonBack").onclick = (event) => {
		historyMove(-1, event);
	};
	document.getElementById("buttonForward").onclick = (event) => {
		historyMove(+1, event);
	};
	document.getElementById("buttonMenu").onclick = (event) => {
		showHideMenu(true, event);
	};
	document.getElementById("buttonStaticSortByValue").onclick = () => {
		state.staticSortByChange = false;
		repaintStatic();
	};
	document.getElementById("buttonStaticSortByChange").onclick = () => {
		state.staticSortByChange = true;
		repaintStatic();
	};
	document.getElementById("buttonMovesPv").onclick = () => {
		state.movesPv = !state.movesPv;
		showEvals();
	};
	document.getElementById("graphWrapper").onmouseover = () => {
		if (document.onmousemove === defaultMouseMove)
			document.onmousemove = graphMouseMove;
	};
	document.getElementById("graphWrapper").onmousedown = (event) => {
		if (document.onmousemove === defaultMouseMove) {
			document.onmousemove = graphMouseMove;
			graphMouseMove(event);
			graphMouseDown();
		}
	};
	document.getElementById("graphWrapper").onmouseout = () => {
		if (document.onmousemove === graphMouseMove)
			document.onmousemove = defaultMouseMove;
		repaintGraph();
		updateTooltip("");
	};
	document.getElementById("graphWrapper").onwheel = (event) => {
		onWheel(event);
		showGraphTooltip(state.historyindex, event);
	};

	// Every arrow layer covers the board exactly: the arrows are drawn in board
	// coordinates (40px squares), so an unplaced layer draws them off-square.
	const board = document.getElementById("chessboard1").getBoundingClientRect();
	const wrapper = document
		.getElementById("boardWrapper")
		.getBoundingClientRect();
	for (const id of [
		"arrowWrapper1",
		"arrowWrapper2",
		"arrowWrapper3",
		"arrowWrapper4",
	]) {
		const layer = document.getElementById(id);
		layer.style.top = `${board.top - wrapper.top}px`;
		layer.style.left = `${board.left - wrapper.left}px`;
		layer.style.width = layer.style.height = `${40 * 8}px`;
	}

	if (isMobile) setupMobileLayout(true);
	setupTouchEvents(
		document.getElementById("chessboard1"),
		onMouseDown,
		onMouseMove,
		onMouseUp,
	);
	setupTouchEvents(
		document.getElementById("editWrapper"),
		onMouseDown,
		onMouseMove,
		onMouseUp,
	);
	checkSizes();
	observeSizes();
	setupBoxes();
	setupInput();
	showBoard();
	for (let i = 0; i < 26; i++)
		command(getParameterByName(String.fromCharCode("a".charCodeAt(0) + i)));
};
