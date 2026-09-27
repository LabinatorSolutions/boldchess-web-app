/**
 * The Netlify edge function that gives each HTML response a fresh CSP nonce,
 * which Cloudflare copies onto the scripts its proxy injects.
 */

import { expect, test } from "bun:test";
import cspNonce, { config } from "../netlify/edge-functions/csp-nonce/index.js";
import { securityHeaders } from "../security-headers.js";

/** A Netlify context whose next() serves `body` with `type`. */
const context = (type, body = "<!doctype html>") => ({
	next: async () => new Response(body, { headers: { "content-type": type } }),
});

const scriptSrc = (csp) =>
	csp
		.split(";")
		.map((d) => d.trim())
		.find((d) => d.startsWith("script-src "));

test("an HTML response gets every security header and a nonce", async () => {
	const response = await cspNonce(
		new Request("https://webapp.boldchess.com/"),
		context("text/html; charset=UTF-8"),
	);
	const expected = securityHeaders();
	for (const [name, value] of Object.entries(expected)) {
		if (name === "Content-Security-Policy") continue;
		expect(response.headers.get(name)).toBe(value);
	}
	const csp = response.headers.get("Content-Security-Policy");
	expect(scriptSrc(csp)).toMatch(/^script-src 'nonce-[A-Za-z0-9+/]{22}==' /);
	expect(csp.replace(/'nonce-[^']+' /, "")).toBe(
		expected["Content-Security-Policy"],
	);
	expect(await response.text()).toBe("<!doctype html>");
});

test("each response gets a different nonce", async () => {
	const nonces = new Set();
	for (let i = 0; i < 20; i++) {
		const response = await cspNonce(
			new Request("https://webapp.boldchess.com/"),
			context("text/html"),
		);
		nonces.add(scriptSrc(response.headers.get("Content-Security-Policy")));
	}
	expect(nonces.size).toBe(20);
});

test("a response that is not HTML passes through untouched", async () => {
	const response = await cspNonce(
		new Request("https://webapp.boldchess.com/"),
		context("application/json"),
	);
	expect(response.headers.get("Content-Security-Policy")).toBeNull();
});

test("it runs only for the page itself", () => {
	expect(config.path).toEqual(["/", "/index.html"]);
});
