/** Small DOM helpers shared by the panels. */

import { isMobile } from "../env.js";
import { state } from "../state.js";

export function setElemText(elem, value) {
	while (elem.firstChild) elem.removeChild(elem.firstChild);
	elem.appendChild(document.createTextNode(value));
}

export function getElemText(elem) {
	return elem.textContent;
}

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

export function getClientY(e) {
	if (!isMobile) return e.clientY;
	const scrollOffset =
		(window.pageYOffset || document.documentElement.scrollTop) -
		(document.documentElement.clientTop || 0);
	return (e.clientY + scrollOffset) * state.bodyScale;
}

export function getCurScale() {
	if (document.getElementById("wChessboard").style.display === "none") return 1;
	return Math.min(
		(document.getElementById("wChessboard").clientWidth - 414 + 408) / 408,
		(document.getElementById("wChessboard").clientHeight +
			(isMobile ? 30 : 0) -
			437 +
			368) /
			368,
	);
}

export function scrollReset(winId) {
	requestAnimationFrame(() => {
		const windowElem = document.getElementById(`w${winId}`);
		const scrollElem = document.getElementById(winId.toLowerCase());
		const oldDisplay = windowElem.style.display;
		windowElem.style.display = "";
		scrollElem.scrollTop = 0;
		windowElem.style.display = oldDisplay;
	});
}

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
