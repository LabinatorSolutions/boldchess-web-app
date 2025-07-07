# BoldChess Web App

![Node.js Version](https://img.shields.io/badge/Node.js-v20.18.0-339933)
![Express.js](https://img.shields.io/badge/Express.js-4.21.1-259dff)
![Stockfish Chess Engine](https://img.shields.io/badge/Stockfish_Version-16.1-358853)
![Mobile Ready](https://img.shields.io/badge/Mobile_Ready-Yes-985b68)
![Issues](https://img.shields.io/github/issues-search/LabinatorSolutions/boldchess-web-app?label=Known%20Bugs&query=is%3Aissue+is%3Aopen+label%3Abug)
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

## Installation

1. **Prerequisites**:
   - Ensure Node.js is installed. If not, download and install it from the [Node.js official website](https://nodejs.org/).
   - **Alternatively, you can use Docker (see below).**

2. **Repository Setup**:
   - Clone the repository to your local machine.
   - Navigate to the project directory.

3. **Dependency Installation (Node.js only)**:
   - Install the project dependencies:
     ```bash
     npm install
     ```

4. **Local Server (Node.js only)**:
   - Start the local development server:
     ```bash
     npm run start
     ```
   - Access the application at `http://localhost:3000` in a web browser.

---

### Running with Docker (Alternative to Node.js install)

You can run the BoldChess Web App in a Docker container for easy local development, testing, and deployment.

1. **Build the Docker Image**

   ```bash
   docker build -t boldchess-web-app .
   ```

2. **Run the Docker Container**

   ```bash
   docker run -p 3000:3000 boldchess-web-app
   ```

   The app will be available at [http://localhost:3000](http://localhost:3000).

3. **Using Docker Compose (Optional)**

   If you prefer using Docker Compose, you can start the app with:

   ```bash
   docker compose up --build
   ```

   This will build and run the app as defined in `docker-compose.yml`.

4. **Development Notes**

   - The `.dockerignore` file is used to exclude unnecessary files from the Docker build context.
   - The default container runs in production mode. For development, you may adjust the Dockerfile or Compose file as needed.

---

## HTTP Headers Setup

The app is currently using **Stockfish 16.1 JS**, which utilizes the `SharedArrayBuffer`. To ensure the engine functions correctly, you need to enable SharedArrayBuffer support both locally and on your server. This involves setting appropriate HTTP headers.

To enable `SharedArrayBuffer`, you must configure the following HTTP headers:

1. **Cross-Origin-Opener-Policy (COOP)**: This should be set to `same-origin`.
2. **Cross-Origin-Embedder-Policy (COEP)**: This should be set to `require-corp`.

These headers isolate the context of your page and provide the necessary security guarantees for using `SharedArrayBuffer`. Properly configuring these headers will allow the Stockfish 16.1 JS engine to operate efficiently. Alternatively, you can switch to the **Stockfish 16.1 Single JS** which does not utilize the `SharedArrayBuffer`.

Read more about `ShreadArrayBuffer` at [this link](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer).

---

## Server and Deployment

The application is designed for easy deployment in any standard Node.js environment.

**Running the Server**: The main entry point is `server.js`, which serves the static files in the `public` directory, eliminating the need for a build process. This simplifies deployment and development.

**No Build Required**: Reflecting the application's simplicity and the direct use of vanilla JavaScript, the 'build' script in `package.json` is intentionally minimal: `echo 'No build required'`. This is due to the architecture's focus on serving static assets without complex build processes or server-side rendering.

---

## Important Improvements & Issues

For a list of important improvements and known issues, visit our [GitHub Issues page](https://github.com/LabinatorSolutions/boldchess-web-app/issues).

---

## Contribution

We welcome all developers to contribute by adding features or fixing bugs.

Visit the [Contributors page](https://github.com/LabinatorSolutions/boldchess-web-app/graphs/contributors) to see the list of current contributors.

---

## License

This project is licensed under the **GNU AFFERO GENERAL PUBLIC LICENSE (AGPLv3)**. For more details, see the [AGPLv3 License](https://www.gnu.org/licenses/agpl-3.0.html).

---

## Credits

- [Stockfish](https://github.com/mcostalba/Stockfish)
- [Stockfish.js](https://github.com/nmrugg/stockfish.js)
- [TensorFlow](https://github.com/tensorflow/tensorflow)
- [Protobuf](https://github.com/protobufjs/protobuf.js)
- [Pako](https://github.com/nodeca/pako)
- [BoldChess](https://boldchess.com/)
- [Labinator](https://labinator.com/)
