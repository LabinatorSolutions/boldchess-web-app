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
		})`),
	);

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
	fs.rmSync(profile, { recursive: true, force: true });

	const checks = [
		["board rendered 64 squares", dom.squares === 64],
		["move list populated", dom.moves > 0],
		["position info rendered", dom.info.length > 0],
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
