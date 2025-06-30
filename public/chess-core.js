/**
 * Chess Core Logic Module for BoldChess Web App
 * ES2024 compliant with modern architecture
 * 
 * This module contains all pure chess logic functions including FEN parsing,
 * move generation, position validation, and game state management.
 * These functions have no UI dependencies and can be used independently.
 */

import { CHESS_CONFIG } from './constants.js';

/**
 * Chess Core Logic class with ES2024 features
 */
export class ChessCore {
  /**
   * Check if coordinates are within board bounds
   * @param {number} x - File (0-7)
   * @param {number} y - Rank (0-7)
   * @returns {boolean} True if coordinates are valid
   */
  static bounds(x, y) {
    return x >= 0 && x <= 7 && y >= 0 && y <= 7;
  }

  /**
   * Get piece at board position
   * @param {Object} pos - Position object
   * @param {number} x - File (0-7)
   * @param {number} y - Rank (0-7)
   * @returns {string} Piece character or 'x' if out of bounds
   */
  static board(pos, x, y) {
    if (ChessCore.bounds(x, y)) return pos.b[x][y];
    return 'x';
  }

  /**
   * Flip board colors (white becomes black and vice versa)
   * @param {Object} pos - Position object
   * @returns {Object} Color-flipped position
   */
  static colorflip(pos) {
    const board = new Array(8);
    for (let i = 0; i < 8; i++) board[i] = new Array(8);
    
    for (let x = 0; x < 8; x++) {
      for (let y = 0; y < 8; y++) {
        board[x][y] = pos.b[x][7 - y];
        const isWhite = board[x][y].toUpperCase() === board[x][y];
        board[x][y] = isWhite ? board[x][y].toLowerCase() : board[x][y].toUpperCase();
      }
    }
    
    return {
      b: board,
      c: [pos.c[2], pos.c[3], pos.c[0], pos.c[1]], // Swap castling rights
      e: pos.e == null ? null : [pos.e[0], 7 - pos.e[1]], // Flip en passant
      w: !pos.w, // Flip turn
      m: [pos.m[0], pos.m[1]] // Keep move counters
    };
  }

  /**
   * Sum function values over all board squares
   * @param {Object} pos - Position object
   * @param {Function} func - Function to apply to each square
   * @param {*} param - Additional parameter for function
   * @returns {number} Sum of function values
   */
  static sum(pos, func, param) {
    let sum = 0;
    for (let x = 0; x < 8; x++) {
      for (let y = 0; y < 8; y++) {
        sum += func(pos, { x, y }, param);
      }
    }
    return sum;
  }

  /**
   * Parse move number from FEN string
   * @param {string} fen - FEN notation string
   * @returns {number} Move number
   */
  static parseMoveNumber(fen) {
    const parts = fen.replace(/^\s+/, '').split(' ');
    return (parts.length > 5 && !isNaN(parts[5]) && parts[5] !== '') 
      ? parseInt(parts[5]) : 1;
  }

  /**
   * Parse FEN notation into position object
   * @param {string} fen - FEN notation string
   * @returns {Object} Position object with board, castling, en passant, etc.
   */
  static parseFEN(fen) {
    const board = new Array(8);
    for (let i = 0; i < 8; i++) board[i] = new Array(8);
    
    const parts = fen.replace(/^\s+/, '').split(' ');
    const boardStr = parts[0];
    
    // Initialize empty board
    for (let x = 0; x < 8; x++) {
      for (let y = 0; y < 8; y++) {
        board[x][y] = '-';
      }
    }
    
    // Parse board position
    let x = 0, y = 0;
    for (let i = 0; i < boardStr.length; i++) {
      const char = boardStr[i];
      
      if (char === ' ') break;
      if (char === '/') {
        x = 0;
        y++;
      } else if (ChessCore.bounds(x, y)) {
        if ('KQRBNP'.includes(char.toUpperCase())) {
          board[x][y] = char;
          x++;
        } else if ('0123456789'.includes(char)) {
          x += parseInt(char);
        } else {
          x++;
        }
      }
    }
    
    // Parse turn (default to white)
    const isWhiteMove = !(parts.length > 1 && parts[1] === 'b');
    
    // Parse castling rights
    let castling;
    if (parts.length > 2) {
      const castlingStr = parts[2];
      castling = [
        castlingStr.includes('K'), // White kingside
        castlingStr.includes('Q'), // White queenside
        castlingStr.includes('k'), // Black kingside
        castlingStr.includes('q')  // Black queenside
      ];
    } else {
      castling = [true, true, true, true];
    }
    
    // Parse en passant target
    let enpassant = null;
    if (parts.length > 3 && parts[3].length === 2) {
      const ex = 'abcdefgh'.indexOf(parts[3][0]);
      const ey = '87654321'.indexOf(parts[3][1]);
      enpassant = (ex >= 0 && ey >= 0) ? [ex, ey] : null;
    }
    
    // Parse move counters
    const moveCount = [
      (parts.length > 4 && !isNaN(parts[4]) && parts[4] !== '') ? parseInt(parts[4]) : 0,
      (parts.length > 5 && !isNaN(parts[5]) && parts[5] !== '') ? parseInt(parts[5]) : 1
    ];
    
    return {
      b: board,        // Board array
      c: castling,     // Castling rights
      e: enpassant,    // En passant target
      w: isWhiteMove,  // White to move
      m: moveCount     // [halfmove clock, fullmove number]
    };
  }

