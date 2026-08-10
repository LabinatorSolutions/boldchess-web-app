/**
 * Compiles the classical evaluation terms into callable functions.
 *
 * The term sources in terms-data.js are plain strings that call each other by
 * name - `$pawns(pos)` inside `$middle_game_evaluation`, and so on. They used
 * to be installed as implicit globals with `eval("$name = " + code)`, which
 * only works in sloppy-mode script scope and made the whole evaluation
 * impossible to move into a module.
 *
 * Instead, every source is declared once inside a single generated scope. The
 * cross-references then resolve lexically, the helpers the sources need
 * (`sum`, `board`, `colorflip`) are passed in explicitly, and nothing is added
 * to the global object.
 */

import { board, colorflip, sum } from "../chess/fen.js";
import { STATIC_EVAL_TERMS } from "./terms-data.js";

/** `Middle game evaluation` -> `middle_game_evaluation`. */
export function termName(name) {
	return name.toLowerCase().replace(/ /g, "_");
}

function buildScope() {
	const names = STATIC_EVAL_TERMS.map((term) => termName(term.name));

	// `var` (not `const`) so the declarations hoist: a term source may call a
	// term that is declared later in the list, exactly as it did when these
	// were globals.
	const declarations = STATIC_EVAL_TERMS.map(
		(term, i) => `var $${names[i]} = ${term.code};`,
	).join("\n");

	const registry = names.map((name) => `"${name}": $${name}`).join(", ");

	// The returned `compile` is a direct eval inside this generated scope, so
	// the term variants built by the static-evaluation window (which rewrite a
	// source and recompile it) still see every other term. `pos` is a
	// parameter because the rewritten sources inline term values as
	// `(function(){return 42;})(pos)` and still pass the position along.
	const factory = new Function(
		"sum",
		"board",
		"colorflip",
		"zero",
		`${declarations}
return {
	terms: { ${registry} },
	compile: (source, pos) => eval("(" + source + ")"),
};`,
	);

	return factory(sum, board, colorflip, () => 0);
}

const scope = buildScope();

/** Every evaluation term, keyed by its snake_case name. */
export const terms = scope.terms;

/**
 * Compile one evaluation-term source in the shared term scope.
 * Used for the rewritten per-term variants shown in the evaluation window.
 *
 * @param {string} source - a first-party term source from terms-data.js,
 *   possibly with other terms already substituted in. Never user input.
 * @param {object} pos - the position the rewritten source refers to.
 */
export const compileTerm = scope.compile;
