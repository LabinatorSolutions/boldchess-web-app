/**
 * The piece palette in the Edit panel.
 *
 * These fourteen squares used to be written out in index.html with inline
 * `left`/`top` style attributes. The edit handlers read those values back
 * (`showLegalMoves` and the drag code turn them into palette coordinates), so
 * they have to stay inline styles - but a style set from JavaScript is not what
 * CSP's `style-src` restricts, and building them here is what lets the markup
 * ship without a single `style=` attribute.
 */

/** Top row is black plus the piece eraser, bottom row is white plus an empty square. */
const PALETTE_ROWS = [
	["S", "p", "n", "b", "r", "q", "k"],
	["-", "P", "N", "B", "R", "Q", "K"],
];

const SQUARE = 40;

export function buildEditPalette() {
	const board = document.getElementById("editWrapper").children[0];
	while (board.firstChild) board.removeChild(board.firstChild);
	for (let y = 0; y < PALETTE_ROWS.length; y++) {
		for (let x = 0; x < PALETTE_ROWS[y].length; x++) {
			const div = document.createElement("div");
			div.style.left = `${x * SQUARE}px`;
			div.style.top = `${y * SQUARE}px`;
			div.className = `${(x + y) % 2 ? "d" : "l"} ${PALETTE_ROWS[y][x]}`;
			board.appendChild(div);
		}
	}
}
