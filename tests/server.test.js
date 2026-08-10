/** Verifies the Express server serves the app with the shared security headers. */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { securityHeaders } from "../security-headers.js";
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
		const response = await fetch(`${origin}/engine/stockfish-18-lite.js`);
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
			// The SPA fallback answers with the shell, never the deleted bundle.
			expect(response.headers.get("content-type")).toContain("text/html");
		}
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
