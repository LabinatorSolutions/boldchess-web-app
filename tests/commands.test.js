/**
 * Behaviour of the command box.
 *
 * `command()` is the app's text entry point: it loads FENs and PGNs, runs the
 * keyword commands, encodes and decodes the shareable `~` game string, and
 * falls through to playing a move typed in SAN. None of it was covered before,
 * so these tests pin the observable results - the current FEN, the history and
 * the state object - rather than the rendering it triggers.
 */

import { beforeAll, beforeEach, expect, test } from "bun:test";
import {
	installBoardTable,
	installDomStub,
	installWindowBar,
} from "./dom-stub.js";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const WINDOWS = ["Chessboard", "Moves", "History", "Graph"];

let dom;
let command;
let state;
let historyEntry;
let getCurFEN;
let setCurFEN;
let genMoves;
let parseFEN;
let sanMove;

beforeAll(async () => {
	dom = installDomStub();
	({ command } = await import("../public/src/commands.js"));
	({ historyEntry, state } = await import("../public/src/state.js"));
	({ getCurFEN, setCurFEN } = await import("../public/src/game/position.js"));
	({ genMoves } = await import("../public/src/chess/rules.js"));
	({ parseFEN } = await import("../public/src/chess/fen.js"));
	({ sanMove } = await import("../public/src/chess/notation.js"));
});

beforeEach(() => {
	setCurFEN(START);
	state.history = [{ fen: START, evaluation: null, move: null, san: null }];
	state.historyindex = 0;
	state.history2 = null;
	state.curmoves = [];
	state.analysisEngine = undefined;
	state.play = null;
	state.boardColor = 0;
	state.flip = false;
	state.wname = "White";
	state.bname = "Black";
	dom.openedUrls.length = 0;
	dom.alerts.length = 0;
});

/** The moves legal in `fen`, in the shape `command()`'s SAN fallthrough wants. */
function legalMoves(fen) {
	const pos = parseFEN(fen);
	const moves = genMoves(pos);
	return moves.map((move) => ({ move, san: sanMove(pos, move, moves) }));
}

test("an empty or missing command is ignored", () => {
	command(null);
	command("");
	expect(getCurFEN()).toBe(START);
	expect(state.history).toEqual([historyEntry(START)]);
});

test("a FEN loads as a fresh single-entry history", () => {
	const fen = "8/8/8/4k3/8/8/4K3/8 w - - 0 1";
	command(fen);
	expect(getCurFEN()).toBe(fen);
	expect(state.history).toEqual([historyEntry(fen)]);
	expect(state.historyindex).toBe(0);
});

test("a PGN move list replays into history with SAN", () => {
	command("1. e4 e5 2. Nf3 Nc6");
	expect(state.history.length).toBe(5);
	expect(state.history.map((entry) => entry.san)).toEqual([
		null,
		"e4",
		"e5",
		"Nf3",
		"Nc6",
	]);
	expect(state.history[0].fen).toBe(START);
	expect(getCurFEN()).toContain("r1bqkbnr/pppp1ppp");
});

test("PGN tag pairs set the player names", () => {
	command("[White 'Ada'] [Black 'Linus'] 1. d4 d5");
	expect(state.wname).toBe("Ada");
	expect(state.bname).toBe("Linus");
});

test("an illegal PGN move stops the replay and alerts", () => {
	command("1. e4 e5 2. Qh9");
	expect(dom.alerts.length).toBe(1);
	expect(dom.alerts[0]).toContain("Incorrect move");
	expect(state.history.length).toBe(3);
});

test("reset returns to the starting position", () => {
	command("1. e4 e5");
	command("reset");
	expect(getCurFEN()).toBe(START);
	expect(state.history).toEqual([historyEntry(START)]);
	expect(state.historyindex).toBe(0);
	expect(state.history2).toBe(null);
});

test("clear empties the board", () => {
	command("clear");
	expect(getCurFEN()).toBe("8/8/8/8/8/8/8/8 w - - 0 0");
});

test("colorflip mirrors the position and the side to move", () => {
	command("8/8/8/4k3/8/8/4K3/8 w - - 0 1");
	command("colorflip");
	expect(getCurFEN()).toBe("8/4k3/8/8/4K3/8/8/8 b - - 0 1");
});

test("sidetomove swaps only the side to move", () => {
	command("sidetomove");
	expect(getCurFEN()).toBe(START.replace(" w ", " b "));
	command("sidetomove");
	expect(getCurFEN()).toBe(START);
});

test("depth clamps to the engine range and falls back on nonsense", () => {
	state.analysisEngine = { ready: true, depth: 16 };
	command("depth 8");
	expect(state.analysisEngine.depth).toBe(8);
	command("depth 99");
	expect(state.analysisEngine.depth).toBe(24);
	command("depth -5");
	expect(state.analysisEngine.depth).toBe(0);
	command("depth abc");
	expect(state.analysisEngine.depth).toBe(16);
});

