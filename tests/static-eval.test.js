/**
 * Regression guard for the classical static evaluation.
 *
 * The evaluation is ~1600 lines of numeric code with no readable invariants,
 * so it is pinned with a snapshot instead: every term, for a fixed set of
 * positions, is compared against a committed golden file. Any refactor that
 * changes a single coefficient shows up as a diff.
 *
 * Regenerate deliberately (and review the diff) with:
 *   UPDATE_SNAPSHOTS=1 bun test tests/static-eval.test.js
 */

import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { loadChessCore } from "./harness.js";
import { SAMPLE_POSITIONS } from "./positions.js";

const core = loadChessCore();
const SNAPSHOT = path.join(__dirname, "__snapshots__", "static-eval.json");

/** Reduce one position's evaluation terms to a stable, diffable shape. */
function evaluate(fen) {
	const terms = core.getStaticEvalList(core.parseFEN(fen));
	return terms.map((term) => ({
		group: term.group,
		elem: term.elem,
		// JSON has no negative zero, so normalise it away before comparing.
		item: term.item.map((value) => (value === 0 ? 0 : value)),
	}));
}

const current = Object.fromEntries(
	SAMPLE_POSITIONS.map((fen) => [fen, evaluate(fen)]),
);

if (process.env.UPDATE_SNAPSHOTS) {
	fs.mkdirSync(path.dirname(SNAPSHOT), { recursive: true });
	fs.writeFileSync(SNAPSHOT, `${JSON.stringify(current, null, "\t")}\n`);
}

describe("classical static evaluation", () => {
	const golden = JSON.parse(fs.readFileSync(SNAPSHOT, "utf8"));

	test("covers every sample position", () => {
		expect(Object.keys(golden).sort()).toEqual([...SAMPLE_POSITIONS].sort());
	});

	for (const fen of SAMPLE_POSITIONS) {
		test(`matches the snapshot for ${fen}`, () => {
			expect(current[fen]).toEqual(golden[fen]);
		});
	}

	test("reports a non-zero evaluation for an unbalanced position", () => {
		const terms = evaluate(
			"r1bq1rk1/pp2bppp/2n1pn2/2pp4/3P1B2/2PBPN2/PP1N1PPP/R2Q1RK1 w - - 0 9",
		);
		const nonZero = terms.filter((term) =>
			term.item.some((value) => value !== 0),
		);
		expect(nonZero.length).toBeGreaterThan(0);
	});
});
