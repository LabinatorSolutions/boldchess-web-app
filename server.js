const express = require("express");
const path = require("node:path");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const { securityHeaders } = require("./security-headers");

// Load environment variables from .env file
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

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

// Rate limiting middleware. The smoke test loads the whole app twice from one
// address, which is more requests than a real visitor makes in a window, so it
// runs with a limit that does not cut the second page load short.
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: process.env.NODE_ENV === "test" ? 1000 : 100, // per IP per window
});
app.use(limiter);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, "public")));

// Send the main HTML file for any other requests (Single Page Application)
app.use((_req, res) => {
	res.sendFile(path.join(__dirname, "public", "index.html"));
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
