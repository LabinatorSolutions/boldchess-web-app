/** The evaluation graph canvas. */

import { parseFEN } from "../chess/fen.js";
import { historyMove } from "../game/history.js";
import { state } from "../state.js";
import { repaintLastMoveArrow } from "./arrows.js";
import { getEvalText } from "./dom.js";
import { updateTooltip, updateTooltipPos } from "./tooltip.js";

export function getGraphPointData(i) {
	let e = null,
		black = false;
	if (state.analysisEngine == null || state.analysisEngine.depth === 0)
		return 0;
	if (
		i >= 0 &&
		i < state.history.length &&
		state.history[i].length >= 2 &&
		state.history[i][1] != null &&
		state.history[i][1].score != null
	) {
		black = state.history[i][1].black;
		e = state.history[i][1].score / 100;
		if (black) e = -e;
		if ((e || 0) > 10) e = 10;
		else if ((e || 0) < -10) e = -10;
	}
	return e;
}

export function getGraphPointColor(i) {
	const e = getGraphPointData(i),
		laste = getGraphPointData(i - 1);
	const black =
		i >= 0 &&
		i < state.history.length &&
		state.history[i].length >= 2 &&
		state.history[i][1] != null &&
		state.history[i][1].score != null &&
		state.history[i][1].black;
	const lost = laste == null || e == null ? 0 : black ? laste - e : e - laste;
	return lost <= 1.0 ? "#008800" : lost <= 3.0 ? "#bb8800" : "#bb0000";
}

export function showGraphTooltip(i, event) {
	if (
		i >= 0 &&
		i < state.history.length &&
		state.history[i] != null &&
		state.history[i].length > 3 &&
		state.history[i][3] != null
	) {
		const pos = parseFEN(state.history[i][0]);
		let evalText = state.history[i][3];
		if (state.history[i][1] != null && state.history[i][1].score != null) {
			let e = state.history[i][1].score;
			if (state.history[i][1].black) e = -e;
			evalText += ` ${getEvalText(e, true)}`;
		}
		updateTooltip(
			evalText,
			null,
			pos.w ? `${pos.m[1] - 1}...` : `${pos.m[1]}.`,
			null,
			event,
		);
	} else updateTooltip("");
}

