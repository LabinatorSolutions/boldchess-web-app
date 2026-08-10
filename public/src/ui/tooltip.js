/** The floating tooltip that follows the pointer. */

import { state } from "../state.js";
import { setArrow, showArrow1 } from "./arrows.js";
import { getClientY, setElemText } from "./dom.js";

export function updateTooltipPos(e) {
	const tooltip = document.getElementById("tooltip");
	tooltip.style.left = `${e.clientX * state.bodyScale}px`;
	tooltip.style.top = `${getClientY(e) + 20}px`;
}

export function updateTooltip(text, answerpv, movenumber, cl, e) {
	const hasText = text.length > 0;
	const tooltip = document.getElementById("tooltip");

	requestAnimationFrame(() => {
		while (tooltip.firstChild) tooltip.removeChild(tooltip.firstChild);

		const span1 = document.createElement("span");
		setElemText(span1, hasText ? text : "");

		if (movenumber != null) {
			const span2 = document.createElement("span");
			span2.style.color = "#64c4db";
			setElemText(span2, `${movenumber} `);
			tooltip.appendChild(span2);
		}

		if (cl != null && cl !== "circle") {
			const span3 = document.createElement("span");
			span3.className = cl;
			tooltip.appendChild(span3);
			span1.style.paddingLeft = "12px";
		}

		tooltip.appendChild(span1);

		state.tooltipState = hasText;
		tooltip.style.display = hasText ? "" : "none";
		if (e != null) updateTooltipPos(e);

		if (
			answerpv != null &&
			answerpv.length > 0 &&
			(answerpv[0].length === 4 || answerpv[0].length === 5)
		) {
			for (
				let i = 0;
				i < Math.min(answerpv.length, state.movesPv ? 5 : 1);
				i++
			) {
				const move = {
					from: {
						x: "abcdefgh".indexOf(answerpv[i][0]),
						y: "87654321".indexOf(answerpv[i][1]),
					},
					to: {
						x: "abcdefgh".indexOf(answerpv[i][2]),
						y: "87654321".indexOf(answerpv[i][3]),
					},
				};
				showArrow1(move, 1 - i / 5);
			}
		} else {
			setArrow(state.arrow);
		}
	});
}
