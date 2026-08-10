/** The main menu and the modes it switches between. */

import { command } from "../commands.js";
import { MAX_DEPTH } from "../config.js";
import { doComputerMove } from "../engine/analysis.js";
import { applyPlayStrength, ensurePlayEngine } from "../engine/engines.js";
import { isMobile } from "../env.js";
import { historyMove } from "../game/history.js";
import { toggleCoachMode, togglePromotionPiece } from "../game/position.js";
import { state } from "../state.js";
import { showBoard } from "./board.js";
import { setElemText } from "./dom.js";

export function showHideMenu(open, e) {
	if (e != null) {
		let target = e.target != null ? e.target : e.srcElement;
		while (
			target != null &&
			target.id !== "buttonMenu" &&
			target.id !== "menu" &&
			target.tagName !== "BODY"
		)
			target = target.parentNode;
		if (target == null) return;
		if (!open && (target.id === "buttonMenu" || target.id === "menu")) return;
	}
	if (open) state.menu = !state.menu;
	else state.menu = false;

	const bElem = document.getElementById("buttonMenu");
	const mElem = document.getElementById("menu");
	bElem.className = state.menu ? "on down" : "on";
	mElem.style.top =
		(bElem.getBoundingClientRect().bottom -
			document.getElementById("container").getBoundingClientRect().top) *
			state.bodyScale +
		"px";
	mElem.style.left =
		(bElem.getBoundingClientRect().left -
			document.getElementById("container").getBoundingClientRect().left) *
			state.bodyScale +
		"px";
	mElem.style.right = "auto";
	if (isMobile) {
		mElem.style.left = "auto";
		mElem.style.right =
			(-bElem.getBoundingClientRect().right +
				document.getElementById("container").getBoundingClientRect().right -
				1) *
				state.bodyScale +
			"px";
	}
	mElem.style.display = state.menu ? "" : "none";
	if (state.menu) reloadMenu();
}

export function setBoardColor(c) {
	const count = 6;
	if (c < 0) c = count - 1;
	if (c >= count) c = 0;
	document.getElementById("cbTable").className = `c${c}`;
	document.getElementById("boxBoard").className = `c${c}`;
	document.getElementById("chessboard1").className = `cb c${c}`;
	const elem = document.getElementById("icolor");
	if (elem != null) elem.className = `c${c}`;
	state.boardColor = c;
}

export function setEngineValue(elem) {
	setElemText(
		elem,
		state.analysisEngine?.ready ? state.analysisEngine.depth : "18",
	);
	elem.removeAttribute("title");
}

