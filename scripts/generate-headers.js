#!/usr/bin/env node
/**
 * Generates public/_headers (Netlify) and the "headers" block of vercel.json
 * from security-headers.js, so the three deploy targets cannot drift.
 *
 *   node scripts/generate-headers.js            write the files
 *   node scripts/generate-headers.js --check    exit 1 if they are stale (CI)
 */

const fs = require("node:fs");
const path = require("node:path");
const { securityHeaders } = require("../security-headers");

const root = path.join(__dirname, "..");
const headersPath = path.join(root, "public", "_headers");
const vercelPath = path.join(root, "vercel.json");
const check = process.argv.includes("--check");

const headers = securityHeaders();

function renderNetlify() {
	const lines = [
		"# GENERATED FILE - do not edit.",
		"# Source: security-headers.js | Regenerate: bun run build",
		"",
		"/*",
	];
	for (const [name, value] of Object.entries(headers)) {
		lines.push(`  ${name}: ${value}`);
	}
	return `${lines.join("\n")}\n`;
}

function renderVercel() {
	const config = JSON.parse(fs.readFileSync(vercelPath, "utf8"));
	config.headers = [
		{
			source: "/(.*)",
			headers: Object.entries(headers).map(([key, value]) => ({ key, value })),
		},
	];
	return `${JSON.stringify(config, null, "\t")}\n`;
}

const outputs = [
	[headersPath, renderNetlify()],
	[vercelPath, renderVercel()],
];

let stale = false;
for (const [file, content] of outputs) {
	const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
	const relative = path.relative(root, file);
	if (current === content) continue;
	stale = true;
	if (check) {
		console.error(`${relative} is out of sync with security-headers.js`);
	} else {
		fs.writeFileSync(file, content);
		console.log(`wrote ${relative}`);
	}
}

if (check) {
	if (stale) {
		console.error("Run `bun run build` and commit the result.");
		process.exit(1);
	}
	console.log("Deploy headers are in sync with security-headers.js");
} else if (!stale) {
	console.log("Deploy headers already up to date");
}
