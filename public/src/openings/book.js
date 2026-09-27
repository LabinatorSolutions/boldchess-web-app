/**
 * The opening book: named lines from lichess-org/chess-openings (CC0), indexed
 * by position so that transpositions find the same name.
 *
 * No DOM here, so the module imports under `bun test` and #21's report can ask
 * `isBookPosition` without the UI.
 */

const FILES = "abcdefgh";

/** `{from, to, p}` as `e2e4`, or `f2g1n` for a promotion. */
export function moveToString(move) {
	const square = ({ x, y }) => FILES[x] + (8 - y);
	return (
		square(move.from) + square(move.to) + (move.p ? move.p.toLowerCase() : "")
	);
}

/**
 * The inverse of `moveToString`. The promotion piece comes back upper-case,
 * the White-side letter that `doMove` expects for either color.
 */
export function moveFromString(s) {
	const square = (at) => ({
		x: FILES.indexOf(s[at]),
		y: 8 - Number(s[at + 1]),
	});
	return {
		from: square(0),
		to: square(2),
		p: s.length > 4 ? s[4].toUpperCase() : null,
	};
}