  /**
   * Generate FEN notation from position object
   * @param {Object} pos - Position object
   * @returns {string} FEN notation string
   */
  static generateFEN(pos) {
    let boardStr = '';
    let emptyCount = 0;
    
    // Generate board string
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        if (pos.b[x][y] === '-') {
          emptyCount++;
        } else {
          if (emptyCount > 0) {
            boardStr += emptyCount;
            emptyCount = 0;
          }
          boardStr += pos.b[x][y];
        }
      }
      
      if (emptyCount > 0) {
        boardStr += emptyCount;
        emptyCount = 0;
      }
      
      if (y < 7) boardStr += '/';
    }
    
    // Generate castling string
    const castlingStr = (pos.c[0] || pos.c[1] || pos.c[2] || pos.c[3]) 
      ? (pos.c[0] ? 'K' : '') + (pos.c[1] ? 'Q' : '') + (pos.c[2] ? 'k' : '') + (pos.c[3] ? 'q' : '')
      : '-';
    
    // Generate en passant string
    const enpassantStr = pos.e == null 
      ? '-' 
      : 'abcdefgh'[pos.e[0]] + '87654321'[pos.e[1]];
    
    return `${boardStr} ${pos.w ? 'w' : 'b'} ${castlingStr} ${enpassantStr} ${pos.m[0]} ${pos.m[1]}`;
  }

  /**
   * Check if white king is in check
   * @param {Object} pos - Position object
   * @returns {boolean} True if white king is in check
   */
  static isWhiteCheck(pos) {
    // Find white king position
    let kx = null, ky = null;
    for (let x = 0; x < 8; x++) {
      for (let y = 0; y < 8; y++) {
        if (pos.b[x][y] === 'K') {
          kx = x;
          ky = y;
          break;
        }
      }
      if (kx !== null) break;
    }
    
    if (kx === null || ky === null) return false;
    
    // Check for attacks on king
    return ChessCore.#isSquareAttackedByBlack(pos, kx, ky);
  }

  /**
   * Check if a square is attacked by black pieces
   * @param {Object} pos - Position object
   * @param {number} x - Target square file
   * @param {number} y - Target square rank
   * @returns {boolean} True if square is attacked by black
   * @private
   */
  static #isSquareAttackedByBlack(pos, x, y) {
    // Check pawn attacks
    if (ChessCore.bounds(x - 1, y - 1) && pos.b[x - 1][y - 1] === 'p') return true;
    if (ChessCore.bounds(x + 1, y - 1) && pos.b[x + 1][y - 1] === 'p') return true;
    
    // Check knight attacks
    const knightMoves = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
    for (const [dx, dy] of knightMoves) {
      if (ChessCore.bounds(x + dx, y + dy) && pos.b[x + dx][y + dy] === 'n') return true;
    }
    
    // Check king attacks
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        if (ChessCore.bounds(x + dx, y + dy) && pos.b[x + dx][y + dy] === 'k') return true;
      }
    }
    
    // Check sliding piece attacks (bishops, rooks, queens)
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];
    
    for (const [dx, dy] of directions) {
      for (let d = 1; d < 8; d++) {
        const nx = x + d * dx;
        const ny = y + d * dy;
        
        if (!ChessCore.bounds(nx, ny)) break;
        
        const piece = pos.b[nx][ny];
        if (piece === '-') continue;
        
        // Check if piece can attack in this direction
        if (piece === 'q') return true; // Queen attacks in all directions
        if ((dx === 0 || dy === 0) && piece === 'r') return true; // Rook attacks orthogonally
        if ((dx !== 0 && dy !== 0) && piece === 'b') return true; // Bishop attacks diagonally
        
        break; // Piece blocks further attacks in this direction
      }
    }
    
    return false;
  }

  /**
   * Apply a move to a position
   * @param {Object} pos - Position object
   * @param {Object} from - Source square {x, y}
   * @param {Object} to - Target square {x, y}
   * @param {string} promotion - Promotion piece ('Q', 'R', 'B', 'N')
   * @returns {Object} New position after move
   */
  static doMove(pos, from, to, promotion = null) {
    // Validate position structure
    if (!pos.b || 
        typeof pos.b[from.x] === 'undefined' ||
        typeof pos.b[from.x][from.y] === 'undefined' ||
        typeof pos.b[to.x] === 'undefined' ||
        typeof pos.b[to.x][to.y] === 'undefined') {
      return pos; // Return original position if invalid
    }
    
    // Handle black move by flipping colors
    if (pos.b[from.x][from.y].toUpperCase() !== pos.b[from.x][from.y]) {
      const flippedResult = ChessCore.doMove(
        ChessCore.colorflip(pos),
        { x: from.x, y: 7 - from.y },
        { x: to.x, y: 7 - to.y },
        promotion
      );
      const result = ChessCore.colorflip(flippedResult);
      result.m[1]++; // Increment full move counter for black moves
      return result;
    }
    
    // Create copy of position
    const result = ChessCore.#deepCopyPosition(pos);
    result.w = !result.w; // Switch turn
    
    // Update castling rights based on piece movement
    if (from.x === 7 && from.y === 7) result.c[0] = false; // White kingside rook
    if (from.x === 0 && from.y === 7) result.c[1] = false; // White queenside rook
    if (to.x === 7 && to.y === 0) result.c[2] = false;     // Black kingside rook captured
    if (to.x === 0 && to.y === 0) result.c[3] = false;     // Black queenside rook captured
    if (from.x === 4 && from.y === 7) {                    // White king moved
      result.c[0] = result.c[1] = false;
    }
    
    const movingPiece = pos.b[from.x][from.y];
    const capturedPiece = pos.b[to.x][to.y];
    
    // Set en passant target for pawn two-square moves
    result.e = (movingPiece === 'P' && from.y === 6 && to.y === 4) 
      ? [from.x, 5] : null;
    
    // Handle castling
    if (movingPiece === 'K' && Math.abs(from.x - to.x) > 1) {
      result.b[from.x][from.y] = '-';
      result.b[to.x][to.y] = 'K';
      result.b[to.x > 4 ? 5 : 3][to.y] = 'R'; // Move rook
      result.b[to.x > 4 ? 7 : 0][to.y] = '-'; // Clear rook's original square
      return result;
    }
    
    // Handle pawn promotion
    if (movingPiece === 'P' && to.y === 0) {
      result.b[to.x][to.y] = promotion ?? 'Q'; // Default to queen promotion
    }
    // Handle en passant capture
    else if (movingPiece === 'P' && 
             pos.e != null && 
             to.x === pos.e[0] && 
             to.y === pos.e[1] &&
             Math.abs(from.x - to.x) === 1) {
      result.b[to.x][from.y] = '-'; // Remove captured pawn
      result.b[to.x][to.y] = movingPiece;
    }
    // Normal move
    else {
      result.b[to.x][to.y] = movingPiece;
    }
    
    // Clear source square
    result.b[from.x][from.y] = '-';
    
    // Update halfmove clock (reset on pawn move or capture)
    result.m[0] = (movingPiece === 'P' || capturedPiece !== '-') 
      ? 0 : result.m[0] + 1;
    
    return result;
  }

  /**
   * Create a deep copy of a position object
   * @param {Object} pos - Position to copy
   * @returns {Object} Deep copy of position
   * @private
   */
  static #deepCopyPosition(pos) {
    const board = new Array(8);
    for (let i = 0; i < 8; i++) {
      board[i] = new Array(8);
      for (let j = 0; j < 8; j++) {
        board[i][j] = pos.b[i][j];
      }
    }
    
    return {
      b: board,
      c: [...pos.c],
      e: pos.e ? [...pos.e] : null,
      w: pos.w,
      m: [...pos.m]
    };
  }

  /**
   * Check if a move is legal
   * @param {Object} pos - Position object
   * @param {Object} from - Source square {x, y}
   * @param {Object} to - Target square {x, y}
   * @returns {boolean} True if move is legal
   */
  static isLegal(pos, from, to) {
    if (!ChessCore.bounds(from.x, from.y) || !ChessCore.bounds(to.x, to.y)) return false;
    if (from.x === to.x && from.y === to.y) return false;
    
    // Handle black move by flipping colors
    if (pos.b[from.x][from.y].toUpperCase() !== pos.b[from.x][from.y]) {
      return ChessCore.isLegal(
        ChessCore.colorflip(pos),
        { x: from.x, y: 7 - from.y },
        { x: to.x, y: 7 - to.y }
      );
    }
    
    if (!pos.w) return false; // Not white's turn
    
    const fromPiece = pos.b[from.x][from.y];
    const toPiece = pos.b[to.x][to.y];
    
    // Can't capture own piece
    if (toPiece.toUpperCase() === toPiece && toPiece !== '-') return false;
    
    if (fromPiece === '-') return false;
    
    // Check piece-specific movement rules
    if (!ChessCore.#isPieceMoveValid(pos, from, to, fromPiece)) return false;
    
    // Check if move leaves king in check
    const newPos = ChessCore.doMove(pos, from, to);
    return !ChessCore.isWhiteCheck(newPos);
  }

  /**
   * Check if a piece's movement is valid according to chess rules
   * @param {Object} pos - Position object
   * @param {Object} from - Source square
   * @param {Object} to - Target square
   * @param {string} piece - Moving piece
   * @returns {boolean} True if piece movement is valid
   * @private
   */
  static #isPieceMoveValid(pos, from, to, piece) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    
    switch (piece) {
      case 'P': // Pawn
        const isEnpassant = pos.e != null && to.x === pos.e[0] && to.y === pos.e[1];
        return (
          // Forward one square
          (dx === 0 && dy === -1 && pos.b[to.x][to.y] === '-') ||
          // Forward two squares from starting position
          (dx === 0 && from.y === 6 && to.y === 4 && pos.b[to.x][to.y] === '-' && pos.b[to.x][5] === '-') ||
          // Diagonal capture
          (absDx === 1 && dy === -1 && (pos.b[to.x][to.y] !== '-' || isEnpassant))
        );
        
      case 'N': // Knight
        return (absDx === 2 && absDy === 1) || (absDx === 1 && absDy === 2);
        
      case 'B': // Bishop
        return absDx === absDy && absDx > 0 && ChessCore.#isPathClear(pos, from, to);
        
      case 'R': // Rook
        return (dx === 0 || dy === 0) && (absDx + absDy > 0) && ChessCore.#isPathClear(pos, from, to);
        
      case 'Q': // Queen
        return ((dx === 0 || dy === 0) || (absDx === absDy)) && (absDx + absDy > 0) && ChessCore.#isPathClear(pos, from, to);
        
      case 'K': // King
        if (absDx <= 1 && absDy <= 1) return true; // Normal king move
        
        // Castling
        if (dy === 0 && absDx === 2 && from.y === 7) {
          const isKingside = to.x > from.x;
          const canCastle = isKingside ? pos.c[0] : pos.c[1];
          const rookX = isKingside ? 7 : 0;
          const hasRook = pos.b[rookX][7] === 'R';
          const pathClear = ChessCore.#isPathClear(pos, from, { x: rookX, y: 7 });
          
          // Check if king or path is under attack
          if (canCastle && hasRook && pathClear) {
            for (let x = Math.min(from.x, to.x); x <= Math.max(from.x, to.x); x++) {
              if (ChessCore.#isSquareAttackedByBlack(pos, x, 7)) return false;
            }
            return true;
          }
        }
        return false;
        
      default:
        return false;
    }
  }

  /**
   * Check if path between squares is clear
   * @param {Object} pos - Position object
   * @param {Object} from - Source square
   * @param {Object} to - Target square
   * @returns {boolean} True if path is clear
   * @private
   */
  static #isPathClear(pos, from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    const stepX = dx === 0 ? 0 : dx / Math.abs(dx);
    const stepY = dy === 0 ? 0 : dy / Math.abs(dy);
    
    for (let i = 1; i < steps; i++) {
      const x = from.x + i * stepX;
      const y = from.y + i * stepY;
      if (pos.b[x][y] !== '-') return false;
    }
    
    return true;
  }

  /**
   * Generate all legal moves for a position
   * @param {Object} pos - Position object
   * @returns {Array} Array of move objects
   */
  static generateMoves(pos) {
    const moves = [];
    
    for (let x1 = 0; x1 < 8; x1++) {
      for (let y1 = 0; y1 < 8; y1++) {
        for (let x2 = 0; x2 < 8; x2++) {
          for (let y2 = 0; y2 < 8; y2++) {
            if (ChessCore.isLegal(pos, { x: x1, y: y1 }, { x: x2, y: y2 })) {
              const piece = pos.b[x1][y1].toUpperCase();
              
              // Handle pawn promotion
              if ((y2 === 0 || y2 === 7) && piece === 'P') {
                ['N', 'B', 'R', 'Q'].forEach(promotion => {
                  moves.push({
                    from: { x: x1, y: y1 },
                    to: { x: x2, y: y2 },
                    p: promotion
                  });
                });
              } else {
                moves.push({
                  from: { x: x1, y: y1 },
                  to: { x: x2, y: y2 },
                  p: null
                });
              }
            }
          }
        }
      }
    }
    
    return moves;
  }

  /**
   * Convert a move to Standard Algebraic Notation (SAN)
   * @param {Object} pos - Position object
   * @param {Object} move - Move object with from, to, and optional promotion
   * @param {Array} moves - Array of all legal moves (for disambiguation)
   * @returns {string} SAN notation string
   */
  static moveToSAN(pos, move, moves) {
    const piece = pos.b[move.from.x][move.from.y].toUpperCase();
    
    // Castling
    if (piece === 'K' && move.from.x === 4) {
      if (move.to.x === 6) return 'O-O';
      if (move.to.x === 2) return 'O-O-O';
    }
    
    // Validate move structure
    if (!pos.b || 
        typeof pos.b[move.from.x] === 'undefined' ||
        typeof pos.b[move.from.x][move.from.y] === 'undefined') {
      return '';
    }
    
    let san = '';
    
    // Add piece letter (except for pawns)
    if (piece !== 'P') {
      // Check for ambiguity
      let ambiguousCount = 0;
      let sameFile = 0;
      let sameRank = 0;
      
      for (const otherMove of moves) {
        if (pos.b[otherMove.from.x][otherMove.from.y] === pos.b[move.from.x][move.from.y] &&
            (otherMove.from.x !== move.from.x || otherMove.from.y !== move.from.y) &&
            otherMove.to.x === move.to.x && otherMove.to.y === move.to.y) {
          ambiguousCount++;
          if (otherMove.from.x === move.from.x) sameFile++;
          if (otherMove.from.y === move.from.y) sameRank++;
        }
      }
      
      san += piece;
      
      // Add disambiguation
      if (ambiguousCount > 0) {
        if (sameFile > 0 && sameRank > 0) {
          san += 'abcdefgh'[move.from.x] + '87654321'[move.from.y];
        } else if (sameFile > 0) {
          san += '87654321'[move.from.y];
        } else {
          san += 'abcdefgh'[move.from.x];
        }
      }
    }
    
    // Check for capture
    const isCapture = pos.b[move.to.x][move.to.y] !== '-' || 
      (piece === 'P' && pos.e && move.to.x === pos.e[0] && move.to.y === pos.e[1]);
    
    // For pawn captures, add file
    if (piece === 'P' && isCapture) {
      san += 'abcdefgh'[move.from.x];
    }
    
    // Add capture symbol
    if (isCapture) {
      san += 'x';
    }
    
    // Add destination square
    san += 'abcdefgh'[move.to.x] + '87654321'[move.to.y];
    
    // Add promotion
    if (piece === 'P' && (move.to.y === 0 || move.to.y === 7)) {
      san += '=' + (move.p || 'Q');
    }
    
    // Check for check/checkmate
    const newPos = ChessCore.doMove(pos, move.from, move.to, move.p);
    const isInCheck = ChessCore.isWhiteCheck(newPos) || 
      (!newPos.w && ChessCore.isWhiteCheck(ChessCore.colorflip(newPos)));
    
    if (isInCheck) {
      const nextMoves = ChessCore.generateMoves(newPos);
      if (nextMoves.length === 0) {
        san += '#'; // Checkmate
      } else {
        san += '+'; // Check
      }
    } else {
      // Check for stalemate
      const nextMoves = ChessCore.generateMoves(newPos);
      if (nextMoves.length === 0) {
        san += ' (stalemate)';
      }
    }
    
    return san;
  }

  /**
   * Validate chess position and return error messages
   * @param {Object} pos - Position object
   * @returns {Array} Array of error message strings
   */
  static validatePosition(pos) {
    const errors = [];
    let whiteKings = 0, blackKings = 0;
    let whitePawns = 0, blackPawns = 0;
    let whitePawnsOnBackRank = 0, blackPawnsOnBackRank = 0;
    let whiteKnights = 0, blackKnights = 0;
    let whiteBishopsLight = 0, whiteBishopsDark = 0;
    let blackBishopsLight = 0, blackBishopsDark = 0;
    let whiteRooks = 0, blackRooks = 0;
    let whiteQueens = 0, blackQueens = 0;
    
    // Count pieces and check for invalid positions
    for (let x = 0; x < 8; x++) {
      for (let y = 0; y < 8; y++) {
        const piece = pos.b[x][y];
        const isLightSquare = (x + y) % 2 === 0;
        
        switch (piece) {
          case 'K': whiteKings++; break;
          case 'k': blackKings++; break;
          case 'P': 
            whitePawns++;
            if (y === 0 || y === 7) whitePawnsOnBackRank++;
            break;
          case 'p': 
            blackPawns++;
            if (y === 0 || y === 7) blackPawnsOnBackRank++;
            break;
          case 'N': whiteKnights++; break;
          case 'n': blackKnights++; break;
          case 'B': 
            if (isLightSquare) whiteBishopsLight++;
            else whiteBishopsDark++;
            break;
          case 'b': 
            if (isLightSquare) blackBishopsLight++;
            else blackBishopsDark++;
            break;
          case 'R': whiteRooks++; break;
          case 'r': blackRooks++; break;
          case 'Q': whiteQueens++; break;
          case 'q': blackQueens++; break;
        }
      }
    }
    
    // Validate piece counts
    if (whiteKings === 0) errors.push('Missing white king');
    if (blackKings === 0) errors.push('Missing black king');
    if (whiteKings > 1) errors.push('Too many white kings');
    if (blackKings > 1) errors.push('Too many black kings');
    
    if (whitePawnsOnBackRank > 0) errors.push('White pawn(s) on back rank');
    if (blackPawnsOnBackRank > 0) errors.push('Black pawn(s) on back rank');
    
    if (whitePawns > 8) errors.push('Too many white pawns');
    if (blackPawns > 8) errors.push('Too many black pawns');
    
    // Check for impossible piece counts (considering promotions)
    const whitePromotions = Math.max(0, (whiteQueens - 1) + whiteRooks + whiteBishopsLight + whiteBishopsDark + whiteKnights - 7);
    const blackPromotions = Math.max(0, (blackQueens - 1) + blackRooks + blackBishopsLight + blackBishopsDark + blackKnights - 7);
    
    if (whitePawns + whitePromotions > 8) errors.push('Impossible white piece count');
    if (blackPawns + blackPromotions > 8) errors.push('Impossible black piece count');
    
    // Check for kings in check when it's not their turn
    if (pos.w && ChessCore.isWhiteCheck(ChessCore.colorflip(pos))) {
      errors.push("It's white's turn but black king is in check");
    }
    if (!pos.w && ChessCore.isWhiteCheck(pos)) {
      errors.push("It's black's turn but white king is in check");
    }
    
    // Validate en passant square
    if (pos.e !== null) {
      const [ex, ey] = pos.e;
      // En passant square should be on rank 3 (ey=5) when it's black's turn (after white pawn move)
      // En passant square should be on rank 6 (ey=2) when it's white's turn (after black pawn move)
      if ((ey !== 2 && ey !== 5) || (ey === 2 && !pos.w) || (ey === 5 && pos.w)) {
        errors.push('En passant square is inconsistent with turn');
      }
    }
    
    // Validate castling rights
    if (pos.c[0] && (pos.b[7][7] !== 'R' || pos.b[4][7] !== 'K')) {
      errors.push('White has kingside castling rights but king or rook not in starting position');
    }
    if (pos.c[1] && (pos.b[0][7] !== 'R' || pos.b[4][7] !== 'K')) {
      errors.push('White has queenside castling rights but king or rook not in starting position');
    }
    if (pos.c[2] && (pos.b[7][0] !== 'r' || pos.b[4][0] !== 'k')) {
      errors.push('Black has kingside castling rights but king or rook not in starting position');
    }
    if (pos.c[3] && (pos.b[0][0] !== 'r' || pos.b[4][0] !== 'k')) {
      errors.push('Black has queenside castling rights but king or rook not in starting position');
    }
    
    return errors;
  }

  /**
   * Parse move from algebraic notation
   * @param {Object} pos - Position object
   * @param {string} moveString - Move in algebraic notation
   * @returns {Object|null} Move object or null if invalid
   */
  static parseMove(pos, moveString) {
    let s = moveString.trim();
    let promotion = null;
    
    // Remove check/checkmate indicators and other decorations
    s = s.replace(/[\+|#|\?|!|x]/g, '');
    
    // Handle promotion notation
    if (s.length >= 2 && s[s.length - 2] === '=') {
      promotion = s[s.length - 1];
      s = s.substring(0, s.length - 2);
    } else if (s.length >= 3 && 'NBRQ'.includes(s[s.length - 1])) {
      promotion = s[s.length - 1];
      s = s.substring(0, s.length - 1);
    }
    
    // Handle castling
    if (s === 'O-O' || s === 'O-O-O') {
      return {
        from: { x: 4, y: pos.w ? 7 : 0 },
        to: { x: s === 'O-O' ? 6 : 2, y: pos.w ? 7 : 0 },
        p: promotion
      };
    }
    
    // Parse regular moves
    if (s.length < 2) return null;
    
    const toFile = s[s.length - 2];
    const toRank = s[s.length - 1];
    const xto = 'abcdefgh'.indexOf(toFile);
    const yto = '87654321'.indexOf(toRank);
    
    if (xto < 0 || yto < 0) return null;
    
    const piece = s.length === 2 ? 'P' : s[0];
    let xfrom = -1, yfrom = -1;
    let candidates = 0;
    
    // Find piece that can make this move
    for (let x = 0; x < 8; x++) {
      for (let y = 0; y < 8; y++) {
        const currentPiece = pos.b[x][y];
        if (currentPiece.toUpperCase() === piece.toUpperCase() && 
            ((pos.w && currentPiece === currentPiece.toUpperCase()) || 
             (!pos.w && currentPiece !== currentPiece.toUpperCase()))) {
          
          if (ChessCore.isLegal(pos, { x, y }, { x: xto, y: yto })) {
            // Check disambiguation
            let matches = true;
            if (s.length === 3) {
              const fromFile = s[1];
              matches = 'abcdefgh'.indexOf(fromFile) === x;
            } else if (s.length === 4) {
              const fromFile = s[1];
              const fromRank = s[2];
              matches = 'abcdefgh'.indexOf(fromFile) === x && 
                       '87654321'.indexOf(fromRank) === y;
            }
            
            if (matches) {
              if (candidates === 0) {
                xfrom = x;
                yfrom = y;
                candidates = 1;
              } else {
                // Ambiguous move
                return null;
              }
            }
          }
        }
      }
    }
    
    if (xfrom < 0 || yfrom < 0) return null;
    
    return {
      from: { x: xfrom, y: yfrom },
      to: { x: xto, y: yto },
      p: promotion
    };
  }
}

// Legacy function exports for backward compatibility
export const bounds = ChessCore.bounds;
export const board = ChessCore.board;
export const colorflip = ChessCore.colorflip;
export const sum = ChessCore.sum;
export const parseMoveNumber = ChessCore.parseMoveNumber;
export const parseFEN = ChessCore.parseFEN;
export const generateFEN = ChessCore.generateFEN;
export const isWhiteCheck = ChessCore.isWhiteCheck;
export const doMove = ChessCore.doMove;
export const isLegal = ChessCore.isLegal;
export const genMoves = ChessCore.generateMoves;
export const sanMove = ChessCore.moveToSAN;
export const checkPosition = ChessCore.validatePosition;
export const parseMove = ChessCore.parseMove;

// Export the main class as default
export default ChessCore;
