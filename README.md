# BoldChess Web App

![Node.js Version](https://img.shields.io/badge/Node.js-v24.12.0-339933)
![Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=flat&logo=bun&logoColor=white)
![Biome](https://img.shields.io/badge/Biome-60a5fa?style=flat&logo=biome&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-5.2.1-259dff)
![Stockfish Chess Engine](https://img.shields.io/badge/Stockfish_Version-17.1-358853)
![Mobile Ready](https://img.shields.io/badge/Mobile_Ready-Yes-985b68)
![License](https://img.shields.io/badge/License-AGPL_v3-663366)

The official chess web-based app of [BoldChess.com](https://boldchess.com/).
It is a responsive web GUI for the Stockfish chess engine, offering analysis, evaluation, and graphical features.

---

## Mission

Our mission is to create a modern, mobile-friendly, free, and open-source web-based chess app, powered by the advanced Stockfish chess engine.

---

## Features

- Load your chess position or game using FEN, PGN, or a move list.
- Set up pieces manually in edit mode.
- Browse game history using arrows or the mouse wheel.
- List and display all legal moves on the chessboard.
- Analyze positions and legal moves using the JavaScript version of Stockfish.
- Display an evaluation graph with visual indicators for blunders.
- Open a position or game in a new window via a URL.
- Play against the Stockfish engine, with the ability to set its rating according to your preference.
- Activate/Deactivate a special "Coach Mode" to view the best move and evaluation while playing.
- Customize the appearance of the chessboard.
- Draw arrows or highlight squares on the chessboard.
- Visualize relevant squares based on Stockfish's static evaluation.
- Dark interface with a pitch-black background for OLED screens, improving battery life and user experience.
- Support for PCs, tablets, smartphones, and touch devices.

---

## Available Windows

- Chessboard
- All Moves With Evaluations
- History of Moves
- Evaluation Graph
- Static Evaluation
- Chessboard Editor

---

## GUI Instructions

- To open your FEN or PGN, copy it to the clipboard and paste it into the input box above the chessboard.
- To browse the game, use the mouse wheel on the chessboard or the arrow buttons.
- To open or hide windows, click on the small icons at the top of the GUI.
- To play against the engine or set its difficulty level, click on the hamburger menu.
- To change the board styling, flip the board, or open it in a new window, click on the hamburger menu.

---

## Environment Variables

The application uses an optional `.env` file for configuration.

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | The port the server will listen on. | `3000` |

---

## Installation & Running

This project uses [Bun](https://bun.sh/) for dependency management and as a runtime.

1. **Prerequisites**:
    - Ensure [Bun](https://bun.sh/) is installed on your system.

2. **Repository Setup**:
    - Clone the repository to your local machine.
    - Navigate to the project directory.

3. **Dependency Installation**:
    - Install the project dependencies:

        ```bash
        bun install
        ```

4. **Local Server**:
    - Start the local development server:

        ```bash
        bun start
        ```

    - Access the application at `http://localhost:3000` in a web browser.

---

## Development

We use [Biome](https://biomejs.dev/) for linting and formatting.

- **Check for issues**:

    ```bash
    bun run lint
    ```

- **Fix issues**:

    ```bash
    bun run lint:fix
    ```

- **Format code**:

    ```bash
    bun run format
    ```

---

## HTTP Headers Setup

The app uses **Stockfish 17.1 JS**, which utilizes `SharedArrayBuffer` for multi-threaded performance. The engine architecture also uses a **multi-part WASM system** (6 parts, ~13MB each) for better browser caching, with the NNUE neural network embedded directly in the WASM files.

To ensure the engine functions correctly, you must configure the following HTTP headers on your server:

### Required Headers

1. **Cross-Origin-Opener-Policy (COOP)**: Set to `same-origin`
2. **Cross-Origin-Embedder-Policy (COEP)**: Set to `require-corp`
3. **Content-Security-Policy (CSP)**: Must allow `blob:` URLs for the multi-part WASM architecture
    - `script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:`
    - `connect-src 'self' blob:`
    - `worker-src 'self' blob:`

### Why These Headers?

- **COOP/COEP**: These headers enable cross-origin isolation, which is required for `SharedArrayBuffer` to function. This allows Stockfish to use multiple threads for faster analysis.
- **CSP blob: support**: Stockfish 17.1 fetches the 6 WASM parts, combines them into a single blob, and loads the engine via a `blob:` URL. Without blob URL support in the CSP, the engine will fail to load.

### Example (Express.js with Helmet)

```javascript
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "blob:"],
            connectSrc: ["'self'", "blob:"],
            workerSrc: ["'self'", "blob:"],
            // ... other directives
        },
    },
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginEmbedderPolicy: { policy: "require-corp" }
}));
```

Read more about `SharedArrayBuffer` at the [MDN documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer).

---

## Server and Deployment

The application is designed for easy deployment in any standard Node.js/Bun environment.

**Running the Server**: The main entry point is `server.js`, which serves the static files in the `public` directory, eliminating the need for a build process. This simplifies deployment and development.

**No Build Required**: Reflecting the application's simplicity and the direct use of vanilla JavaScript, the 'build' script in `package.json` is intentionally minimal: `echo 'No build required'`. This is due to the architecture's focus on serving static assets without complex build processes or server-side rendering.

---

## Contribution

We welcome all developers to contribute by adding features or fixing bugs.

Please report issues via [BitBucket Issues](https://bitbucket.org/labinator-team/boldchess-web-app/issues).

---

## License

This project is licensed under the **GNU AFFERO GENERAL PUBLIC LICENSE (AGPLv3)**. For more details, see the [LICENSE.md](file:///home/kai/Downloads/%5BX%5D%20-%20Portal/BitBucket/BoldChess/boldchess-web-app/LICENSE.md) file.

---

## Credits

- [Stockfish](https://github.com/mcostalba/Stockfish)
- [Stockfish.js](https://github.com/nmrugg/stockfish.js)
- [TensorFlow](https://github.com/tensorflow/tensorflow)
- [Protobuf](https://github.com/protobufjs/protobuf.js)
- [Pako](https://github.com/nodeca/pako)
- [BoldChess](https://boldchess.com/)
- [Labinator](https://labinator.com/)
