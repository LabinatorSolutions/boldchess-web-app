/**
 * Builds the per-term breakdown shown in the Static Evaluation window.
 *
 * Each term is evaluated for both colours in the middle game and the end game,
 * then run through the main evaluation so its contribution is expressed in the
 * same units as the final score. Results are cached by FEN because the
 * breakdown is recomputed on every repaint.
 */

import { colorflip, generateFEN } from "../chess/fen.js";
import { compileTerm, terms } from "./terms.js";
import { STATIC_EVAL_TERMS } from "./terms-data.js";

const CACHE_SIZE = 20;
const cache = [];

export function getStaticEvalList(pos) {
	const posfen = generateFEN(pos);
	for (let si = 0; si < cache.length; si++)
		if (cache[si][0] === posfen) return cache[si][1];

	const data = STATIC_EVAL_TERMS;
	let grouplist = [],
		midindex = null,
		endindex = null,
		maincode = null;
	for (let i = 0; i < data.length; i++) {
		if (data[i].name === "Middle game evaluation") midindex = i;
		if (data[i].name === "End game evaluation") endindex = i;
		if (data[i].name === "Main evaluation") maincode = data[i].code;
	}
	if (midindex == null || endindex == null || maincode == null) return;
	for (let i = 0; i < data.length; i++) {
		const n = data[i].name.toLowerCase().replace(/ /g, "_");
		while (
			i !== midindex &&
			i !== endindex &&
			maincode.indexOf(`$${n}(`) >= 0
		) {
			try {
				maincode = maincode.replace(
					`$${n}(`,
					`(function(){return ${terms[n](pos)};})(`,
				);
			} catch (e) {
				alert(e.message);
				return [];
			}
		}
		if (
			data[midindex].code.indexOf(`$${n}(`) < 0 &&
			data[endindex].code.indexOf(`$${n}(`) < 0
		)
			continue;
		let code = data[i].code,
			list = [];
		for (let j = 0; j < data.length; j++) {
			if (!data[j].graph || data[j].group !== data[i].group || i === j)
				continue;
			const n2 = data[j].name.toLowerCase().replace(/ /g, "_");
			code = code
				.replace(`$${n2}(`, `$g-${n2}(`)
				.replace(`$${n2}(`, `$g-${n2}(`);
			list.push(n2);
		}
		if (data[i].graph) list.push(n);
		for (let j = 0; j < list.length; j++) {
			const n2 = list[j];
			if (code.indexOf(`$g-${n2}(`) < 0 && !data[i].graph) continue;
			let mw = 0,
				mb = 0,
				ew = 0,
				eb = 0,
				func = null;
			try {
				func = compileTerm(
					code
						.replace(`$g-${n2}(`, `$${n2}(`)
						.replace(`$g-${n2}(`, `$${n2}(`)
						.replace(/\$g-[a-z_]+\(/g, "zero("),
					pos,
				);
				if (data[midindex].code.indexOf(`$${n}(pos`) >= 0) mw = func(pos);
				if (data[midindex].code.indexOf(`$${n}(colorflip(pos)`) >= 0)
					mb = func(colorflip(pos));
				if (data[endindex].code.indexOf(`$${n}(pos`) >= 0) ew = func(pos);
				if (data[endindex].code.indexOf(`$${n}(colorflip(pos)`) >= 0)
					eb = func(colorflip(pos));
			} catch (e) {
				alert(e.message);
				return [];
			}
			const evals = [mw - mb, ew - eb];
			const index = grouplist.map((e) => e.elem).indexOf(n2);
			if (index < 0) {
				grouplist.push({
					group: data[i].group,
					elem: n2,
					item: evals,
					hidden: false,
					mc: pos.m[1],
				});
			} else {
				grouplist[index].item[0] += evals[0];
				grouplist[index].item[1] += evals[1];
			}
		}
	}
	grouplist.sort((a, b) =>
		a.group > b.group ? 1 : b.group > a.group ? -1 : 0,
	);
	maincode = maincode
		.replace("function $$(pos)", "function $$(PMG,PEG)")
		.replace("$middle_game_evaluation(pos)", "PMG")
		.replace("$end_game_evaluation(pos)", "PEG");
	const mainfunc = compileTerm(maincode, pos);
	for (let i = 0; i < grouplist.length; i++) {
		grouplist[i].item.push(
			mainfunc(grouplist[i].item[0], grouplist[i].item[1]) - mainfunc(0, 0),
		);
	}
	grouplist.push({
		group: "Tempo",
		elem: "tempo",
		item: [mainfunc(0, 0), mainfunc(0, 0), mainfunc(0, 0)],
		hidden: false,
		mc: pos.m[1],
	});

	cache.push([posfen, grouplist]);
	if (cache.length > CACHE_SIZE) cache.shift();
	return grouplist;
}
