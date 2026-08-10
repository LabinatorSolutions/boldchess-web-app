/** Keyboard shortcuts. */

import { command } from "../commands.js";
import { DEFAULT_DEPTH, MAX_DEPTH, MIN_DEPTH } from "../config.js";
import { historyMove } from "../game/history.js";
import { togglePromotionPiece } from "../game/position.js";
import { state } from "../state.js";
import { showBoard } from "../ui/board.js";
import {
	menuAnalysisMode,
	menuPlayEngineBlack,
	menuPlayEngineWhite,
	menuTwoPlayerMode,
} from "../ui/menu.js";
import { showHideWindow } from "../ui/panels.js";

export function onKeyDown(e) {
	if (e.ctrlKey) return;

	const key = e.key;
	const engineReady = state.analysisEngine?.ready;

	switch (key) {
		case "`":
		case "*":
			if (engineReady)
				command(
					`depth ${state.analysisEngine.depth !== 0 ? "0" : DEFAULT_DEPTH}`,
				);
			break;
		case "+":
			if (engineReady)
				command(`depth ${Math.min(MAX_DEPTH, state.analysisEngine.depth + 1)}`);
			break;
		case "-":
			if (engineReady)
				command(`depth ${Math.max(MIN_DEPTH, state.analysisEngine.depth - 1)}`);
			break;
		case "ArrowUp":
		case "ArrowLeft":
			historyMove(-1);
			break;
		case "PageUp":
			historyMove(-10);
			break;
		case "Home":
			historyMove(-1, null, true);
			break;
		case "ArrowDown":
		case "ArrowRight":
			historyMove(1);
			break;
		case "PageDown":
			historyMove(10);
			break;
		case "End":
			historyMove(1, null, true);
			break;
		case "R":
			showBoard(false, true);
			break;
		case "P":
			togglePromotionPiece();
			break;
		case "K":
			command("keep");
			break;
		case "Escape":
			command("revert");
			break;
		case "F":
			command("flip");
			break;
		case "T":
			command("sidetomove");
			break;
		case "0":
			command("reset");
			break;
		case "N":
			command("window");
			break;
		case "C":
			showHideWindow("Chessboard");
			break;
		case "M":
			showHideWindow("Moves");
			break;
		case "H":
			showHideWindow("History");
			break;
		case "G":
			showHideWindow("Graph");
			break;
		case "S":
			showHideWindow("Static");
			break;
		case "E":
			showHideWindow("Edit");
			break;
		case "1":
			menuAnalysisMode();
			break;
		case "2":
			menuPlayEngineWhite();
			break;
		case "3":
			menuPlayEngineBlack();
			break;
		case "4":
			menuTwoPlayerMode();
			break;
		default:
			break;
	}
}
