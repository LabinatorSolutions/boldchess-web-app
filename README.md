# BoldChess Web App

![Web GUI](https://img.shields.io/badge/Web_GUI-Responsive-526ba2)
![JavaScript](https://img.shields.io/badge/Language-JavaScript-f0db4f)
![Node.js Version](https://img.shields.io/badge/Node.js-v21.7.1-339933)
![Express.js](https://img.shields.io/badge/Express.js-4.18.3-259dff)
![Stockfish Chess Engine](https://img.shields.io/badge/Stockfish_Version-10-358853)
![Mobile Ready](https://img.shields.io/badge/Mobile_Ready-Yes-985b68)
![Issues](https://img.shields.io/github/issues-search/LabinatorSolutions/boldchess-web-app?label=Known%20Bugs&query=is%3Aissue+is%3Aopen+label%3Abug)
![License](https://img.shields.io/badge/License-AGPL_v3-663366)

The official chess web-based app of the [BoldChess.com](https://boldchess.com/) website.
It is a responsive web GUI for the Stockfish chess engine with analysis, evaluation, and graphs.

---

## Mission

Our mission from this project is to develop a modern responsive free and open source web-based chess app powered by the Stockfish chess engine.

---

## Improved Version On BoldChess.com with Stockfish 16.1

[https://app.boldchess.com/](https://app.boldchess.com/)

**Note**: The above is the premium version that we are using on BoldChess.com and maintained by our team. If you like to join our team and contribute on the latest version for BoldChess, contact us at: [https://BoldChess.com/contact](BoldChess.com/Contact). The version here on Github uses the old version of Stockfish (v10).

---

## Features

- Ability to load your chess position or game using FEN, PGN, or a move list.
- Ability to set up your pieces manually in edit mode.
- Ability to browse game history with arrows or mouse wheel.
- Ability to list all legal moves and show them on the chessboard.
- Ability to analyze positions and all legal moves with the javascript version of the Stockfish chess engine.
- Ability to display an evaluation graph while visualizing blunders in different colors.
- Ability to open a position or game in a new window via a given URL.
- Ability to play against the computer (Stockfish Chess Engine) and set its difficulty level.
- Ability to detect an opening category or ECO code.
- Ability to choose the styling of the chessboard.
- Ability to print arrows or mark squares on the chessboard.
- Relevant squares on the chessboard are visualized according to the static evaluation terms of the Stockfish chess engine.
- Dark interface with pitch black background that is battery-saving for OLED screens and highly intuitive.
- Support for PCs, tablets, smartphones, and touch devices.

---

## Available Windows

- Chessboard
- List of Moves
- Game History
- Graph
- Chess Openings
- Static Evaluation
- Edit Board

---

## GUI Instructions

- To open your FEN or PGN, copy your FEN or PGN to clipboard and paste it in the input box above the chessboard.
- To browse the game, use the mouse wheel on the chessboard or the arrow buttons.
- To open or hide windows, click on the small icons found at the top of the GUI.
- To play against the engine or set its difficulty level, click on the hamburger menu.
- To change the styling of the board, flip the board, or open it in a new window, click on the hamburger menu.

---

## Installation

1. **Prerequisites**:
   - Ensure Node.js is installed on your machine. If not, download and install it from [Node.js official website](https://nodejs.org/).

2. **Repository Setup**:
   - Clone the repository to your local machine.
   - Navigate to the project directory.

3. **Dependency Installation**:
   - Install the project dependencies by running:
     ```bash
     npm install
     ```

4. **Local Server**:
   - Start the local development server:
     ```bash
     npm run start
     ```
   - Access the application by opening `http://localhost:3000` in a web browser.

---

## Server and Deployment

The application is designed to be easily deployable on any standard Node.js environment.

**Running the Server**: The main entry point of the application is server.js. This server serves the static files located in the public directory and does not require a build process for deployment. This design choice simplifies deployment and development processes.

**No Build Required**: Reflecting the application's simplicity and the direct use of vanilla JavaScript, the 'build' script in package.json is intentionally left minimal with echo 'No build required'. This is due to the application's architecture, focusing on serving static assets without the need for complex build processes or server-side rendering.

---

## List Of Important Improvements & Issues

[https://github.com/LabinatorSolutions/boldchess-web-app/issues](https://github.com/LabinatorSolutions/boldchess-web-app/issues)

---

## Contribution

We welcome all developers to contribute to this repository by adding features or fixing bugs.

**List Of Current Contributors:**

[https://github.com/LabinatorSolutions/boldchess-web-app/graphs/contributors](https://github.com/LabinatorSolutions/boldchess-web-app/graphs/contributors)

---

## License

GNU AFFERO GENERAL PUBLIC LICENSE (AGPLv3): [https://www.gnu.org/licenses/agpl-3.0.html](https://www.gnu.org/licenses/agpl-3.0.html)

---

## Credits

- [Stockfish](https://github.com/mcostalba/Stockfish)
- [Stockfish.js (nmrugg)](https://github.com/nmrugg/stockfish.js)
- [Stockfish.js (niklasf)](https://github.com/niklasf/stockfish.js)
- [TensorFlow](https://github.com/tensorflow/tensorflow)
- [PeshkaChess](https://github.com/hxim/PeshkaChess)
- [BoldChess](https://boldchess.com/)
- [Labinator](https://labinator.com/)
