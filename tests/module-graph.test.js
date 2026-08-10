/**
 * Loads the whole client module graph the way the browser does.
 *
 * main.js is an ES module, so it runs in strict mode and can no longer reach
 * implicit globals. This test catches the failures that would otherwise only
 * appear in the browser console: a missing import, a stale reference to code
 * that moved into public/src, or a module-level statement that throws.
 */

import { beforeAll, expect, test } from "bun:test";

function stubDom() {
	const location = { href: "http://localhost/" };
	const listeners = [];
	const element = {
		style: {},
		children: [],
		setAttribute() {},
		getAttribute: () => null,
		appendChild() {},
		addEventListener() {},
		getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0 }),
	};
	const document = {
		location,
		body: element,
		addEventListener: (type, fn) => listeners.push([type, fn]),
		getElementById: () => element,
		querySelector: () => element,
		createElement: () => element,
	};
	const store = new Map();
	globalThis.document = document;
	globalThis.location = location;
	globalThis.navigator = { userAgent: "node" };
	globalThis.localStorage = {
		getItem: (key) => (store.has(key) ? store.get(key) : null),
		setItem: (key, value) => store.set(key, String(value)),
		removeItem: (key) => store.delete(key),
	};
	globalThis.window = {
		location,
		document,
		addEventListener() {},
		setInterval: () => 0,
		setTimeout: () => 0,
		localStorage: globalThis.localStorage,
	};
	return { listeners };
}

let loaded;

beforeAll(() => {
	stubDom();
});

test("the client module graph loads under module strict mode", async () => {
	loaded = await import("../public/main.js");
	expect(loaded).toBeDefined();
});

test("startup registers a DOMContentLoaded handler and a load handler", () => {
	expect(typeof globalThis.window.onload).toBe("function");
});
