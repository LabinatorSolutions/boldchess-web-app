/** The Static Evaluation panel. */

import { board, colorflip, parseFEN } from "../chess/fen.js";
import { getStaticEvalList } from "../eval/static-eval-list.js";
import { terms } from "../eval/terms.js";
import { STATIC_EVAL_TERMS } from "../eval/terms-data.js";
import { getCurFEN } from "../game/position.js";
import { state } from "../state.js";
import { finalArrow3, showArrow3 } from "./arrows.js";
import { setElemText } from "./dom.js";

export function repaintStatic() {
	if (document.getElementById("wStatic").style.display === "none") return;

	const curfen = getCurFEN();
	const pos = parseFEN(curfen);

	// Static evaluation window
	requestAnimationFrame(() => {
		if (getCurFEN() !== curfen) return;

		const elem = document.getElementById("static");
		const evalUnit = 213;
		while (elem.firstChild) elem.removeChild(elem.firstChild);
		const staticEvalListLast =
			state.historyindex > 0
				? getStaticEvalList(parseFEN(state.history[state.historyindex - 1].fen))
				: null;
		let staticEvalList = getStaticEvalList(pos),
			total = 0,
			ci = 5;

		for (let i = 0; i < staticEvalList.length; i++) {
			if (i > 0 && staticEvalList[i - 1].group !== staticEvalList[i].group)
				ci++;
			let c1 = 0,
				c2 = 0,
				c3 = 0;
			while (c1 + c2 + c3 === 0) {
				c1 = 22 + (ci % 2) * 216;
				c2 = 22 + (((ci / 2) << 0) % 3) * 108;
				c3 = 22 + (((ci / 6) << 0) % 2) * 216;
				if (c1 + c2 + c3 < 100) {
					c1 = c2 = c3 = 0;
					ci++;
				}
			}
			staticEvalList[i].bgcol = `rgb(${c1},${c2},${c3})`;
			staticEvalList[i].rel =
				staticEvalList[i].item[2] -
				(staticEvalListLast == null ? 0 : staticEvalListLast[i].item[2]);
		}

		const sortArray = [];
		for (let i = 0; i < staticEvalList.length; i++) {
			sortArray.push({
				value: state.staticSortByChange
					? staticEvalList[i].rel
					: staticEvalList[i].item[2],
				index: i,
			});
		}

		sortArray.sort((a, b) =>
			Math.abs(a.value) < Math.abs(b.value)
				? 1
				: Math.abs(a.value) > Math.abs(b.value)
					? -1
					: 0,
		);

		const fragment = document.createDocumentFragment();

		for (let j = 0; j < sortArray.length; j++) {
			const i = sortArray[j].index;
			total += staticEvalList[i].item[2];
			let text = (staticEvalList[i].item[2] / evalUnit).toFixed(2);
			if (text === "-0.00") text = "0.00";
			let rel = (staticEvalList[i].rel / evalUnit).toFixed(2);
			if (rel === "-0.00") rel = "0.00";
			if (!state.staticSortByChange && text === "0.00") continue;
			if (state.staticSortByChange && rel === "0.00") continue;

			const node0 = document.createElement("SPAN");
			node0.className = "circle";
			node0.style.backgroundColor = staticEvalList[i].bgcol;

			const node1 = document.createElement("DIV");
			node1.className = "line";
			const node2 = document.createElement("SPAN");
			node2.className = "group";
			node2.appendChild(document.createTextNode(staticEvalList[i].group));
			const node6 = document.createElement("SPAN");
			node6.className = "name";
			node6.appendChild(
				document.createTextNode(
					staticEvalList[i].elem[0].toUpperCase() +
						staticEvalList[i].elem.replace(/_/g, " ").substring(1),
				),
			);

			const node3 = document.createElement("SPAN");
			node3.className = "eval";
			if (text.indexOf(".") >= 0) {
				const node4 = document.createElement("SPAN");
				node4.className = "numleft";
				node4.appendChild(
					document.createTextNode(text.substring(0, text.indexOf(".") + 1)),
				);
				const node5 = document.createElement("SPAN");
				node5.className = "numright";
				node5.appendChild(
					document.createTextNode(text.substring(text.indexOf(".") + 1)),
				);
				node3.appendChild(node4);
				node3.appendChild(node5);
			} else {
				node3.appendChild(document.createTextNode(text));
			}

			const node7 = document.createElement("SPAN");
			node7.className = "eval rel";
			if (rel.indexOf(".") >= 0) {
				const node8 = document.createElement("SPAN");
				node8.className = "numleft";
				node8.appendChild(
					document.createTextNode(rel.substring(0, rel.indexOf(".") + 1)),
				);
				const node9 = document.createElement("SPAN");
				node9.className = "numright";
				node9.appendChild(
					document.createTextNode(rel.substring(rel.indexOf(".") + 1)),
				);
				node7.appendChild(node8);
				node7.appendChild(node9);
			} else {
				node7.appendChild(document.createTextNode(rel));
			}
			node1.appendChild(node0);
			node1.appendChild(node2);
			node1.appendChild(node6);
			node1.appendChild(node3);
			node1.appendChild(node7);
			node1.name = staticEvalList[i].elem.toLowerCase().replace(/ /g, "_");
			node1.onclick = function () {
				let data = STATIC_EVAL_TERMS,
					sei = null;
				for (let j = 0; j < data.length; j++) {
					const n = data[j].name.toLowerCase().replace(/ /g, "_");
					if (n === this.name) sei = data[j];
				}
				if (sei == null) return;
				const n2 = this.name.toLowerCase().replace(/ /g, "_");
				const func = terms[n2] != null ? terms[n2] : null;
				const elem = document.getElementById("chessboard1");
				for (let i = 0; i < elem.children.length; i++) {
					const div = elem.children[i];
					if (div.tagName !== "DIV" || div.style.zIndex > 0) continue;
					let x = parseInt(div.style.left.replace("px", ""), 10) / 40;
					let y = parseInt(div.style.top.replace("px", ""), 10) / 40;
					if (state.flip) {
						x = 7 - x;
						y = 7 - y;
					}
					let sqeval = 0;
					if (n2 === "king_danger") {
						sqeval = terms.unsafe_checks(pos, { x: x, y: y });
						if (sqeval === 0)
							sqeval = terms.unsafe_checks(colorflip(pos), { x: x, y: 7 - y });
						if (sqeval === 0) sqeval = terms.weak_bonus(pos, { x: x, y: y });
						if (sqeval === 0)
							sqeval = terms.weak_bonus(colorflip(pos), { x: x, y: 7 - y });
						const showKDarrows = (p, flipy) => {
							for (let x2 = 0; x2 < 8; x2++)
								for (let y2 = 0; y2 < 8; y2++) {
									if ("PNBRQ".indexOf(board(p, x, y)) < 0) continue;
									let s = { x: x, y: y },
										s2 = { x: x2, y: y2 },
										a = false;
									if (terms.king_ring(p, s2)) {
										// The pawn-direction ternary needs its own parens: without them
										// `?:` (lowest precedence) swallowed the whole `||` chain, so both
										// branches were truthy constants (1 / -1) and this `if` was always
										// taken. `flipy` is a boolean, so the pawn's rank delta compares
										// against the direction it selects, not against `flipy` itself.
										if (
											(terms.pawn_attack(p, s2) &&
												Math.abs(x - x2) === 1 &&
												y - y2 === (flipy ? 1 : -1)) ||
											terms.knight_attack(p, s2, s) ||
											terms.bishop_xray_attack(p, s2, s) ||
											terms.rook_xray_attack(p, s2, s) ||
											terms.queen_attack(p, s2, s)
										)
											a = true;
									}
									if (
										!a &&
										terms.knight_attack(p, s2, s) &&
										terms.safe_check(p, s2, 0) > 0
									)
										a = true;
									if (
										!a &&
										terms.bishop_xray_attack(p, s2, s) &&
										terms.safe_check(p, s2, 1) > 0
									)
										a = true;
									if (
										!a &&
										terms.rook_xray_attack(p, s2, s) &&
										terms.safe_check(p, s2, 2) > 0
									)
										a = true;
									if (
										!a &&
										terms.queen_attack(p, s2, s) &&
										terms.safe_check(p, s2, 3) > 0
									)
										a = true;
									if (a) {
										if (!flipy) showArrow3({ from: s, to: s2 });
										else
											showArrow3({
												from: { x: x, y: 7 - y },
												to: { x: x2, y: 7 - y2 },
											});
										finalArrow3();
									}
								}
						};
						showKDarrows(pos, false);
						showKDarrows(colorflip(pos), true);
					} else {
						try {
							sqeval = func(pos, { x: x, y: y });
							if (sqeval === 0 && sei.forwhite)
								sqeval = func(colorflip(pos), { x: x, y: 7 - y });
							if (sqeval === 0) sqeval = func(pos, { x: x, y: y }, true);
							if (sqeval === 0 && sei.forwhite)
								sqeval = func(colorflip(pos), { x: x, y: 7 - y }, true);
						} catch {
							/* term threw for this square; leave sqeval at 0 */
						}
					}
					let c = `${div.className.split(" ")[0]} ${div.className.split(" ")[1]}`;
					if (div.className.indexOf(" h2") >= 0) c += " h2";
					if (sqeval !== 0) c += " h3";
					div.className = c;
				}
			};
			fragment.appendChild(node1);
		}

		elem.appendChild(fragment);
		setElemText(
			document.getElementById("staticInfo"),
			`Static evaluation (${(total / evalUnit).toFixed(2)})`,
		);
	});
}
