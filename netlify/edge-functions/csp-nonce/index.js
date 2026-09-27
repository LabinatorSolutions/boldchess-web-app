/**
 * Netlify edge function: give each HTML response a fresh CSP nonce.
 *
 * Cloudflare's proxy injects its bot "JavaScript Detections" as an inline
 * script. The CSP has no 'unsafe-inline', so it would be blocked; instead
 * Cloudflare reads the nonce from this response's CSP header and adds it to
 * the scripts it injects. The app's own page has no inline script.
 *
 * Netlify does not apply `_headers` to content an edge function handles, so
 * every security header is set here, from `headers.js`, which `bun run build`
 * generates from security-headers.js.
 */

import { HEADERS } from "./headers.js";

/** 16 random bytes, base64: a new nonce per response. */
function newNonce() {
	const bytes = crypto.getRandomValues(new Uint8Array(16));
	return btoa(String.fromCharCode(...bytes));
}

export default async function cspNonce(_request, context) {
	const response = await context.next();
	const type = response.headers.get("content-type") ?? "";
	if (!type.startsWith("text/html")) return response;
	for (const [name, value] of Object.entries(HEADERS))
		response.headers.set(name, value);
	response.headers.set(
		"Content-Security-Policy",
		HEADERS["Content-Security-Policy"].replace(
			"script-src ",
			`script-src 'nonce-${newNonce()}' `,
		),
	);
	return response;
}

export const config = { path: ["/", "/index.html"] };
