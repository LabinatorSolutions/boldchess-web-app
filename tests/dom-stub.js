/**
 * A DOM small enough to run the command box under Bun.
 *
 * `command()` is the only large piece of client logic that mixes chess rules
 * with page updates, so it cannot be tested through the pure modules alone.
 * The stub gives every id its own element and keeps text nodes real, which is
 * all `setElemText`/`getElemText` need.
 *
 * `requestAnimationFrame` deliberately never invokes its callback: `showBoard`,
 * `reloadMenu` and `scrollReset` all defer their work into it, so the rendering
 * layer stays out of these tests while the state changes still happen.
 */

function createTextNode(text) {
	return { tagName: null, textContent: String(text) };
}

/**
 * A stand-in for `CSSStyleDeclaration`: reading a property that was never set
 * yields `""`, not `undefined`. `checkSizes` calls `.replace()` straight on
 * `style.transform`, so the difference matters.
 */
function createStyle() {
	return new Proxy(
		{},
		{
			get: (target, property) => {
				if (property in target) return target[property];
				return typeof property === "string" ? "" : undefined;
			},
		},
	);
}

function createElement(tagName = "DIV", id = "") {
	return {
		tagName,
		id,
		className: "",
		innerText: "",
		style: createStyle(),
		childNodes: [],
		get children() {
			return this.childNodes.filter((node) => node.tagName != null);
		},
		get firstChild() {
			return this.childNodes.length > 0 ? this.childNodes[0] : null;
		},
		get firstElementChild() {
			return this.children.length > 0 ? this.children[0] : null;
		},
		get textContent() {
			return this.childNodes.map((node) => node.textContent ?? "").join("");
		},
		set textContent(value) {
			this.childNodes = [createTextNode(value)];
		},
		appendChild(child) {
			if (child?.isFragment) {
				this.childNodes.push(...child.childNodes);
				child.childNodes = [];
			} else this.childNodes.push(child);
			return child;
		},
		removeChild(child) {
			const at = this.childNodes.indexOf(child);
			if (at >= 0) this.childNodes.splice(at, 1);
			return child;
		},
		setAttribute() {},
		removeAttribute() {},
		getAttribute: () => null,
		addEventListener() {},
		getBoundingClientRect: () => ({
			top: 0,
			left: 0,
			right: 0,
			bottom: 0,
			width: 0,
			height: 0,
		}),
	};
}

/**
 * Install the stub on `globalThis` and return the handles a test needs to
 * assert on: the element registry, the urls passed to `window.open` and the
 * messages passed to `alert`.
 */
export function installDomStub() {
	const elements = new Map();
	const openedUrls = [];
	const alerts = [];

	const getElementById = (id) => {
		if (!elements.has(id)) elements.set(id, createElement("DIV", id));
		return elements.get(id);
	};

	const location = {
		href: "http://localhost/",
		protocol: "http:",
		host: "localhost",
		pathname: "/",
	};

	const document = {
		location,
		body: createElement("BODY"),
		documentElement: createElement("HTML"),
		getElementById,
		querySelector: () => null,
		createElement: (tagName) => createElement(tagName.toUpperCase()),
		createTextNode,
		createDocumentFragment: () => {
			const fragment = createElement(null);
			fragment.isFragment = true;
			return fragment;
		},
		addEventListener() {},
	};

	const store = new Map();
	globalThis.document = document;
	globalThis.location = location;
	globalThis.navigator = { userAgent: "node" };
	globalThis.alert = (message) => alerts.push(message);
	globalThis.requestAnimationFrame = () => 0;
	globalThis.localStorage = {
		getItem: (key) => (store.has(key) ? store.get(key) : null),
		setItem: (key, value) => store.set(key, String(value)),
		removeItem: (key) => store.delete(key),
	};
	globalThis.window = {
		location,
		document,
		event: undefined,
		open: (url) => openedUrls.push(url),
		addEventListener() {},
		setInterval: () => 0,
		setTimeout: () => 0,
		localStorage: globalThis.localStorage,
	};

	return { elements, getElementById, openedUrls, alerts, createElement };
}

/**
 * Build the `#wb` window bar the `window` and `layout` commands walk. Each
 * child is a `wb<Name>` div whose id suffix names the window it toggles.
 */
export function installWindowBar(dom, names) {
	const bar = dom.getElementById("wb");
	bar.childNodes = names.map((name) => dom.createElement("DIV", `wb${name}`));
	for (const name of names) {
		const win = dom.getElementById(`w${name}`);
		win.style.display = "";
		win.appendChild(dom.createElement("DIV", `${name}Title`));
	}
	return bar;
}

/**
 * Build the `#cbTable` grid `refreshFlip` relabels: a header row and a footer
 * row of nine cells, and eight rank rows of three.
 */
export function installBoardTable(dom) {
	const table = dom.getElementById("cbTable");
	const body = dom.createElement("TBODY");
	const row = (cells) => {
		const tr = dom.createElement("TR");
		for (let i = 0; i < cells; i++) tr.appendChild(dom.createElement("TD"));
		return tr;
	};
	body.appendChild(row(10));
	for (let i = 0; i < 8; i++) body.appendChild(row(3));
	body.appendChild(row(10));
	table.appendChild(body);
	return table;
}
