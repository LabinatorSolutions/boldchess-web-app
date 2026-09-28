/** Small DOM helpers shared by the panels. */

import { isMobile } from "../env.js";
import { state } from "../state.js";

/**
 * `getElementById` for the page's own ids, which `index.html` always has: the
 * result is typed non-null. It is only a cast, so a missing id still fails at
 * the first use, as it did before `strictNullChecks`.
 *
 * @param {string} id
 */
export function byId(id) {
	return /** @type {HTMLElement} */ (document.getElementById(id));
}

/**
 * @param {Node} elem
 * @param {string} value
 */
export function setElemText(elem, value) {
	while (elem.firstChild) elem.removeChild(elem.firstChild);
	elem.appendChild(document.createTextNode(value));
}

/**
 * Let the keyboard press a `role="button"` element: Enter or Space runs its
 * click handler, as they would on a real <button>.
 *
 * @param {HTMLElement} elem
 */
function addKeyActivation(elem) {
	elem.addEventListener("keydown", (event) => {
		if (event.key !== "Enter" && event.key !== " ") return;
		event.preventDefault();
		elem.click();
	});
}

/**
 * Turn a clickable element built in script into a keyboard-operable button:
 * focusable, announced as a button with `label` as its name.
 *
 * @param {HTMLElement} elem
 * @param {string} [label]
 */
export function makeButton(elem, label) {
	elem.setAttribute("role", "button");
	elem.tabIndex = 0;
	if (label) elem.setAttribute("aria-label", label);
	addKeyActivation(elem);
}

/**
 * Mirror an `on`/`off` toolbar state for assistive technology.
 *
 * @param {Element} elem
 * @param {boolean} enabled
 */
export function setButtonEnabled(elem, enabled) {
	elem.className = enabled ? "on" : "off";
	elem.setAttribute("aria-disabled", String(!enabled));
}

/**
 * An element's text. `textContent` is null only on documents and doctypes.
 *
 * @param {Node} elem
 */
export function getElemText(elem) {
	return elem.textContent ?? "";
}

/**
 * @param {number | null} e
 * @param {boolean} [s] Short form, as in the move list.
 */
export function getEvalText(e, s) {
	if (e == null) return s ? "" : "?";
	const matein = Math.abs(Math.abs(e) - 1000000);
	if (Math.abs(e) > 900000) {
		return s
			? (e > 0 ? "+M" : "-M") + matein
			: (e > 0 ? "white mate in " : "black mate in ") + matein;
	}
	return (e / 100).toFixed(2);
}

/** @param {{clientY: number}} e */
export function getClientY(e) {
	if (!isMobile) return e.clientY;
	const scrollOffset =
		(window.pageYOffset || document.documentElement.scrollTop) -
		(document.documentElement.clientTop || 0);
	return (e.clientY + scrollOffset) * state.bodyScale;
}

export function getCurScale() {
	if (byId("wChessboard").style.display === "none") return 1;
	return Math.min(
		(byId("wChessboard").clientWidth - 414 + 408) / 408,
		(byId("wChessboard").clientHeight + (isMobile ? 30 : 0) - 437 + 368) / 368,
	);
}

/** @param {string} winId */
export function scrollReset(winId) {
	requestAnimationFrame(() => {
		const windowElem = byId(`w${winId}`);
		const scrollElem = byId(winId.toLowerCase());
		const oldDisplay = windowElem.style.display;
		windowElem.style.display = "";
		scrollElem.scrollTop = 0;
		windowElem.style.display = oldDisplay;
	});
}

/** @param {number} i */
export function getCircleClassName(i) {
	let cl = "circle";
	if (state.curmoves[i].eval != null && state.curmoves[0].eval != null) {
		const etop = Math.max(-6, Math.min(6, state.curmoves[0].eval / 100));
		const ecur = Math.max(-6, Math.min(6, state.curmoves[i].eval / 100));
		const lost = Math.abs(etop - ecur);
		if (lost <= 1.0) cl += " ok";
		else if (lost <= 3.0) cl += " mi";
		else cl += " bl";
	}
	return cl;
}