export function reloadMenu() {
	requestAnimationFrame(() => {
		const parent = document.getElementById("menu");
		while (parent.firstChild) parent.removeChild(parent.firstChild);

		const addMenuLine = () => {
			const div = document.createElement("div");
			div.className = "menuLine";
			parent.appendChild(div);
		};

		const addMenuItem = (className, text, key, enabled, func) => {
			const div = document.createElement("div");
			div.className = `menuItem ${className}`;
			if (!enabled) div.className += " disabled";
			const span1 = document.createElement("span");
			setElemText(span1, text);
			div.appendChild(span1);
			const span2 = document.createElement("span");
			span2.className = "key";
			if (key != null) setElemText(span2, key);
			div.appendChild(span2);
			if (enabled) div.onclick = func;
			parent.appendChild(div);
		};

		const addMenuItemEngine = (className, text) => {
			const div = document.createElement("div");
			div.className = `menuItem ${className}`;
			const span1 = document.createElement("span");
			setElemText(span1, text);
			div.appendChild(span1);
			const span2 = document.createElement("span");
			span2.id = "buttonEnginePlus";
			span2.onclick = () => {
				if (state.analysisEngine?.ready)
					command(
						`depth ${Math.min(MAX_DEPTH, state.analysisEngine.depth + 1)}`,
					);
				showBoard(false, true);
				setEngineValue(document.getElementById("buttonEngineValue"));
			};
			div.appendChild(span2);
			const span3 = document.createElement("span");
			span3.id = "buttonEngineValue";
			span3.onclick = () => {
				if (state.analysisEngine?.ready)
					command(`depth ${state.analysisEngine.depth !== 0 ? "0" : "28"}`);
				showBoard(false, true);
				setEngineValue(document.getElementById("buttonEngineValue"));
			};
			setEngineValue(span3);
			div.appendChild(span3);
			const span4 = document.createElement("span");
			span4.id = "buttonEngineMinus";
			span4.onclick = () => {
				if (state.analysisEngine?.ready)
					command(`depth ${Math.max(0, state.analysisEngine.depth - 1)}`);
				showBoard(false, true);
				setEngineValue(document.getElementById("buttonEngineValue"));
			};
			div.appendChild(span4);
			parent.appendChild(div);
		};

		const addMenuItemUciElo = (className, text) => {
			const div = document.createElement("div");
			div.className = `menuItem ${className}`;

			const span1 = document.createElement("span");
			setElemText(span1, text);
			div.appendChild(span1);

			// '+' button
			const span2 = document.createElement("span");
			span2.id = "buttonUciEloPlus";
			span2.onclick = () => {
				state.userUciEloRating = Math.min(3190, state.userUciEloRating + 10);
				updateUciEloValue(span3);
				applyPlayStrength(state.playEngine);
			};
			div.appendChild(span2);

			// Elo rating display
			const span3 = document.createElement("span");
			span3.id = "buttonUciEloValue";
			updateUciEloValue(span3);
			div.appendChild(span3);

			// '-' button
			const span4 = document.createElement("span");
			span4.id = "buttonUciEloMinus";
			span4.onclick = () => {
				state.userUciEloRating = Math.max(1320, state.userUciEloRating - 10);
				updateUciEloValue(span3);
				applyPlayStrength(state.playEngine);
			};
			div.appendChild(span4);
			parent.appendChild(div);
		};

		// Helper function to update the Elo rating display
		function updateUciEloValue(span) {
			setElemText(span, `${state.userUciEloRating}`);
		}

		const addMenuItemColor = (className, text) => {
			const div = document.createElement("div");
			div.className = `menuItem ${className}`;
			const span1 = document.createElement("span");
			setElemText(span1, text);
			div.appendChild(span1);

			const span2 = document.createElement("span");
			span2.id = "buttonColorNext";
			span2.onclick = () => {
				setBoardColor(state.boardColor + 1);
			};
			div.appendChild(span2);
			const div1 = document.createElement("div");
			div1.id = "icolor";
			div1.className = `c${state.boardColor}`;
			div1.onclick = () => {
				setBoardColor(0);
			};
			let div2,
				div3 = document.createElement("div");
			div2 = document.createElement("div");
			div2.style.left = "0px";
			div2.style.top = "0px";
			div2.className = "l";
			div3.appendChild(div2);
			div2 = document.createElement("div");
			div2.style.left = "0px";
			div2.style.top = "5px";
			div2.className = "d";
			div3.appendChild(div2);
			div2 = document.createElement("div");
			div2.style.left = "5px";
			div2.style.top = "0px";
			div2.className = "d";
			div3.appendChild(div2);
			div2 = document.createElement("div");
			div2.style.left = "5px";
			div2.style.top = "5px";
			div2.className = "l";
			div3.appendChild(div2);
			div1.appendChild(div3);
			div.appendChild(div1);

			const span4 = document.createElement("span");
			span4.id = "buttonColorPrev";
			span4.onclick = () => {
				setBoardColor(state.boardColor - 1);
			};
			div.appendChild(span4);

			parent.appendChild(div);
		};

		addMenuItem(
			"menuAnalysisMode",
			"Mode 1: Analyze Board",
			1,
			state.gameMode !== 1,
			() => {
				menuAnalysisMode();
			},
		);
		addMenuItem(
			"menuPlayEngine",
			"Mode 2: Player (White) vs. Engine (Black)",
			2,
			state.gameMode !== 2,
			() => {
				menuPlayEngineWhite();
			},
		);
		addMenuItem(
			"menuPlayEngine",
			"Mode 3: Engine (White) vs. Player (Black)",
			3,
			state.gameMode !== 3,
			() => {
				menuPlayEngineBlack();
			},
		);
		addMenuItem(
			"menuTwoPlayerMode",
			"Mode 4: Player vs. Player",
			4,
			state.gameMode !== 4,
			() => {
				menuTwoPlayerMode();
			},
		);
		addMenuLine();
		addMenuItemEngine("menuAnalysisEngine", "Analysis Engine Depth");
		addMenuItemUciElo("menuPlayingEngine", "Playing Engine Rating");
		addMenuLine();
		addMenuItem("menuPromote", "Pawn Promotion: Queen", "P", true, () => {
			togglePromotionPiece();
		});
		addMenuLine();
		addMenuItem("menuCoach", state.coachModeLabel, "C", true, () => {
			toggleCoachMode();
			showHideMenu(false);
		});
		addMenuLine();
		addMenuItem(
			"menuKeep",
			"Keep Changes",
			"K",
			document.getElementById("buttonRevert").className === "on",
			() => {
				command("keep");
				showHideMenu(false);
			},
		);
		addMenuItem(
			"menuRevert",
			"Revert Changes",
			"ESC",
			document.getElementById("buttonRevert").className === "on",
			() => {
				command("revert");
				showHideMenu(false);
			},
		);
		addMenuLine();
		addMenuItem("menuFlip", "Flip Board", "F", true, () => {
			command("flip");
			showHideMenu(false);
		});
		addMenuItem("menuStm", "Change Side To Move", "T", true, () => {
			command("sidetomove");
			showHideMenu(false);
		});
		addMenuLine();
		addMenuItem(
			"menuStart",
			"Go To First Move",
			"Home",
			document.getElementById("buttonBack").className === "on",
			() => {
				historyMove(-1, null, true);
				showHideMenu(false);
			},
		);
		addMenuItem(
			"menuEnd",
			"Go To Last Move",
			"End",
			document.getElementById("buttonForward").className === "on",
			() => {
				historyMove(+1, null, true);
				showHideMenu(false);
			},
		);
		addMenuItem("menuReset", "Reset Game", "0", true, () => {
			command("reset");
			showHideMenu(false);
		});
		addMenuLine();
		addMenuItemColor("menuColor", "Chessboard Theme");
		addMenuItem("menuWindow", "Open Board In New Window", "N", true, () => {
			command("window");
			showHideMenu(false);
		});
	});
}

export function menuAnalysisMode() {
	state.gameMode = 1;
	state.play = null;
	state.analysisEngine.kill = false;
	state.analysisEngine.send("setoption name Skill Level value 20");
	showBoard(false);
	showHideMenu(false);
}

export function menuPlayEngineWhite() {
	state.gameMode = 2;
	state.isPlayerWhite = true;
	state.play = 0;
	ensurePlayEngine();
	showBoard(true);
	showHideMenu(false);
	doComputerMove();
}

export function menuPlayEngineBlack() {
	state.gameMode = 3;
	state.isPlayerWhite = false;
	state.play = 1;
	ensurePlayEngine();
	showBoard(true);
	showHideMenu(false);
	doComputerMove();
}

export function menuTwoPlayerMode() {
	state.gameMode = 4;
	state.analysisEngine.kill = true;
	state.play = null;
	showBoard(false);
	showHideMenu(false);
}
