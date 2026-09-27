#!/usr/bin/env node
/**
 * End-to-end smoke test: serves the app, loads it in headless Chromium, and
 * fails on any console error or uncaught exception.
 *
 * `bun test` covers the pure chess and evaluation code; this covers what only
 * a browser can tell us - that the module graph resolves, the board renders,
 * and startup runs clean.
 *
 *   bun run smoke
 *
 * Requires a Chromium or Chrome binary; set CHROME to point at one.
 */

const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const CANDIDATES = [
	process.env.CHROME,
	"/usr/bin/chromium",
	"/usr/bin/chromium-browser",
	"/usr/bin/google-chrome",
	"/usr/bin/google-chrome-stable",
].filter(Boolean);

const DEBUG_PORT = Number(process.env.SMOKE_DEBUG_PORT || 9333);
const SETTLE_MS = Number(process.env.SMOKE_SETTLE_MS || 6000);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function findBrowser() {
	const found = CANDIDATES.find((candidate) => fs.existsSync(candidate));
	if (!found) {
		console.error(
			`No Chromium binary found. Tried:\n  ${CANDIDATES.join("\n  ")}\nSet CHROME=/path/to/chromium.`,
		);
		process.exit(2);
	}
	return found;
}

async function startServer() {
	process.env.NODE_ENV = "test"; // keeps the request log out of the output
	const app = require("../server.js");
	const server = app.listen(0);
	await new Promise((resolve) => server.once("listening", resolve));
	return { server, origin: `http://127.0.0.1:${server.address().port}` };
}

async function connect(browser) {
	const profile = fs.mkdtempSync(path.join(os.tmpdir(), "boldchess-smoke-"));
	const child = spawn(
		browser,
		[
			"--headless=new",
			`--remote-debugging-port=${DEBUG_PORT}`,
			"--no-sandbox",
			"--disable-gpu",
			`--user-data-dir=${profile}`,
			"about:blank",
		],
		{ stdio: "ignore" },
	);

	let target = null;
	for (let i = 0; i < 40 && !target; i++) {
		await sleep(250);
		try {
			const response = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
			target = (await response.json()).find((t) => t.type === "page");
		} catch {
			// devtools endpoint is not up yet
		}
	}
	if (!target) {
		child.kill();
		throw new Error("Chromium did not expose a page target");
	}
	return { child, target, profile };
}