test("depth is a no-op while no engine is ready", () => {
	state.analysisEngine = { ready: false, depth: 16 };
	command("depth 8");
	expect(state.analysisEngine.depth).toBe(16);
});

test("flip toggles the board orientation", () => {
	installBoardTable(dom);
	command("flip");
	expect(state.flip).toBe(true);
	command("flip");
	expect(state.flip).toBe(false);
});

test("col sets the board colour and wraps out-of-range values", () => {
	command("col3");
	expect(state.boardColor).toBe(3);
	command("col9");
	expect(state.boardColor).toBe(0);
});

test("keep clears the variation snapshot and records the names", () => {
	state.history2 = { index: 0, entries: [historyEntry(START)] };
	state.wname = "Ada";
	state.bname = "Linus";
	command("keep");
	expect(state.history2).toBe(null);
	expect(state.wname).toBe("Ada");
	expect(state.bname).toBe("Linus");
});

test("revert restores the snapshot taken when a variation started", () => {
	command("1. e4 e5");
	const mainline = JSON.parse(JSON.stringify(state.history));
	// A move played from the board (oldhistory == null) snapshots the mainline.
	state.curmoves = legalMoves(getCurFEN());
	command(state.curmoves[0].san);
	expect(state.history2).not.toBe(null);
	command("revert");
	expect(state.history2).toBe(null);
	expect(state.history).toEqual(mainline);
	expect(getCurFEN()).toBe(mainline[state.historyindex].fen);
});

test("revert without a snapshot leaves the game alone", () => {
	command("1. e4 e5");
	const before = JSON.parse(JSON.stringify(state.history));
	command("revert");
	expect(state.history).toEqual(before);
});

test("window builds a shareable url and ~ decodes it back to the same game", () => {
	installWindowBar(dom, WINDOWS);
	command("1. e4 e5 2. Nf3 Nc6");
	const played = state.history.map((entry) => entry.fen);

	command("window");
	expect(dom.openedUrls.length).toBe(1);
	const encoded = decodeURIComponent(dom.openedUrls[0]).match(/~[^&]+/);
	expect(encoded).not.toBe(null);

	command("reset");
	command(encoded[0]);
	expect(state.history.map((entry) => entry.fen)).toEqual(played);
	expect(state.history.map((entry) => entry.san)).toEqual([
		null,
		"e4",
		"e5",
		"Nf3",
		"Nc6",
	]);
});

test("window falls back to the FEN when the game did not start from scratch", () => {
	installWindowBar(dom, WINDOWS);
	const fen = "8/8/8/4k3/8/8/4K3/8 w - - 0 1";
	command(fen);
	command("window");
	expect(decodeURIComponent(dom.openedUrls[0])).toContain(fen);
});

test("layout shows the named windows and hides the rest", () => {
	installWindowBar(dom, WINDOWS);
	command("layout c m");
	expect(dom.getElementById("wChessboard").style.display).toBe("");
	expect(dom.getElementById("wMoves").style.display).toBe("");
	expect(dom.getElementById("wHistory").style.display).toBe("none");
	expect(dom.getElementById("wGraph").style.display).toBe("none");
});

test("layout applies the size and position it carries", () => {
	installWindowBar(dom, WINDOWS);
	command("layout g300,200,40,50");
	const graph = dom.getElementById("wGraph");
	expect(graph.style.width).toBe("300px");
	expect(graph.style.height).toBe("200px");
	expect(graph.style.left).toBe("40px");
	expect(graph.style.top).toBe("50px");
	expect(graph.style.position).toBe("absolute");
});

test("an unrecognised word plays the matching legal move", () => {
	state.curmoves = legalMoves(START);
	command("e4");
	expect(getCurFEN()).toContain("4P3");
	expect(state.history.length).toBe(2);
	expect(state.history[1].san).toBe("e4");
});

test("an unrecognised word that is not a legal move changes nothing", () => {
	state.curmoves = legalMoves(START);
	command("zz9");
	expect(getCurFEN()).toBe(START);
	expect(state.history).toEqual([historyEntry(START)]);
});

test("a lichess moves pane is scraped into a replayable game", () => {
	const pane =
		'<div class="moves">' +
		"<index>1</index><move>e4</move><move>e5</move>" +
		"<index>2</index><move>Nf3</move><move>Nc6</move>" +
		"</div>";
	command(pane);
	expect(state.history.map((entry) => entry.san)).toEqual([
		null,
		"e4",
		"e5",
		"Nf3",
		"Nc6",
	]);
});
