/** The command box: FEN/PGN loading and the text commands behind it. */

import { colorflip, generateFEN, parseFEN } from "./chess/fen.js";
import { parseMove, sanMove } from "./chess/notation.js";
import { doMove, genMoves } from "./chess/rules.js";
import { DEFAULT_DEPTH, MAX_DEPTH, START } from "./config.js";
import { isMobile } from "./env.js";
import { historyAdd, historyKeep, historyMove } from "./game/history.js";
import { getCurFEN, setCurFEN } from "./game/position.js";
import { onKeyDown } from "./input/keyboard.js";
import { doMoveHandler } from "./input/mouse.js";
import { state } from "./state.js";
import { doFlip, refreshButtonRevert, showBoard } from "./ui/board.js";
import { setBoardColor } from "./ui/menu.js";
import { showHideWindow } from "./ui/panels.js";

export function command(text) {
	if (text == null || text.length === 0) return;
	const mvdivs = [
		'<div class="moves">',
		'<div class="tview2 tview2-column">',
		'<div class="extension-item Moves">',
	];
	for (let i = 0; i < mvdivs.length; i++) {
		if (text.indexOf(mvdivs[i]) >= 0) {
			let text2 = text,
				ntext = "";
			text2 = text2.replace(
				/<span class="user_link[^>]*>([^<]*)<\/span>/g,
				'<a class="user_link">$1</a>',
			);
			let nmt = '<a class="user_link';
			if (text2.indexOf(nmt) > 0) {
				text2 = text2.substr(text2.indexOf(nmt) + nmt.length);
				text2 = text2.substr(text2.indexOf(">") + 1);
				ntext +=
					'[White "' +
					text2
						.substr(0, text2.indexOf("</a>"))
						.replace(/<span[^>]*>[^<]*<\/span>/g, "")
						.replace(/&nbsp;/g, " ")
						.trim() +
					'"]\n';
				text2 = text2.substr(text2.indexOf("</a>") + 4);
			}
			if (text2.indexOf(nmt) > 0) {
				text2 = text2.substr(text2.indexOf(nmt) + nmt.length);
				text2 = text2.substr(text2.indexOf(">") + 1);
				ntext +=
					'[Black "' +
					text2
						.substr(0, text2.indexOf("</a>"))
						.replace(/<span[^>]*>[^<]*<\/span>/g, "")
						.replace(/&nbsp;/g, " ")
						.trim() +
					'"]\n';
				text2 = text2.substr(text2.indexOf("</a>") + 4);
			}
			text2 = text;
			nmt = '<div class="playerInfo';
			for (let j = 0; j < 2; j++)
				if (text2.indexOf(nmt) > 0) {
					text2 = text2.substr(text2.indexOf(nmt));
					const black = text2.indexOf("black") < text2.indexOf(">");
					text2 = text2.substr(nmt.length);
					const h = '<h2 class="name">';
					const nm =
						"[" +
						(black ? "Black" : "White") +
						' "' +
						text2
							.substring(text2.indexOf(h) + h.length, text2.indexOf("</h2>"))
							.trim() +
						'"]\n';
					if (j === 1 && !black) ntext = nm + ntext;
					else ntext += nm;
				}
			text = text.substring(text.indexOf(mvdivs[i]));
			if (i === 2)
				text = text.replace(
					/<div class='notationTableInlineElement((?!<\/div>).)*<\/div>/g,
					"",
				);
			text = text.substring(mvdivs[i].length, text.indexOf("</div>"));
			if (i === 2) {
				text = text
					.replace(
						/<dt>\s*(<span[^>]*>)?\s*([^<\s]*)\s*(<\/span>)?\s*<\/dt>/g,
						"<index>$2</index>",
					)
					.replace(
						/<span class='move'>\s*([^<\s]*)\s*<\/span>/g,
						"<move>$1</move>",
					);
			} else {
				text = text
					.replace(/<interrupt>((?!<\/interrupt>).)*<\/interrupt>/g, "")
					.replace(/<(move|m1|m2)[^<>']*(('[^']*')[^<>']*)*>/g, "<move>")
					.replace(/<\/(m1|m2)>/g, "</move>")
					.replace(
						/<\/?san>|<eval>[^<]*<\/eval>|<glyph[^<]*<\/glyph>|<move>\.\.\.<\/move>/g,
						"",
					)
					.replace(/\?/g, "x");
			}
			text =
				ntext +
				text
					.replace(/{|}/g, "")
					.replace(/(<index[^>]*>)/g, "{")
					.replace(/<\/index>/g, ".}")
					.replace(/<move>/g, "{")
					.replace(/<\/move>/g, " }")
					.replace(/(^|})[^{]*($|{)/g, "");
		}
	}
	if (text.split("/").length === 8 && text.split(".").length === 1) {
		const pos = parseFEN(text);
		setCurFEN(generateFEN(pos));
		state.history = [[getCurFEN()]];
		state.historyindex = 0;
		historyMove(0);
	} else if (text.split(".").length > 1) {
		let whitename = null,
			blackname = null;
		const wi = text.indexOf("[White '"),
			bi = text.indexOf("[Black '");
		if (wi >= 0 && bi > wi) {
			const wil = text.substr(wi + 8).indexOf("']"),
				bil = text.substr(bi + 8).indexOf("']");
			if (wil > 0 && wil < 128) whitename = text.substr(wi + 8, wil);
			if (bil > 0 && bil < 128) blackname = text.substr(bi + 8, bil);
		}

		text = text.replace(/\u2605/g, "").replace(/\u0445/g, "x");
		text =
			" " +
			text
				.replace(/\./g, " ")
				.replace(/(\[FEN [^\]]+\])+?/g, (_match, $1) =>
					$1.replace(/\[|\]|'/g, "").replace(/\s/g, "."),
				);
		text = text
			.replace(/\[Event /g, "* [Event ")
			.replace(/\s(\[[^\]]+\])+?/g, "")
			.replace(/(\{[^}]+\})+?/g, "");
		const r = /(\([^()]+\))+?/g;
		while (r.test(text)) text = text.replace(r, "");
		text = text
			.replace(/0-0-0/g, "O-O-O")
			.replace(/0-0/g, "O-O")
			.replace(/(1-0|0-1|1\/2-1\/2)/g, " * ")
			.replace(/\s\d+/g, " ")
			.replace(/\$\d+/g, "")
			.replace(/\?/g, "");
		const moves = text
			.replace(/\s/g, " ")
			.replace(/ +/g, " ")
			.trim()
			.split(" ");
		let pos = parseFEN(START);
		const oldhistory = JSON.parse(JSON.stringify(state.history));
		state.history = [[START]];
		state.historyindex = 0;
		let gm = 0;
		for (let i = 0; i < moves.length; i++) {
			if (moves[i].length === 0) continue;
			if ("*".indexOf(moves[i][0]) === 0) {
				if (i < moves.length - 1) {
					pos = parseFEN(START);
					// Add only the new position without move and SAN
					historyAdd(generateFEN(pos), oldhistory, null, null);
					gm++;
				}
				continue;
			} else if (moves[i].indexOf("FEN.") === 0) {
				pos = parseFEN(moves[i].substring(4).replace(/\./g, " "));
				if (state.history[state.historyindex][0] === START)
					state.historyindex--;
				// Add only the new position without move and SAN
				historyAdd(generateFEN(pos), oldhistory, null, null);
				continue;
			}
			if (moves[i] === "--") {
				pos.w = !pos.w;
				// Add only the new position without move and SAN
				historyAdd(generateFEN(pos), oldhistory, null, null);
				continue;
			}
			const move = parseMove(pos, moves[i]);
			if (move == null) {
				alert(`Incorrect move: ${moves[i]} ${gm}`);
				break;
			}
			const san = sanMove(pos, move, genMoves(pos));
			pos = doMove(pos, move.from, move.to, move.p);
			// Add the new position with move and SAN notation
			historyAdd(generateFEN(pos), oldhistory, move, san);
		}
		setCurFEN(generateFEN(pos));
		historyKeep(whitename, blackname);
	} else if (text.toLowerCase() === "reset") {
		setCurFEN(START);
		state.history = [[getCurFEN()]];
		state.historyindex = 0;
		historyKeep();
		state.history2 = null;
	} else if (text.toLowerCase() === "clear") {
		setCurFEN("8/8/8/8/8/8/8/8 w - - 0 0");
		showBoard();
	} else if (text.toLowerCase() === "colorflip") {
		setCurFEN(generateFEN(colorflip(parseFEN(getCurFEN()))));
		showBoard();
	} else if (text.toLowerCase() === "sidetomove") {
		setCurFEN(
			getCurFEN()
				.replace(" w ", " ! ")
				.replace(" b ", " w ")
				.replace(" ! ", " b "),
		);
		showBoard();
	} else if (text.toLowerCase().indexOf("depth ") === 0) {
		if (state.analysisEngine?.ready) {
			state.analysisEngine.depth = Math.min(
				MAX_DEPTH,
				Math.max(0, parseInt(text.toLowerCase().replace("depth ", ""), 10)),
			);
			if (Number.isNaN(state.analysisEngine.depth))
				state.analysisEngine.depth = DEFAULT_DEPTH;
		}
		showBoard();
	} else if (text.toLowerCase() === "flip") {
		doFlip();
	} else if (text.toLowerCase() === "window") {
		let encoded = "";
		if (state.history[0][0] === START) {
			let gi = "";
			for (let i = 1; i < state.history.length; i++) {
				const pos = parseFEN(state.history[i - 1][0]);
				const moves = genMoves(pos);
				let mindex = -1;
				for (let j = 0; j < moves.length; j++) {
					const move = moves[j];
					const pos2 = doMove(pos, move.from, move.to, move.p);
					if (generateFEN(pos2) === state.history[i][0]) mindex = j;
				}
				if (mindex < 0) {
					gi = "";
					break;
				}
				let symbols = (moves.length + 1).toString(2).length,
					v = "";
				for (let j = 0; j < symbols; j++) v += "0";
				let n = (mindex + 1).toString(2);
				n = v.substr(n.length) + n;
				gi += n;
				if (i === state.history.length - 1) gi += v;
			}
			let cur = "";
			for (let i = 0; i < gi.length; i++) {
				cur += gi[i];
				if (i === gi.length - 1) while (cur.length < 6) cur += "0";
				if (cur.length === 6) {
					encoded +=
						"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"[
							parseInt(cur, 2)
						];
					cur = "";
				}
			}
		}
		const wb = document.getElementById("wb").children;
		const lparams = [];
		for (let i = 0; i < wb.length; i++) {
			if (wb[i].tagName !== "DIV") continue;
			const winId = wb[i].id.substring(2);
			const elem = document.getElementById(`w${winId}`);
			if (elem.style.display === "none") continue;
			if (elem.style.position === "absolute" && !isMobile) {
				lparams.push(
					(
						winId[0] +
						elem.style.width +
						"," +
						elem.style.height +
						"," +
						elem.style.left +
						"," +
						elem.style.top
					).replace(/px/g, ""),
				);
			} else if (
				(elem.style.width !== elem.originalWidth ||
					elem.style.height !== elem.originalHeight) &&
				!isMobile
			) {
				lparams.push(
					`${winId[0] + elem.style.width},${elem.style.height}`.replace(
						/(\.[0-9]+)?px/g,
						"",
					),
				);
			} else lparams.push(winId[0]);
		}
		const lparamsstr = lparams.join(" ").toLowerCase();
		let url = [location.protocol, "//", location.host, location.pathname].join(
			"",
		);
		const params = [];
		if (state.boardColor > 0) params.push(`col${state.boardColor}`);
		if (
			state.analysisEngine?.ready &&
			state.analysisEngine.depth !== DEFAULT_DEPTH
		)
			params.push(`depth ${state.analysisEngine.depth}`);
		if (lparamsstr !== "c m h g")
			params.push(`layout ${lparamsstr.length === 0 ? "-" : lparamsstr}`);
		if (encoded.length > 0) params.push(`~${encoded}`);
		else if (getCurFEN() !== START) params.push(getCurFEN());
		for (let i = 0; i < params.length; i++) {
			url +=
				(i === 0 ? "?" : "&") +
				String.fromCharCode("a".charCodeAt(0) + i) +
				"=" +
				params[i];
		}
		window.open(url, "_blank");
	} else if (text[0] === "~") {
		let pos = parseFEN(START);
		const oldhistory = JSON.parse(JSON.stringify(state.history));
		state.history = [[START]];
		state.historyindex = 0;
		let gi = "";
		for (let i = 1; i < text.length; i++) {
			const n =
				"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
					.indexOf(text[i])
					.toString(2);
			gi += "000000".substr(n.length) + n;
		}
		let i = 0;
		while (i < gi.length) {
			const moves = genMoves(pos);
			let symbols = (moves.length + 1).toString(2).length,
				cur = "";
			for (let j = 0; j < symbols; j++) {
				cur += i < gi.length ? gi[i] : "0";
				i++;
			}
			const n = parseInt(cur, 2);
			if (n === 0 || n >= moves.length + 1) break;
			const move = moves[n - 1],
				san = sanMove(pos, move, moves);
			pos = doMove(pos, move.from, move.to, move.p);
			historyAdd(generateFEN(pos), oldhistory, move, san);
		}
		setCurFEN(generateFEN(pos));
		historyKeep();
	} else if (text.toLowerCase() === "revert") {
		if (state.history2 != null) {
			state.historyindex = state.history2[0];
			state.history = state.history2[1];
			state.history2 = null;
			setCurFEN(state.history[state.historyindex][0]);
			refreshButtonRevert();
			historyMove(0);
		}
	} else if (text.toLowerCase() === "keep") {
		historyKeep(state.wname, state.bname);
	} else if (text.length === 4 && text.toLowerCase().indexOf("col") === 0) {
		setBoardColor(Math.max(0, text.charCodeAt(3) - "0".charCodeAt(0)));
	} else if (text.toLowerCase().indexOf("layout ") === 0) {
		const a = text.toUpperCase().split(" ");
		a.splice(0, 1);
		const wb = document.getElementById("wb").children;
		for (let i = 0; i < wb.length; i++) {
			if (wb[i].tagName !== "DIV") continue;
			const winId = wb[i].id.substring(2);
			let cur = a.find((x) => x[0] === winId[0]);
			if (cur != null && !isMobile) {
				cur = cur.substring(1);
				const b = cur.length === 0 ? [] : cur.split(",");
				const elem = document.getElementById(`w${winId}`);
				if (elem.firstElementChild.ondblclick != null)
					elem.firstElementChild.ondblclick();
				if (b.length >= 2) {
					elem.style.width = `${b[0]}px`;
					elem.style.height = `${b[1]}px`;
				}
				if (b.length >= 4) {
					elem.style.left = `${b[2]}px`;
					elem.style.top = `${b[3]}px`;
					elem.style.position = "absolute";
				}
				showHideWindow(winId, true);
			} else if (cur != null && isMobile) showHideWindow(winId, true);
			else if (!isMobile) showHideWindow(winId, false);
		}
	} else {
		for (let i = 0; i < state.curmoves.length; i++)
			if (state.curmoves[i].san === text) {
				doMoveHandler(state.curmoves[i].move);
				break;
			}
	}
}

export function dosearch() {
	const text = document.getElementById("searchInput").value;
	document.getElementById("searchInput").value = getCurFEN();
	command(text);
	document.getElementById("searchInput").value = getCurFEN();
	document.getElementById("searchInput").blur();
}

export function showHideButtonGo(visible) {
	if (!document.getElementById("searchInput").focus) visible = false;
	if (visible && document.getElementById("searchInput").value === getCurFEN())
		visible = false;
	document.getElementById("buttonGo").style.display = visible ? "" : "none";
}

export function setupInput() {
	document.getElementById("buttonGo").onclick = () => {
		dosearch();
	};
	document.getElementById("buttonGo").onmousedown = (event) => {
		event.preventDefault();
	};
	const input = document.getElementById("searchInput");
	input.onmousedown = function () {
		this.focuswithmouse = 1;
	};
	input.onmouseup = function () {
		if (
			this.focuswithmouse === 2 &&
			input.selectionStart === input.selectionEnd
		)
			this.select();
		this.focuswithmouse = 0;
	};
	input.onfocus = function () {
		if (this.focuswithmouse === 1) this.focuswithmouse = 2;
		else {
			input.select();
			this.focuswithmouse = 0;
		}
		showHideButtonGo(true);
		document.onkeydown = null;
	};
	input.onblur = function () {
		input.selectionStart = input.selectionEnd;
		showHideButtonGo(false);
		document.onkeydown = onKeyDown;
		this.focuswithmouse = 0;
	};
	input.onpaste = () => {
		window.setTimeout(() => {
			showHideButtonGo(true);
		}, 1);
	};
	input.onkeydown = (e) => {
		if (e.key === "Escape") {
			e.preventDefault(); // Prevents default handling of the Escape key
			// Using setTimeout with 0 delay to queue the function at the end of the call stack
			window.setTimeout(() => {
				showHideButtonGo(true);
			}, 0);
		}
	};
	input.onkeyup = function (e) {
		if (e.key === "Escape") {
			input.value = getCurFEN(); // Reset input value to the current FEN
			this.select(); // Select the content of the input
			showHideButtonGo(true); // Update the visibility state of the button
		}
	};
	document.getElementById("simpleSearch").onsubmit = () => {
		dosearch();
		return false;
	};
}

export function getParameterByName(name, url) {
	if (!url) url = window.location.href;
	name = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
		results = regex.exec(url);
	if (!results?.[2]) return "";
	return decodeURIComponent(results[2].replace(/\+/g, " "));
}