export function repaintGraph(event) {
	requestAnimationFrame(() => {
		const data = [];
		const color = [];
		for (let i = 0; i < state.history.length; i++) {
			data.push(getGraphPointData(i));
			color.push(getGraphPointColor(i));
		}

		const border1 = 4.5,
			border2 = 18.5;
		let xMax = 40,
			yMax = 2,
			xStep = 10,
			yStep = 1;

		for (let i = 0; i < data.length; i++) {
			if (Math.ceil(Math.abs(data[i])) > yMax)
				yMax = Math.ceil(Math.abs(data[i]));
		}
		if (data.length > xMax) xMax = data.length;

		const cw = document.getElementById("graphWrapper").clientWidth;
		const ch = document.getElementById("graphWrapper").clientHeight;
		let mouseDataPos = null;

		if (event != null) {
			const rect = document.getElementById("graph").getBoundingClientRect();
			const mx = event.clientX - rect.left;
			const my = event.clientY - rect.top;
			const b1 = border1 / state.bodyScale,
				b2 = border2 / state.bodyScale;
			const mUnit = (rect.width - b1 - b2) / xMax;
			if (
				mx > b2 + mUnit / 2 &&
				mx < rect.width - b1 + mUnit / 2 &&
				my > b1 &&
				my < rect.height - b2
			) {
				mouseDataPos = Math.round((mx - b2) / mUnit) - 1;
			}
			if (mouseDataPos === state.lastMouseDataPos) return;
			state.lastMouseDataPos = mouseDataPos;
		} else {
			state.lastMouseDataPos = mouseDataPos;
		}

		const canvas = document.getElementById("graph");
		const ctx = canvas.getContext("2d");
		canvas.width = cw;
		canvas.height = ch;
		const yTotal = canvas.height - border1 - border2,
			xTotal = canvas.width - border1 - border2;
		let xUnit = xTotal / (xMax / xStep),
			yUnit = yTotal / ((yMax * 2) / yStep);

		if (yUnit > 0) {
			while (yUnit < 12) {
				yUnit *= 2;
				yStep *= 2;
			}
		}
		if (xUnit > 0) {
			while (xUnit < 18) {
				xUnit *= 2;
				xStep *= 2;
			}
		}

		ctx.font = "10px Segoe UI";
		ctx.textAlign = "right";
		ctx.textBaseline = "middle";
		ctx.lineWidth = 1;
		ctx.fillStyle = "#a0aab4";
		ctx.fillText("0", border2 - 6, border1 + yTotal / 2);
		ctx.beginPath();
		ctx.strokeStyle = "#738191";
		for (let i = yStep; i <= yMax; i += yStep) {
			if (i === 0) continue;
			const y = Math.round((i * yUnit) / yStep);
			ctx.fillText(`+${i}`, border2 - 6, border1 + yTotal / 2 - y);
			ctx.fillText(`-${i}`, border2 - 6, border1 + yTotal / 2 + y);
			if (i < yMax) {
				ctx.moveTo(border2, border1 + yTotal / 2 - y);
				ctx.lineTo(border2 + xTotal, border1 + yTotal / 2 - y);
				ctx.moveTo(border2, border1 + yTotal / 2 + y);
				ctx.lineTo(border2 + xTotal, border1 + yTotal / 2 + y);
			}
		}
		ctx.moveTo(border2, border1);
		ctx.lineTo(border2 + xTotal, border1);
		ctx.stroke();
		ctx.beginPath();

		ctx.textAlign = "center";
		ctx.strokeStyle = "#a0aab4";
		for (let i = 0; i <= xMax; i += xStep) {
			const x = Math.round((i * xUnit) / xStep);
			ctx.fillText(i / 2, border2 + x, border1 + yTotal + border2 / 2 + 2);
			ctx.moveTo(border2 + x, border1 + yTotal);
			ctx.lineTo(border2 + x, border1 + yTotal + 3);
		}
		for (let i = 0; i <= yMax; i += yStep) {
			const y = Math.round((i * yUnit) / yStep);
			ctx.moveTo(border2 - 3, border1 + yTotal / 2 - y);
			ctx.lineTo(border2, border1 + yTotal / 2 - y);
			ctx.moveTo(border2 - 3, border1 + yTotal / 2 + y);
			ctx.lineTo(border2, border1 + yTotal / 2 + y);
		}

		ctx.stroke();

		ctx.beginPath();
		ctx.moveTo(border2, border1);
		ctx.lineTo(border2, border1 + yTotal);
		ctx.moveTo(border2, border1 + yTotal);
		ctx.lineTo(border2 + xTotal, border1 + yTotal);
		ctx.moveTo(border2, border1 + yTotal / 2);
		ctx.lineTo(border2 + xTotal, border1 + yTotal / 2);
		ctx.stroke();

		for (let i = 1; i < data.length; i++) {
			if (data[i] != null && data[i - 1] != null) {
				ctx.beginPath();
				ctx.strokeStyle =
					color[i] === "#bb0000"
						? "red"
						: color[i] === "#008800"
							? "black"
							: "white";
				ctx.lineWidth = 1;
				ctx.moveTo(
					border2 + i * (xUnit / xStep),
					border1 + yTotal / 2 - data[i - 1] * (yUnit / yStep),
				);
				ctx.lineTo(
					border2 + (i + 1) * (xUnit / xStep),
					border1 + yTotal / 2 - data[i] * (yUnit / yStep),
				);
				ctx.stroke();
			}
		}

		for (let i = 0; i < data.length; i++) {
			if (i !== mouseDataPos && i !== state.historyindex) {
				ctx.beginPath();
				ctx.arc(
					border2 + (i + 1) * (xUnit / xStep),
					border1 + yTotal / 2 - data[i] * (yUnit / yStep),
					2,
					0,
					2 * Math.PI,
					false,
				);
				ctx.fillStyle = "black";
				ctx.fill();
			}
		}

		let i = state.historyindex;
		ctx.beginPath();
		ctx.arc(
			border2 + (i + 1) * (xUnit / xStep),
			border1 + yTotal / 2 - data[i] * (yUnit / yStep),
			4,
			0,
			2 * Math.PI,
			false,
		);
		ctx.fillStyle = "black";
		ctx.fill();
		ctx.beginPath();
		ctx.arc(
			border2 + (i + 1) * (xUnit / xStep),
			border1 + yTotal / 2 - data[i] * (yUnit / yStep),
			2,
			0,
			2 * Math.PI,
			false,
		);
		ctx.fillStyle = "#e1e2e6";
		ctx.fill();

		i = mouseDataPos;
		ctx.beginPath();
		ctx.arc(
			border2 + (i + 1) * (xUnit / xStep),
			border1 + yTotal / 2 - data[i] * (yUnit / yStep),
			4,
			0,
			2 * Math.PI,
			false,
		);
		ctx.fillStyle = "black";
		ctx.fill();
		ctx.beginPath();
		ctx.arc(
			border2 + (i + 1) * (xUnit / xStep),
			border1 + yTotal / 2 - data[i] * (yUnit / yStep),
			2,
			0,
			2 * Math.PI,
			false,
		);
		ctx.fillStyle = "#64c4db";
		ctx.fill();

		if (event) showGraphTooltip(mouseDataPos, event);
		repaintLastMoveArrow();
	});
}

export function graphMouseMove(event) {
	repaintGraph(event);
	if (state.tooltipState) updateTooltipPos(event);
}

export function graphMouseDown() {
	if (state.lastMouseDataPos != null) {
		const i = state.lastMouseDataPos;
		if (i < state.history.length && i >= 0 && i !== state.historyindex) {
			historyMove(i - state.historyindex);
		}
	}
}
