const express = require("express");
const path = require("node:path");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const cheerio = require("cheerio");

// Load environment variables from .env file
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

// Set security HTTP headers
// Use helmet to set various security-related headers
app.use(
	helmet({
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'"],
				scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "blob:"], // Allow inline scripts, eval, and blob URLs
				styleSrc: ["'self'", "'unsafe-inline'"],
				imgSrc: ["'self'", "data:"],
				connectSrc: ["'self'", "blob:"], // Allow blob URLs for Stockfish WASM loading
				fontSrc: ["'self'", "data:"],
				objectSrc: ["'none'"],
				workerSrc: ["'self'", "blob:"], // Allow Web Workers from blob URLs
				upgradeInsecureRequests: [],
			},
		},
		crossOriginOpenerPolicy: { policy: "same-origin" },
		crossOriginEmbedderPolicy: { policy: "require-corp" },
	}),
);

// Enable Cross-Origin Resource Sharing (CORS)
app.use(cors());

// Logging middleware
app.use(morgan("combined"));

// Compression middleware
app.use(compression());

// Rate limiting middleware
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // Limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Parse incoming JSON requests
app.use(express.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, "public")));

// Middleware to sanitize user input using cheerio
app.use((req, _res, next) => {
	const sanitizeInput = (input) => {
		const $ = cheerio.load(input);
		return $.text();
	};

	if (req.body) {
		for (const key in req.body) {
			req.body[key] = sanitizeInput(req.body[key]);
		}
	}
	if (req.query) {
		for (const key in req.query) {
			req.query[key] = sanitizeInput(req.query[key]);
		}
	}
	next();
});

// Send the main HTML file for any other requests (Single Page Application)
app.use((_req, res) => {
	res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Error handling middleware
app.use((err, _req, res, _next) => {
	console.error(err.stack);
	res.status(500).send("Something went wrong!");
});

app.listen(port, () => {
	console.log(`HTTP Server running at http://localhost:${port}`);
});

module.exports = app;
