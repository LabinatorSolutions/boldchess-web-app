/**
 * Builds public/data/openings.json from the vendored lichess TSVs in
 * data/chess-openings/ (see SOURCE there for the upstream commit).
 *
 * Every line is replayed with the app's own move parser, so an illegal or
 * ambiguous move fails the build instead of shipping a line the browser
 * cannot follow. Output: `[[eco, name, "e2e4 e7e5 ..."], ...]` in file order.
 *
 *   node scripts/build-openings.mjs           write the file
 *   node scripts/build-openings.mjs --check   fail if the file is out of date
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseFEN } from "../public/src/chess/fen.js";
import { parseMove } from "../public/src/chess/notation.js";
import { doMove } from "../public/src/chess/rules.js";
import { START } from "../public/src/config.js";
import { moveToString } from "../public/src/openings/book.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public/data/openings.json");

function build() {
	const entries = [];
	for (const f of ["a", "b", "c", "d", "e"]) {
		const file = `data/chess-openings/${f}.tsv`;
		const lines = readFileSync(join(ROOT, file), "utf8").split("\n");
		for (let i = 1; i < lines.length; i++) {
			if (lines[i].trim() === "") continue;
			const [eco, name, pgn] = lines[i].split("\t");
			let pos = parseFEN(START);
			const moves = [];
			for (const san of pgn
				.replace(/\d+\.+/g, " ")
				.trim()
				.split(/\s+/)) {
				const move = parseMove(pos, san);
				if (move == null)
					throw new Error(`${file}:${i + 1}: illegal move ${san} in ${name}`);
				moves.push(moveToString(move));
				pos = doMove(pos, move.from, move.to, move.p);
			}
			entries.push([eco, name, moves.join(" ")]);
		}
	}
	return `${JSON.stringify(entries)}\n`;
}

const json = build();
if (process.argv.includes("--check")) {
	let current = "";
	try {
		current = readFileSync(OUT, "utf8");
	} catch {}
	if (current !== json) {
		console.error(
			"public/data/openings.json is out of date; run bun run build:openings",
		);
		process.exit(1);
	}
	console.log("Opening book data is in sync with data/chess-openings");
} else {
	writeFileSync(OUT, json);
	console.log(`Wrote ${OUT}`);
}
