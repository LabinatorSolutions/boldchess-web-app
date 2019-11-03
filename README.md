# Chess Web-Based Analysis Board Powered By Stockfish

![GUI Type](https://img.shields.io/badge/Type-Web_GUI-orange)
![JavaScript](https://img.shields.io/badge/Language-JavaScript-yellow)
![Stockfish 10 Chess Engine](https://img.shields.io/badge/Stockfish_Chess_Engine-10-43AC6A)
![Mobile Support](https://img.shields.io/badge/Touch_Based_Device_Support-Yes-purple)
![Known Bugs](https://img.shields.io/badge/Known_Bugs-1-green)

It is a responsive web GUI for the Stockfish chess engine with analysis, evaluation, and graphs. It also comes with Leela Chess Zero (LCZero) neural network evaluation.

This project is forked initially from [PeshkaChess](https://github.com/hxim/PeshkaChess) and modified to be used on [BoldChess.com](https://boldchess.com/).


## Live Demo

https://labinatorsolutions.github.io/stockfish-chess-analysis-board/


## Features

- Ability to load your chess position or game using FEN, PGN, or a move list.
- Ability to set up your pieces manually in edit mode.
- Ability to browse game history with arrows or mouse wheel.
- Ability to list all legal moves and show them on the chessboard.
- Ability to analyze positions and all legal moves with the javascript version of the Stockfish chess engine.
- Ability to display an evaluation graph while visualizing blunders in different colors.
- Ability to open a position or game in a new window via a given URL.
- Ability to play against the computer (Stockfish Chess Engine) and set its difficulty level.
- Ability to see an evaluation by the Leela Chess Zero (LCZero) neural network.
- Ability to detect an opening category or ECO code.
- Ability to choose the styling of the chessboard.
- Ability to print arrows or mark squares on the chessboard.
- Relevant squares on the chessboard are visualized according to the static evaluation terms of the Stockfish chess engine.
- Dark interface with pitch black background that is battery-saving for OLED screens and highly intuitive.
- Support for PCs, tablets, smartphones, and touch devices.


## Available Windows

- Chessboard
- List of Moves
- Game History
- Graph
- Chess Openings
- Static Evaluation
- Edit Board


## GUI Instructions

- To open your FEN or PGN, copy your FEN or PGN to clipboard and paste it in the input box above the chessboard.
- To browse the game, use the mouse wheel on the chessboard or the arrow buttons.
- To open or hide windows, click on the small icons found at the top of the GUI.
- To play against the engine or set its difficulty level, click on the hamburger menu.
- To change the styling of the board, flip the board, or open it in a new window, click on the hamburger menu. 


## Online Installation

1. Unzip the compressed file.
2. Upload the unzipped folder to your web server then view its path from your web browser.


## Local Installation

1. Install a localhost stack like [XAMPP](https://www.apachefriends.org/index.html).
2. Unzip the compressed file.
3. Copy the unzipped folder to the directory assigned by your localhost (e.g., htdocs) then view its path from your web browser.


## List Of Known Bugs

- Google Console is reporting that the elements/buttons are too close together on mobile devices


## List Of Important Improvements

1. Ability to play against the computer with the Black pieces. Right now, you can only play against the engine with the White pieces.

2. Addition of chess clocks or game modes.

3. Ability to show analysis while still playing against the engine. Right now, when playing against the engine, the player can not view the evaluation or check the engine's score, for example.

4. There is no upper bound for the depth level. It would be much better to have a max value for the depth (or the difficulty level).


## List Of Extra Improvements

1. Addition of playing style feature. It allows the player to choose what style Stockfish will play at (passive, solid, active, aggressive, suicidal).

2. Addition of an opening book so that the engine does not spend a very long time on the first few moves when playing against level 20, for example. The app already has an opening explorer, but the engine is not using an opening book. A more professional approach would be to allow the user to choose whether he needs the engine to use an opening book or not.

3. As a related feature to point (5) is to allow the user to choose the variety of book moves that the engine may adapt. That is, how frequently the engine will change his opening - provided it is using an opening book, of course.

4. Ability to force the engine to make a move, whether it has finished analysis or not.


## Contribution

- We welcome all developers to contribute to this repository by adding features or fixing bugs. The source codes will always be free and open source.


## License

- GNU GPLv3: https://www.gnu.org/licenses/gpl-3.0-standalone.html


## Credits

- [PeshkaChess](https://github.com/hxim/PeshkaChess)
- [Stockfish](https://github.com/mcostalba/Stockfish)
- [Stockfish.js (nmrugg)](https://github.com/nmrugg/stockfish.js)
- [Stockfish.js (niklasf)](https://github.com/niklasf/stockfish.js)
- [LeelaChessZero](https://github.com/LeelaChessZero)
- [LC0-JS](https://github.com/frpays/lc0-js)
- [TensorFlow](https://github.com/tensorflow/tensorflow)
- [BoldChess](https://boldchess.com/)
- [Labinator](https://labinator.com/)