async function main() {
	const browser = findBrowser();
	const { server, origin } = await startServer();
	const { child, target, profile } = await connect(browser);

	const socket = new WebSocket(target.webSocketDebuggerUrl);
	await new Promise((resolve) => socket.addEventListener("open", resolve));

	let nextId = 0;
	const pending = new Map();
	const errors = [];

	socket.addEventListener("message", (event) => {
		const message = JSON.parse(event.data);
		if (message.id && pending.has(message.id)) {
			pending.get(message.id)(message.result);
			pending.delete(message.id);
			return;
		}
		if (message.method === "Runtime.exceptionThrown") {
			const details = message.params.exceptionDetails;
			errors.push(details.exception?.description || details.text);
		}
		if (
			message.method === "Runtime.consoleAPICalled" &&
			message.params.type === "error"
		) {
			errors.push(
				message.params.args.map((a) => a.value ?? a.description).join(" "),
			);
		}
		if (
			message.method === "Log.entryAdded" &&
			message.params.entry.level === "error"
		) {
			errors.push(
				`${message.params.entry.source}: ${message.params.entry.text}`,
			);
		}
	});

	const send = (method, params = {}) =>
		new Promise((resolve) => {
			const id = ++nextId;
			pending.set(id, resolve);
			socket.send(JSON.stringify({ id, method, params }));
		});

	await send("Runtime.enable");
	await send("Log.enable");
	await send("Page.enable");
	await send("Page.navigate", { url: origin });
	await sleep(SETTLE_MS);

	const evaluate = async (expression) => {
		const result = await send("Runtime.evaluate", {
			expression,
			returnByValue: true,
		});
		return result.result.value;
	};

	const dom = JSON.parse(
		await evaluate(`JSON.stringify({
			squares: document.getElementById("chessboard1").children.length,
			moves: document.getElementById("moves").children.length,
			info: document.getElementById("positionInfo").textContent,
			evaluated: [...document.querySelectorAll("#moves .eval")].filter((e) =>
				/[0-9]/.test(e.textContent),
			).length,
		})`),
	);

	// Load a short game and step back through it: every position change
	// restarts the analysis, and the engine must evaluate the new position.
	await evaluate(`(() => {
		document.getElementById("searchInput").value = "1. e4 e5 2. Nf3";
		document.getElementById("simpleSearch").onsubmit();
	})()`);
	await sleep(300);
	for (let i = 0; i < 2; i++) {
		for (const type of ["keyDown", "keyUp"]) {
			await send("Input.dispatchKeyEvent", {
				type,
				key: "ArrowLeft",
				windowsVirtualKeyCode: 37,
			});
		}
		await sleep(300);
	}
	await sleep(SETTLE_MS);
	const browsed = JSON.parse(
		await evaluate(`JSON.stringify({
			info: document.getElementById("positionInfo").textContent,
			evaluated: [...document.querySelectorAll("#moves .eval")].filter((e) =>
				/[0-9]/.test(e.textContent),
			).length,
		})`),
	);

	// Reach the start position a third time. Analysis keeps it open for the
	// engine; a game (key 4, two players) ends it as a draw at once.
	const typeKey = async (key) => {
		for (const type of ["keyDown", "keyUp"])
			await send("Input.dispatchKeyEvent", { type, key, text: key });
		await sleep(300);
	};
	const repetitionStatus = () =>
		evaluate(`JSON.stringify({
			status: document.querySelector("#moves .positionStatus")?.textContent ?? "",
			evaluated: [...document.querySelectorAll("#moves .eval")].filter((e) =>
				/[0-9]/.test(e.textContent),
			).length,
		})`);
	await evaluate(`(() => {
		document.getElementById("searchInput").value =
			"1. Nf3 Nf6 2. Ng1 Ng8 3. Nf3 Nf6 4. Ng1 Ng8";
		document.getElementById("simpleSearch").onsubmit();
	})()`);
	await sleep(SETTLE_MS);
	const repeatedInAnalysis = JSON.parse(await repetitionStatus());
	await typeKey("4");
	const repeatedInGame = JSON.parse(await repetitionStatus());
	await typeKey("1");

	// In a game, the side-to-move button hands the move to the engine, which
	// plays at once; History records the swap as a null move before its reply.
	await evaluate(`(() => {
		document.getElementById("searchInput").value = "reset";
		document.getElementById("simpleSearch").onsubmit();
	})()`);
	await typeKey("2"); // the player has White, the engine Black
	await sleep(500);
	await evaluate(`document.getElementById("buttonStm").click()`);
	let afterSwap = "";
	for (let waited = 0; waited < 20000; waited += 500) {
		await sleep(500);
		afterSwap = await evaluate(
			`document.getElementById("positionText").textContent`,
		);
		if (afterSwap.startsWith("Position: 3 of 3")) break;
	}
	await typeKey("1");

	// Pre-moves. The player's second move is queued in the same task as the
	// first, before the engine can reply, so the check does not race it; the
	// highlight is read two frames later, before any reply can be drawn.
	const waitForPosition = async (text) => {
		let shown = "";
		for (let waited = 0; waited < 20000; waited += 500) {
			await sleep(500);
			shown = await evaluate(
				`document.getElementById("positionText").textContent`,
			);
			if (shown.startsWith(text)) break;
		}
		return shown;
	};
	await evaluate(`(() => {
		document.getElementById("searchInput").value = "reset";
		document.getElementById("simpleSearch").onsubmit();
	})()`);
	await typeKey("2"); // the player has White, the engine Black
	await sleep(500);
	await evaluate(`import("/src/input/mouse.js").then((mouse) => {
		mouse.doMoveHandler({ from: { x: 4, y: 6 }, to: { x: 4, y: 4 } });
		window.__premoveQueued = mouse.doMoveHandler({
			from: { x: 6, y: 7 },
			to: { x: 5, y: 5 },
		});
		requestAnimationFrame(() =>
			requestAnimationFrame(() => {
				window.__premoveSquares =
					document.querySelectorAll("#chessboard1 .h4").length;
			}),
		);
	})`);
	await waitForPosition("Position: 5 of 5");
	const premovePlayed = JSON.parse(
		await evaluate(`JSON.stringify({
			queued: window.__premoveQueued,
			squares: window.__premoveSquares,
			history: document.getElementById("history").textContent,
		})`),
	);
	// Black's only move takes the knight the player pre-moved: it is dropped.
	await typeKey("1");
	await evaluate(`(() => {
		document.getElementById("searchInput").value = "6Nk/R7/8/8/8/8/8/2K5 b - - 0 1";
		document.getElementById("simpleSearch").onsubmit();
	})()`);
	await sleep(500);
	await evaluate(`Promise.all([
		import("/src/ui/menu.js"),
		import("/src/input/mouse.js"),
		import("/src/state.js"),
	]).then(([menu, mouse, app]) => {
		window.__app = app;
		menu.menuPlayEngineWhite();
		window.__dropQueued = mouse.doMoveHandler({
			from: { x: 6, y: 0 },
			to: { x: 5, y: 2 },
		});
	})`);
	const afterDrop = await waitForPosition("Position: 2 of 2");
	await sleep(500);
	const premoveDropped = JSON.parse(
		await evaluate(`JSON.stringify({
			queued: window.__dropQueued,
			position: document.getElementById("positionText").textContent,
			premove: window.__app.state.premove,
			squares: document.querySelectorAll("#chessboard1 .h4").length,
		})`),
	);
	await typeKey("1");

	// Opening explorer: the header names the opening, the window lists book
	// moves, a continuation plays as a variation and Revert leaves it. Clicks
	// go through element.click(), so keyboard focus stays where the focus
	// checks below expect it.
	const positionInfo = () =>
		evaluate(`document.getElementById("positionInfo").textContent`);
	await evaluate(`(() => {
		document.getElementById("searchInput").value = "1. e4 e5 2. Nf3 Nc6 3. Bb5";
		document.getElementById("simpleSearch").onsubmit();
	})()`);
	await sleep(SETTLE_MS);
	const openingHeader = await evaluate(
		`document.getElementById("openingInfo").textContent`,
	);
	await evaluate(`document.getElementById("wbOpening").click()`);
	await sleep(300);
	const openingRows = await evaluate(
		`document.querySelectorAll("#openingMoves .openingMove").length`,
	);
	await evaluate(
		`document.querySelector("#openingMoves .openingMove")?.click()`,
	);
	await sleep(300);
	const afterContinuation = await positionInfo();
	await evaluate(`document.getElementById("buttonRevert").click()`);
	await sleep(300);
	const afterRevert = await positionInfo();
	await evaluate(`document.getElementById("wbOpening").click()`);
	await sleep(300);

	// Game report: 3...Nf6?? allows 4.Qxf7#, so once the background analysis
	// has evaluated the history, History marks it and the report counts it as
	// Black's blunder. Both checks need the grades to exist, so a report or a
	// History mark that never renders fails them.
	await evaluate(`(() => {
		document.getElementById("searchInput").value =
			"1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6";
		document.getElementById("simpleSearch").onsubmit();
	})()`);
	await evaluate(`document.getElementById("wbReport").click()`);
	// Done when this game's report is rendered and every move graded. The
	// previous game's report also reads as complete, so the position must be
	// this game's, and the table must exist so a report that never renders
	// waits out the timeout instead of stopping early.
	for (let waited = 0; waited < 30000; waited += 500) {
		await sleep(500);
		const graded = await evaluate(`
			document.getElementById("positionText").textContent
				.startsWith("Position: 7 of 7") &&
			document.getElementById("reportStatus").textContent === "" &&
			document.querySelectorAll("#reportTable .reportRow").length > 0`);
		if (graded) break;
	}
	const report = JSON.parse(
		await evaluate(`JSON.stringify({
			history: document.getElementById("history").textContent,
			blackBlunders: Number(
				document.querySelector("#reportTable .reportRow.blunder")?.children[2]
					?.textContent,
			),
		})`),
	);
	// Reviewing the blunder shows the position before it, with the played and
	// the engine's move drawn and the other two engine arrows hidden.
	await evaluate(
		`document.querySelector("#reportErrors .reportError")?.click()`,
	);
	await sleep(500);
	const reviewed = JSON.parse(
		await evaluate(`JSON.stringify({
			row: document.querySelector("#reportErrors .reportError")?.textContent ?? "",
			position: document.getElementById("positionText").textContent,
			arrows: document.getElementById("arrowWrapper4").style.display,
			best: document.getElementById("arrowWrapper1").style.display,
			last: document.getElementById("arrowWrapper2").style.display,
			// The arrows' box must cover the board exactly, or every arrow
			// is drawn off its squares.
			aligned: (() => {
				const a = document.getElementById("arrowWrapper4").getBoundingClientRect();
				// #chessboard1 has no height of its own (its squares are
				// absolutely placed), so the box is checked against its width.
				const b = document.getElementById("chessboard1").getBoundingClientRect();
				return (
					["top", "left", "width"].every((k) => Math.abs(a[k] - b[k]) < 1) &&
					Math.abs(a.height - b.width) < 1
				);
			})(),
		})`),
	);
	await evaluate(`document.getElementById("wbReport").click()`);
	await sleep(300);

	// The edit palette and the arrow markers are built without style attributes
	// in the markup, because CSP's style-src does not allow them. Check that the
	// palette is there and still carries the inline offsets the edit handlers
	// read back, and that the arrow line kept its presentation attributes.
	const palette = JSON.parse(
		await evaluate(`JSON.stringify((() => {
			const squares = Array.from(
				document.getElementById("editWrapper").children[0].children,
			);
			return {
				count: squares.length,
				offsets: squares.map((d) => d.style.left + "/" + d.style.top).join(" "),
				classes: squares.map((d) => d.className).join(" "),
				strokeWidth: getComputedStyle(
					document.querySelector("#arrowWrapper1 line"),
				).strokeWidth,
			};
		})())`),
	);

	// Board squares are absolutely positioned inside a zero-height container,
	// so a square's screen position comes from its own element, not from the
	// board's box.
	const centerOfSquare = (file, rankFromTop) =>
		`(() => {
			const square = [...document.getElementById("chessboard1").children].find(
				(d) => d.style.left === "${file * 40}px" && d.style.top === "${rankFromTop * 40}px",
			);
			if (!square) return null;
			const r = square.getBoundingClientRect();
			return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
		})()`;

	const centerOfElement = (id) =>
		`(() => {
			const r = document.getElementById("${id}").getBoundingClientRect();
			return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
		})()`;

	const clickAt = async (expression) => {
		const raw = await evaluate(expression);
		if (!raw)
			throw new Error(`nothing to click for ${expression.slice(0, 40)}`);
		const { x, y } = JSON.parse(raw);
		for (const type of ["mousePressed", "mouseReleased"]) {
			await send("Input.dispatchMouseEvent", {
				type,
				x,
				y,
				button: "left",
				buttons: type === "mousePressed" ? 1 : 0,
				clickCount: 1,
			});
		}
		await sleep(300);
	};

	// Drive the input handlers. Synthesized events do not complete a move in
	// headless Chromium (the pre-split code behaves the same way), so these are
	// here to *run* the mouse, wheel, keyboard, board and menu code paths - any
	// broken import or bad reference in them surfaces as a console error below,
	// which is what this test asserts on.
	await clickAt(centerOfSquare(4, 6)); // e2
	await clickAt(centerOfSquare(4, 4)); // e4
	await clickAt(centerOfElement("buttonMenu"));
	await clickAt(centerOfElement("buttonFlip"));
	await clickAt(centerOfElement("buttonStm"));

	const board = JSON.parse(await evaluate(centerOfSquare(4, 4)));
	await send("Input.dispatchMouseEvent", {
		type: "mouseWheel",
		x: board.x,
		y: board.y,
		deltaX: 0,
		deltaY: -120,
	});
	for (const key of ["ArrowRight", "ArrowLeft", "f", "Escape"]) {
		for (const type of ["keyDown", "keyUp"]) {
			await send("Input.dispatchKeyEvent", {
				type,
				key,
				windowsVirtualKeyCode: 0,
			});
		}
	}
	await sleep(400);

	// Panels that only render on demand.
	// Run the window-bar handler directly: it is the real showHideWindow path,
	// and a synthesized click on the bar does not always land in headless mode.
	await evaluate(
		`document.getElementById("wbEdit").onclick.call(document.getElementById("wbEdit"))`,
	);
	await evaluate(`document.getElementById("wStatic").style.display = ""`);
	await clickAt(centerOfElement("buttonStaticSortByChange"));
	await clickAt(centerOfElement("buttonMovesPv"));
	await sleep(400);

	// Keyboard access: a script-built window-bar button and a markup <button>
	// both answer Space/Enter like a native control.
	const pressKey = async (key, code) => {
		for (const type of ["keyDown", "keyUp"]) {
			await send("Input.dispatchKeyEvent", {
				type,
				key,
				code,
				windowsVirtualKeyCode: key === " " ? 32 : 13,
				// A native button activates on the keypress a real key produces,
				// which CDP only sends when the event carries its text.
				text: type === "keyDown" ? (key === " " ? " " : "\r") : undefined,
			});
		}
		await sleep(300);
	};
	const historyShown = () =>
		evaluate(`document.getElementById("wHistory").style.display !== "none"`);
	const historyBefore = await historyShown();
	await evaluate(`document.getElementById("wbHistory").focus()`);
	await pressKey(" ", "Space");
	const historyAfterSpace = await historyShown();
	await pressKey("Enter", "Enter");
	const historyAfterEnter = await historyShown();
	const flippedBefore = await evaluate(
		`document.querySelector("#cbTable td:nth-child(2)").textContent`,
	);
	await evaluate(`document.getElementById("buttonFlip").focus()`);
	await pressKey("Enter", "Enter");
	const flippedAfter = await evaluate(
		`document.querySelector("#cbTable td:nth-child(2)").textContent`,
	);
	const keyboard = {
		panelToggles:
			historyAfterSpace === !historyBefore &&
			historyAfterEnter === historyBefore,
		flipButton: flippedBefore !== flippedAfter,
		focusRing: await evaluate(
			`getComputedStyle(document.getElementById("buttonFlip")).outlineStyle`,
		),
	};

	// The menu, opened from the keyboard, takes focus; keeps it on the same
	// control when a press rebuilds the menu; and gives it back on Escape.
	const focusedId = () =>
		evaluate(`(() => {
			const a = document.activeElement;
			return a.closest("#menu") ? "menu:" + (a.id || a.className) : a.id;
		})()`);
	await evaluate(`document.getElementById("buttonMenu").focus()`);
	await pressKey("Enter", "Enter");
	await sleep(300);
	const menuOpenFocus = await focusedId();
	await evaluate(`document.getElementById("buttonEnginePlus").focus()`);
	await pressKey("Enter", "Enter");
	await sleep(300);
	const menuRebuiltFocus = await focusedId();
	for (const type of ["keyDown", "keyUp"])
		await send("Input.dispatchKeyEvent", {
			type,
			key: "Escape",
			code: "Escape",
			windowsVirtualKeyCode: 27,
		});
	await sleep(300);
	const menuClosed = {
		focus: await focusedId(),
		hidden: await evaluate(
			`document.getElementById("menu").style.display === "none"`,
		),
	};

	// A click that spans a board redraw still selects its piece. In a game the
	// engine's reply redraws every square; one landing while the button was
	// held left the click on a detached square, which threw in onMouseUp.
	await evaluate(`(() => {
		document.getElementById("searchInput").value = "reset";
		document.getElementById("simpleSearch").onsubmit();
	})()`);
	await sleep(500);
	const pawn = JSON.parse(
		await evaluate(`(() => {
			const square = [...document.getElementById("chessboard1").children].find(
				(d) => d.className.split(" ")[1] === "P",
			);
			const r = square.getBoundingClientRect();
			return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
		})()`),
	);
	await send("Input.dispatchMouseEvent", {
		type: "mousePressed",
		...pawn,
		button: "left",
		buttons: 1,
		clickCount: 1,
	});
	await sleep(100);
	await evaluate(`import("/src/ui/board.js").then((m) => m.showBoard(true))`);
	await sleep(300);
	await send("Input.dispatchMouseEvent", {
		type: "mouseReleased",
		...pawn,
		button: "left",
		buttons: 0,
		clickCount: 1,
	});
	await sleep(300);
	const selectedAcrossRedraw = await evaluate(
		`[...document.getElementById("chessboard1").children].some((d) => d.className.includes(" h0"))`,
	);

	const afterInteraction = JSON.parse(
		await evaluate(`JSON.stringify({
			squares: document.getElementById("chessboard1").children.length,
			editOpen: document.getElementById("wEdit").style.display !== "none",
		})`),
	);

	// Reload with the startup parameters so the URL-parameter and play-mode
	// paths run too.
	await send("Page.navigate", { url: `${origin}/?mode=play&a=e4` });
	await sleep(SETTLE_MS);
	const afterReload = JSON.parse(
		await evaluate(`JSON.stringify({
			squares: document.getElementById("chessboard1").children.length,
			moves: document.getElementById("moves").children.length,
		})`),
	);

	socket.close();
	child.kill();
	server.close();
	// Chromium may still be writing its profile as it exits; retry the ENOTEMPTY.
	fs.rmSync(profile, {
		recursive: true,
		force: true,
		maxRetries: 10,
		retryDelay: 200,
	});

	const checks = [
		["board rendered 64 squares", dom.squares === 64],
		["move list populated", dom.moves > 0],
		["position info rendered", dom.info.length > 0],
		["engine evaluated the legal moves", dom.evaluated > 0],
		[
			"stepping back through a loaded game",
			browsed.info.startsWith("Position: 2 of 4"),
		],
		["engine re-evaluates after stepping back", browsed.evaluated > 0],
		[
			"analysis keeps evaluating a threefold repetition",
			repeatedInAnalysis.status === "" && repeatedInAnalysis.evaluated > 0,
		],
		[
			"a game ends on threefold repetition",
			repeatedInGame.status === "Draw - Threefold Repetition",
		],
		[
			"the engine plays after the side-to-move button",
			afterSwap.startsWith("Position: 3 of 3"),
		],
		[
			"a pre-move is highlighted and played after the engine's reply",
			premovePlayed.queued === true &&
				premovePlayed.squares === 2 &&
				/2\.\s*Nf3/.test(premovePlayed.history),
		],
		[
			"a pre-move the reply made illegal is dropped",
			premoveDropped.queued === true &&
				afterDrop.startsWith("Position: 2 of 2") &&
				premoveDropped.position.startsWith("Position: 2 of 2") &&
				premoveDropped.premove === null &&
				premoveDropped.squares === 0,
		],
		["opening named in the header", openingHeader.includes("Ruy Lopez")],
		["opening window lists continuations", openingRows > 0],
		[
			"a continuation plays as a variation",
			afterContinuation.startsWith("Position: 7 of 7"),
		],
		[
			"revert leaves the opening variation",
			afterContinuation.startsWith("Position: 7 of 7") &&
				afterRevert.startsWith("Position: 6 of 6"),
		],
		["a blunder is marked in the history", report.history.includes("??")],
		["the game report counts Black's blunder", report.blackBlunders >= 1],
		[
			"the game report names the better move",
			reviewed.row.includes(" \u00b7 best "),
		],
		[
			"reviewing a blunder shows both moves before it",
			reviewed.position.startsWith("Position: 6 of 7") &&
				reviewed.arrows === "block" &&
				reviewed.best === "none" &&
				reviewed.last === "none",
		],
		["the review arrows sit on the board's squares", reviewed.aligned],
		["a click across a board redraw selects its piece", selectedAcrossRedraw],
		[
			"board intact after exercising the input handlers",
			afterInteraction.squares === 64,
		],
		[
			"board intact after reloading with startup parameters",
			afterReload.squares === 64,
		],
		["move list still populated after reload", afterReload.moves > 0],
		["edit palette built with 14 squares", palette.count === 14],
		[
			"palette squares carry the offsets the edit handlers read",
			palette.offsets ===
				[
					"0px/0px 40px/0px 80px/0px 120px/0px 160px/0px 200px/0px 240px/0px",
					"0px/40px 40px/40px 80px/40px 120px/40px 160px/40px 200px/40px 240px/40px",
				].join(" "),
		],
		[
			"palette squares carry the piece classes",
			palette.classes ===
				"l S d p l n d b l r d q l k d - l P d N l B d R l Q d K",
		],
		["arrow line keeps its stroke width", palette.strokeWidth === "6px"],
		["edit panel opens from the window bar", afterInteraction.editOpen],
		["window bar buttons work from the keyboard", keyboard.panelToggles],
		["toolbar buttons work from the keyboard", keyboard.flipButton],
		["keyboard focus is visible", keyboard.focusRing === "solid"],
		[
			"a menu opened from the keyboard takes focus",
			menuOpenFocus.startsWith("menu:"),
		],
		[
			"menu focus survives a rebuild",
			menuRebuiltFocus === "menu:buttonEnginePlus",
		],
		[
			"Escape closes the menu and returns focus",
			menuClosed.hidden && menuClosed.focus === "buttonMenu",
		],
		["no console errors", errors.length === 0],
	];

	let failed = false;
	for (const [name, ok] of checks) {
		console.log(`${ok ? "ok  " : "FAIL"} ${name}`);
		if (!ok) failed = true;
	}
	for (const error of errors) console.error(`     ${error.split("\n")[0]}`);

	process.exit(failed ? 1 : 0);
}

main().catch((error) => {
	console.error("smoke test failed to run:", error.message);
	process.exit(2);
});
