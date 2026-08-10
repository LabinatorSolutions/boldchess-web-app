import { describe, expect, test } from "bun:test";
import { loadChessCore, perft } from "./harness.js";
import { PERFT_POSITIONS, SAMPLE_POSITIONS } from "./positions.js";

const core = loadChessCore();

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

// Depth 4 on the initial position is ~12s; opt in with PERFT_DEEP=1.
const MAX_DEPTH = process.env.PERFT_DEEP ? 4 : 3;

describe("move generation (perft)", () => {
	for (const position of PERFT_POSITIONS) {
		for (const [index, expected] of position.nodes.entries()) {
			const depth = index + 1;
			if (depth > MAX_DEPTH) continue;
			test(`${position.name} depth ${depth} = ${expected}`, () => {
				expect(perft(core, core.parseFEN(position.fen), depth)).toBe(expected);
			}, 60_000); // Depth 4 runs into the hundreds of thousands of nodes.
		}
	}
});

describe("FEN", () => {
	for (const fen of SAMPLE_POSITIONS) {
		test(`round-trips ${fen}`, () => {
			expect(core.generateFEN(core.parseFEN(fen))).toBe(fen);
		});
	}

	test("getFENPos drops the clocks", () => {
		expect(core.getFENPos(START_FEN)).toBe(
			"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -",
		);
	});

	test("parseMoveNumber reads the full-move counter", () => {
		expect(core.parseMoveNumber(START_FEN)).toBe(1);
		expect(
			core.parseMoveNumber(
				"r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3",
			),
		).toBe(3);
	});
});

describe("notation", () => {
	test("parseMove and sanMove agree on a quiet pawn move", () => {
		const position = core.parseFEN(START_FEN);
		const move = core.parseMove(position, "e4");
		expect(move).not.toBeNull();
		expect(core.sanMove(position, move, core.genMoves(position))).toBe("e4");
	});

	test("every generated move survives a SAN round-trip", () => {
		for (const fen of SAMPLE_POSITIONS) {
			const position = core.parseFEN(fen);
			const moves = core.genMoves(position);
			for (const move of moves) {
				const san = core.sanMove(position, move, moves);
				const parsed = core.parseMove(position, san);
				expect(parsed, `${fen} -> ${san}`).not.toBeNull();
				expect(parsed.from, `${fen} -> ${san}`).toEqual(move.from);
				expect(parsed.to, `${fen} -> ${san}`).toEqual(move.to);
			}
		}
	});

	test("castling is written as O-O / O-O-O", () => {
		const position = core.parseFEN(
			"r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1",
		);
		const moves = core.genMoves(position);
		const sans = moves.map((move) => core.sanMove(position, move, moves));
		expect(sans).toContain("O-O");
		expect(sans).toContain("O-O-O");
	});
});

describe("rules", () => {
	test("detects a white king in check", () => {
		expect(core.isWhiteCheck(core.parseFEN(START_FEN))).toBe(false);
		expect(
			core.isWhiteCheck(
				core.parseFEN(
					"rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3",
				),
			),
		).toBe(true);
	});

	test("checkmate leaves no legal move", () => {
		// Fool's mate.
		const mated = core.parseFEN(
			"rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3",
		);
		expect(core.genMoves(mated).length).toBe(0);
	});

	test("stalemate leaves no legal move", () => {
		const stalemate = core.parseFEN("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1");
		expect(core.genMoves(stalemate).length).toBe(0);
		expect(core.isWhiteCheck(core.colorflip(stalemate))).toBe(false);
	});

	test("insufficient material", () => {
		expect(
			core.isInsufficientMaterial(
				core.parseFEN("8/8/8/4k3/8/8/4K3/8 w - - 0 1"),
			),
		).toBe(true);
		expect(
			core.isInsufficientMaterial(
				core.parseFEN("8/8/8/4k3/8/5N2/4K3/8 w - - 0 1"),
			),
		).toBe(true);
		expect(core.isInsufficientMaterial(core.parseFEN(START_FEN))).toBe(false);
	});

	test("fifty-move rule reads the halfmove clock", () => {
		expect(core.isFiftyMoveRule(core.parseFEN(START_FEN))).toBe(false);
		expect(
			core.isFiftyMoveRule(core.parseFEN("8/8/8/4k3/8/8/4K3/6R1 w - - 100 80")),
		).toBe(true);
	});

	test("en passant capture removes the passed pawn", () => {
		const position = core.parseFEN(
			"rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3",
		);
		const after = core.doMove(position, { x: 4, y: 3 }, { x: 5, y: 2 }, null);
		expect(core.generateFEN(after)).toBe(
			"rnbqkbnr/ppp1p1pp/5P2/3p4/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 3",
		);
	});

	test("castling moves the rook too", () => {
		const position = core.parseFEN("4k3/8/8/8/8/8/8/4K2R w K - 0 1");
		const after = core.doMove(position, { x: 4, y: 7 }, { x: 6, y: 7 }, null);
		expect(core.generateFEN(after)).toBe("4k3/8/8/8/8/8/8/5RK1 b - - 1 1");
	});

	test("promotion applies the requested piece", () => {
		const position = core.parseFEN("8/4P3/8/8/8/8/4k3/4K3 w - - 0 1");
		const after = core.doMove(position, { x: 4, y: 1 }, { x: 4, y: 0 }, "Q");
		expect(core.generateFEN(after)).toBe("4Q3/8/8/8/8/8/4k3/4K3 b - - 0 1");
	});
});
