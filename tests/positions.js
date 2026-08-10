/** Shared FEN corpus used by the chess-core and static-evaluation tests. */

// Standard perft positions with published node counts.
// Source: https://www.chessprogramming.org/Perft_Results
const PERFT_POSITIONS = [
	{
		name: "initial position",
		fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
		nodes: [20, 400, 8902, 197281],
	},
	{
		name: "kiwipete",
		fen: "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1",
		nodes: [48, 2039, 97862],
	},
	{
		name: "endgame with en passant",
		fen: "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1",
		nodes: [14, 191, 2812],
	},
	{
		name: "promotion and pins",
		fen: "r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1",
		nodes: [6, 264, 9467],
	},
];

/** Positions with distinctive structure, used for FEN and evaluation checks. */
const SAMPLE_POSITIONS = [
	"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
	"rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2",
	"r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3",
	"r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1",
	"8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1",
	"4k3/8/8/8/8/8/8/4K2R w K - 0 1",
	"8/8/8/4k3/8/8/4K3/8 w - - 0 1",
	"6k1/5ppp/8/8/8/8/5PPP/6K1 w - - 0 1",
	"r1bq1rk1/pp2bppp/2n1pn2/2pp4/3P1B2/2PBPN2/PP1N1PPP/R2Q1RK1 w - - 0 9",
	"2kr3r/ppp2ppp/2n1bq2/8/3P4/2N1BN2/PPP2PPP/R2Q1RK1 b - - 4 12",
];

module.exports = { PERFT_POSITIONS, SAMPLE_POSITIONS };
