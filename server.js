const express = require("express");
const path = require("node:path");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const { pathHeaders, securityHeaders } = require("./security-headers");

// Load environment variables from .env file
require("dotenv").config({ quiet: true });

const app = express();
const port = process.env.PORT || 3000;

/**
 * TRUST_PROXY, for running behind a reverse proxy or a PaaS router. Without
 * it every visitor arrives from the proxy's address and shares one rate-limit
 * bucket. Give the number of proxy hops (usually 1), or any value Express's
 * "trust proxy" setting accepts (an address, a subnet, "loopback").
 */
function parseTrustProxy(value) {
	if (value == null || value.trim() === "") return undefined;
	if (/^\d+$/.test(value)) return Number(value);
	if (value === "true") return true;
	if (value === "false") return false;
	return value;
}
const trustProxy = parseTrustProxy(process.env.TRUST_PROXY);
if (trustProxy !== undefined) app.set("trust proxy", trustProxy);

// Helmet's baseline hardening. CSP and the cross-origin isolation headers are
// disabled here and set below from security-headers.js instead, so that this
// server, Netlify and Vercel all serve byte-identical policies.
app.use(
	helmet({
		contentSecurityPolicy: false,
		crossOriginEmbedderPolicy: false,
		crossOriginOpenerPolicy: false,
	}),
);

// Shared security headers (single source of truth: security-headers.js)
const sharedHeaders = Object.entries(securityHeaders());
app.use((_req, res, next) => {
	for (const [name, value] of sharedHeaders) res.setHeader(name, value);
	next();
});

// Logging middleware (silent under test so the suite output stays readable)
if (process.env.NODE_ENV !== "test") app.use(morgan("combined"));

// Compression middleware
app.use(compression());

// Rate limiting middleware. One page load is ~40 requests (the shell, the
// stylesheet, every ES module under src/ and the engine), so the limit has to
// let a visitor reload many times within the window. RATE_LIMIT_MAX overrides it.
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: Number(process.env.RATE_LIMIT_MAX) || 1000, // per IP per window
});
app.use(limiter);

// Serve static files from the public directory, adding the per-path headers
// (security-headers.js) that Netlify and Vercel get from their config files.
const publicDir = path.join(__dirname, "public");
const extraHeaders = pathHeaders().map(({ prefix, headers }) => ({
	dir: path.resolve(publicDir, `.${prefix}`) + path.sep,
	headers: Object.entries(headers),
}));
app.use(
	express.static(publicDir, {
		setHeaders(res, filePath) {
			for (const { dir, headers } of extraHeaders) {
				if (!filePath.startsWith(dir)) continue;
				for (const [name, value] of headers) res.setHeader(name, value);
			}
		},
	}),
);

// Any other page URL gets the app shell (Single Page Application). A missing
// file - anything with an extension - is a real 404: answering a module or
// the engine with HTML would only surface later as a confusing MIME error.
app.use((req, res, next) => {
	if (path.extname(req.path) !== "") return next();
	res.sendFile(path.join(publicDir, "index.html"));
});
app.use((_req, res) => {
	res.status(404).type("text/plain").send("Not found");
});

// Error handling middleware
app.use((err, _req, res, _next) => {
	console.error(err.stack);
	res.status(500).send("Something went wrong!");
});

// Only listen when started directly, so tests can import the app
if (require.main === module) {
	app.listen(port, () => {
		console.log(`HTTP Server running at http://localhost:${port}`);
	});
}

module.exports = app;
