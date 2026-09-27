/**
 * Type-checking only (`bun run typecheck`); nothing here is shipped.
 *
 * The client stores a few values directly on the DOM nodes it builds, and
 * reads them back in event handlers. Declaring them here lets `tsc --checkJs`
 * check those reads instead of reporting every one as unknown.
 */

interface HTMLElement {
	/** Board circle: tooltip text (SAN plus evaluation). */
	tooltip?: string;
	/** Board circle: the engine's reply line, shown on hover. */
	answerpv?: string[];
	/** Board circle: its CSS class ("circle" or a colored variant). */
	cl?: string;
	/** Move-list row: index into `state.curmoves`. */
	index?: number;
	/** History span: the `state.history` index it jumps to. */
	targetindex?: number;
	/** Static-eval row: the term name it expands. */
	name?: string;
	/** Draggable window: its CSS size ("300px") before a resize started. */
	originalWidth?: string;
	originalHeight?: string;
	/** Search box: 0 = not focused, 1 = focused by a click, 2 = click done. */
	focuswithmouse?: number;
}
