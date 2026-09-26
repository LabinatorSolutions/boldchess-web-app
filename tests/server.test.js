/** Verifies the Express server serves the app with the shared security headers. */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { pathHeaders, securityHeaders } from "../security-headers.js";
import app from "../server.js";

let server;
let origin;

beforeAll(async () => {
	server = app.listen(0);
	await new Promise((resolve) => server.once("listening", resolve));
	origin = `http://127.0.0.1:${server.address().port}`;
});

afterAll(() => server?.close());

describe("static hosting", () => {
	test("serves the app shell", async () => {
		const response = await fetch(`${origin}/`);
		expect(response.status).toBe(200);
		expect(await response.text()).toContain(
			'<script type="module" src="main.js">',
		);
	});

	test("serves the engine worker", async () => {
		const response = await fetch(`${origin}/engine/stockfish-19-lite.js`);
		expect(response.status).toBe(200);
	});

	test("falls back to the app shell for unknown routes", async () => {
		const response = await fetch(`${origin}/some/deep/route`);
		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toContain("text/html");
	});

	test("no longer ships the removed vendor bundles", async () => {
		for (const file of [
			"tf-4.22.0.min.js",
			"pako-2.1.0.min.js",
			"protobuf-8.0.0.min.js",
		]) {
			const response = await fetch(`${origin}/libs/${file}`);
			expect(response.status).toBe(404);
		}
	});

	test("a missing asset is a 404, not the app shell", async () => {
		const response = await fetch(`${origin}/src/missing-module.js`);
		expect(response.status).toBe(404);
		expect(response.headers.get("content-type")).not.toContain("text/html");
	});

	test("the engine build is cached long-term", async () => {
		for (const file of ["stockfish-19-lite.js", "stockfish-19-lite.wasm"]) {
			const response = await fetch(`${origin}/engine/${file}`);
			expect(response.status).toBe(200);
			expect(response.headers.get("cache-control")).toBe(
				pathHeaders()[0].headers["Cache-Control"],
			);
		}
	});

	test("everything else is revalidated on each load", async () => {
		const response = await fetch(`${origin}/main.js`);
		expect(response.headers.get("cache-control")).toBe("public, max-age=0");
	});
});

describe("TRUST_PROXY", () => {
	/** Load the app in a fresh process and read back its trust proxy setting. */
	function trustProxy(value) {
		const result = Bun.spawnSync({
			cmd: [
				process.execPath,
				"-e",
				'console.log(JSON.stringify(require("./server.js").get("trust proxy")))',
			],
			cwd: `${import.meta.dir}/..`,
			env: { ...process.env, NODE_ENV: "test", TRUST_PROXY: value },
		});
		return JSON.parse(result.stdout.toString().trim());
	}

	test("is off unless set", () => {
		expect(trustProxy("")).toBe(false);
	});

	test("a hop count is passed through as a number", () => {
		expect(trustProxy("1")).toBe(1);
	});

	test("an address or keyword is passed through as text", () => {
		expect(trustProxy("loopback")).toBe("loopback");
	});
});

describe("rate limiting", () => {
	// One page load fetches the shell, the stylesheet, ~30 ES modules and the
	// engine, so a visitor reloading a few times must stay well under the limit.
	test("a handful of full page loads are never throttled", async () => {
		const statuses = new Set();
		for (let i = 0; i < 150; i++) {
			const response = await fetch(`${origin}/main.js`);
			statuses.add(response.status);
			await response.arrayBuffer();
		}
		expect([...statuses]).toEqual([200]);
	});
});

describe("security headers", () => {
	for (const [name, value] of Object.entries(securityHeaders())) {
		test(`sends ${name}`, async () => {
			const response = await fetch(`${origin}/`);
			expect(response.headers.get(name)).toBe(value);
		});
	}

	test("cross-origin isolation is enabled for SharedArrayBuffer", async () => {
		const response = await fetch(`${origin}/`);
		expect(response.headers.get("cross-origin-embedder-policy")).toBe(
			"require-corp",
		);
		expect(response.headers.get("cross-origin-opener-policy")).toBe(
			"same-origin",
		);
	});

	test("does not advertise cross-origin access", async () => {
		const response = await fetch(`${origin}/`);
		expect(response.headers.get("access-control-allow-origin")).toBeNull();
	});
});
