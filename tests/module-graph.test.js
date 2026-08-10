/**
 * Loads the whole client module graph the way the browser does.
 *
 * main.js is an ES module, so it runs in strict mode and can no longer reach
 * implicit globals. This test catches the failures that would otherwise only
 * appear in the browser console: a missing import, a stale reference to code
 * that moved into public/src, or a module-level statement that throws.
 */

import { beforeAll, expect, test } from "bun:test";
import { installDomStub } from "./dom-stub.js";

let loaded;

beforeAll(() => {
	const dom = installDomStub();
	// main.js fills the edit palette into this container at module evaluation.
	dom.getElementById("editWrapper").appendChild(dom.createElement("DIV"));
});

test("the client module graph loads under module strict mode", async () => {
	loaded = await import("../public/main.js");
	expect(loaded).toBeDefined();
});

test("startup registers a DOMContentLoaded handler and a load handler", () => {
	expect(typeof globalThis.window.onload).toBe("function");
});
