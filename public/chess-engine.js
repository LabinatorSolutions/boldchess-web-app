/**
 * Chess Engine Module for BoldChess Web App
 * ES2024 compliant with modern architecture
 * 
 * This module encapsulates all Stockfish engine interaction and management,
 * providing a clean, modern interface for chess engine operations.
 */

import { ENGINE_CONFIG } from './constants.js';

/**
 * Modern Chess Engine class with ES2024 features
 */
export class ChessEngine {
  // Private static instances for singleton-like behavior
  static #analysisInstance = null;
  static #playInstance = null;
  
  // Private instance fields
  #worker = null;
  #ready = false;
  #kill = false;
  #waiting = true;
  #depth = ENGINE_CONFIG.DEFAULT_DEPTH;
  #lastNodes = 0;
  #fen = null;
  #score = null;
  #messageHandler = null;
  #onReadyCallback = null;

  /**
   * Private constructor - use static factory methods
   * @param {Function} onReady - Callback when engine is ready
   */
  constructor(onReady = null) {
    this.#onReadyCallback = onReady;
    this.#initializeEngine();
  }

  /**
   * Create or get analysis engine instance
   * @returns {ChessEngine}
   */
  static getAnalysisEngine() {
    if (!ChessEngine.#analysisInstance) {
      ChessEngine.#analysisInstance = new ChessEngine();
    }
    return ChessEngine.#analysisInstance;
  }

  /**
   * Create or get play engine instance
   * @param {Function} onReady - Callback when engine is ready
   * @returns {ChessEngine}
   */
  static getPlayEngine(onReady = null) {
    if (!ChessEngine.#playInstance) {
      ChessEngine.#playInstance = new ChessEngine(onReady);
    }
    return ChessEngine.#playInstance;
  }

  /**
   * Initialize the Stockfish worker
   * @private
   */
  #initializeEngine() {
    // Check WebAssembly support
    const wasmSupported = typeof WebAssembly === 'object' && 
      WebAssembly.validate(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));
    
    if (typeof Worker === 'undefined') {
      console.warn('Web Workers not supported');
      return;
    }

    try {
      this.#worker = new Worker('./engine/stockfish-16.1.js');
      this.#setupWorkerEventHandlers();
      this.#initializeUCI();
    } catch (error) {
      console.error('Failed to load chess engine:', error);
    }
  }

  /**
   * Set up worker event handlers
   * @private
   */
  #setupWorkerEventHandlers() {
    this.#worker.onmessage = (event) => {
      if (this.#messageHandler) {
        this.#messageHandler(event.data);
      }
    };

    this.#worker.onerror = (error) => {
      console.error('Chess engine worker error:', error);
    };
  }

  /**
   * Initialize UCI protocol
   * @private
   */
  #initializeUCI() {
    this.send('uci', (response) => {
      if (response === 'uciok') {
        this.send('isready', (readyResponse) => {
          if (readyResponse === 'readyok') {
            this.#ready = true;
            this.send(`setoption name EvalFile value ${ENGINE_CONFIG.NNUE_PATH}`);
            
            if (this.#onReadyCallback) {
              this.#onReadyCallback(this);
            }
          }
        });
      }
    });
  }

  /**
   * Send command to engine
   * @param {string} command - UCI command
   * @param {Function} messageHandler - Response handler
   */
  send(command, messageHandler = null) {
    if (!this.#worker) {
      console.warn('Engine worker not available');
      return;
    }

    const cmd = String(command).trim();
    this.#messageHandler = messageHandler;
    this.#worker.postMessage(cmd);
  }

  /**
   * Evaluate a chess position
   * @param {string} fen - FEN position string
   * @param {Function} onComplete - Callback when evaluation is complete
   * @param {Function} onProgress - Callback for evaluation progress updates
   * @returns {Promise<Object>} Evaluation result
   */
  async evaluate(fen, onComplete = null, onProgress = null) {
    return new Promise((resolve, reject) => {
      if (!this.#ready) {
        reject(new Error('Engine not ready'));
        return;
      }

      this.send(`position fen ${fen}`);
      this.send(`go depth ${this.#depth}`, (response) => {
        const progressMatch = response.match(/depth (\d+) .*score (cp|mate) ([-\d]+) .*nodes (\d+) .*pv (.+)/);
        const simpleMatch = response.match(/depth (\d+) .*score (cp|mate) ([-\d]+).*/);
        
        if (progressMatch || simpleMatch) {
          const matches = progressMatch || simpleMatch;
          
          // Reset tracking on new position
          if (this.#lastNodes === 0) this.#fen = fen;
          
          // Handle node count for position tracking
          if (matches.length > 4) {
            const nodes = Number(matches[4]);
            if (nodes < this.#lastNodes) this.#fen = fen;
            this.#lastNodes = nodes;
          }

          const depth = Number(matches[1]);
          const scoreType = matches[2];
          let score = Number(matches[3]);
          
          // Convert mate scores
          if (scoreType === 'mate') {
            score = (1000000 - Math.abs(score)) * (score <= 0 ? -1 : 1);
          }
          
          this.#score = score;

          // Handle principal variation
          if (matches.length > 5 && onProgress && this.#fen === fen) {
            const pv = matches[5].split(' ');
            onProgress(depth, score, pv);
          }
        }

        // Check for completion
        if (response.includes('bestmove') || response.includes('mate 0') || response === 'info depth 0 score cp 0') {
          if (this.#fen === fen) {
            const result = {
              bestmove: this.#extractBestMove(response),
              score: this.#score,
              depth: this.#depth,
              fen: fen
            };
            
            if (onComplete) onComplete(response);
            resolve(result);
            this.#lastNodes = 0;
          }
        }
      });
    });
  }

  /**
   * Extract best move from engine response
   * @param {string} response - Engine response
   * @returns {Object|null} Parsed move object
   * @private
   */
  #extractBestMove(response) {
    const matches = response.match(/^bestmove\s(\S+)(?:\sponder\s(\S+))?/);
    if (matches && matches.length > 1) {
      return this.#parseBestMove(matches[1]);
    }
    return null;
  }

  /**
   * Parse UCI move notation to move object
   * @param {string} moveString - UCI move string (e.g., 'e2e4')
   * @returns {Object|null} Move object with from, to, and optional promotion
   * @private
   */
  #parseBestMove(moveString) {
    if (!moveString || moveString.length < 4) return null;

    const from = {
      x: 'abcdefgh'.indexOf(moveString[0]),
      y: '87654321'.indexOf(moveString[1])
    };

    const to = {
      x: 'abcdefgh'.indexOf(moveString[2]),
      y: '87654321'.indexOf(moveString[3])
    };

    // Handle promotion
    if (moveString.length > 4) {
      const promotionIndex = 'nbrq'.indexOf(moveString[4]);
      if (promotionIndex >= 0) {
        return {
          from,
          to,
          p: 'NBRQ'[promotionIndex]
        };
      }
    }

    return { from, to };
  }

  /**
   * Configure engine with UCI options
   * @param {string} option - Option name
   * @param {string|number} value - Option value
   */
  setOption(option, value) {
    this.send(`setoption name ${option} value ${value}`);
  }

  /**
   * Set engine skill level
   * @param {number} level - Skill level (0-20)
   */
  setSkillLevel(level) {
    this.setOption('Skill Level', Math.max(0, Math.min(20, level)));
  }

  /**
   * Configure UCI Elo rating
   * @param {number} rating - ELO rating
   */
  setEloRating(rating) {
    this.setOption('UCI_LimitStrength', 'true');
    this.setOption('UCI_Elo', rating);
  }

  /**
   * Stop current analysis
   */
  stop() {
    this.send('stop');
  }

  /**
   * Start new game
   */
  newGame() {
    this.send('ucinewgame');
    this.#lastNodes = 0;
    this.#score = null;
    this.#fen = null;
  }

  /**
   * Kill the engine
   */
  destroy() {
    this.#kill = true;
    if (this.#worker) {
      this.#worker.terminate();
      this.#worker = null;
    }
    this.#ready = false;
  }

  // Getters
  get ready() { return this.#ready; }
  get kill() { return this.#kill; }
  get waiting() { return this.#waiting; }
  get depth() { return this.#depth; }
  get score() { return this.#score; }
  get lastNodes() { return this.#lastNodes; }

  // Setters
  set kill(value) { this.#kill = value; }
  set waiting(value) { this.#waiting = value; }
  set depth(value) { 
    this.#depth = Math.max(ENGINE_CONFIG.MIN_DEPTH, Math.min(ENGINE_CONFIG.MAX_DEPTH, value));
  }
  set score(value) { this.#score = value; }
}

/**
 * Legacy function compatibility layer
 * These will be gradually replaced with direct class usage
 */

// Global engine instances (for backward compatibility)
let _legacyAnalysisEngine = null;
let _legacyPlayEngine = null;

/**
 * Legacy loadEngine function - use ChessEngine.getAnalysisEngine() or ChessEngine.getPlayEngine() instead
 * @param {Function} onReady - Callback when engine is ready
 * @returns {Object} Legacy engine object
 * @deprecated Use ChessEngine class instead
 */
export function loadEngine(onReady = null) {
  if (onReady) {
    // This is for the play engine
    _legacyPlayEngine = ChessEngine.getPlayEngine(onReady);
    return createLegacyWrapper(_legacyPlayEngine);
  } else {
    // This is for the analysis engine
    _legacyAnalysisEngine = ChessEngine.getAnalysisEngine();
    return createLegacyWrapper(_legacyAnalysisEngine);
  }
}

/**
 * Create a legacy wrapper object for backward compatibility
 * @param {ChessEngine} engine - Modern engine instance
 * @returns {Object} Legacy-compatible engine object
 * @private
 */
function createLegacyWrapper(engine) {
  return {
    get ready() { return engine.ready; },
    get kill() { return engine.kill; },
    get waiting() { return engine.waiting; },
    get depth() { return engine.depth; },
    get score() { return engine.score; },
    get lastnodes() { return engine.lastNodes; },
    
    set kill(value) { engine.kill = value; },
    set waiting(value) { engine.waiting = value; },
    set depth(value) { engine.depth = value; },
    set score(value) { engine.score = value; },

    send: (cmd, handler) => engine.send(cmd, handler),
    evaluate: (fen, done, info) => engine.evaluate(fen, done, info)
  };
}

/**
 * Parse UCI move notation - standalone utility function
 * @param {string} moveString - UCI move string (e.g., 'e2e4')
 * @returns {Object|null} Move object with from, to, and optional promotion
 */
export function parseBestMove(moveString) {
  if (!moveString || moveString.length < 4) return null;

  const from = {
    x: 'abcdefgh'.indexOf(moveString[0]),
    y: '87654321'.indexOf(moveString[1])
  };

  const to = {
    x: 'abcdefgh'.indexOf(moveString[2]),
    y: '87654321'.indexOf(moveString[3])
  };

  // Handle promotion
  if (moveString.length > 4) {
    const promotionIndex = 'nbrq'.indexOf(moveString[4]);
    if (promotionIndex >= 0) {
      return {
        from,
        to,
        p: 'NBRQ'[promotionIndex]
      };
    }
  }

  return { from, to };
}

// Export the main class as default
export default ChessEngine;

/**
 * Computer move handling and evaluation utilities
 * These functions bridge the engine with the game state
 */

/**
 * Add evaluation to history entry
 * @param {Array} history - Game history array
 * @param {number} index - History index
 * @param {number} score - Evaluation score
 * @param {number} depth - Search depth
 * @param {Object} move - Move object
 */
export function addHistoryEval(history, index, score, depth, move) {
  if (!history[index] || history[index].length < 2 || 
      !history[index][1] || history[index][1].depth < depth) {
    
    const isBlackToMove = history[index][0].includes(' b ');
    const evaluationInfo = { 
      score, 
      depth, 
      black: isBlackToMove, 
      move 
    };
    
    if (history[index].length >= 2) {
      history[index][1] = evaluationInfo;
    } else {
      history[index].push(evaluationInfo);
      history[index].push(null);
    }
    
    return true; // Indicates history was updated
  }
  return false;
}

/**
 * Computer move manager class
 */
export class ComputerMoveManager {
  #playEngine = null;
  #isPlayerWhite = true;
  #gameMode = null;
  #getCurrentFEN = null;
  #setCurrentFEN = null;
  #historyAdd = null;
  #parseFEN = null;
  #doMove = null;
  #generateFEN = null;
  #sanMove = null;
  #genMoves = null;
  #showBoard = null;
  #updateTooltip = null;

  /**
   * Initialize computer move manager
   * @param {Object} dependencies - Required game functions
   */
  constructor(dependencies) {
    this.#getCurrentFEN = dependencies.getCurrentFEN;
    this.#setCurrentFEN = dependencies.setCurrentFEN;
    this.#historyAdd = dependencies.historyAdd;
    this.#parseFEN = dependencies.parseFEN;
    this.#doMove = dependencies.doMove;
    this.#generateFEN = dependencies.generateFEN;
    this.#sanMove = dependencies.sanMove;
    this.#genMoves = dependencies.genMoves;
    this.#showBoard = dependencies.showBoard;
    this.#updateTooltip = dependencies.updateTooltip;
  }

  /**
   * Set the play engine instance
   * @param {ChessEngine} engine - Engine instance
   */
  setEngine(engine) {
    this.#playEngine = engine;
  }

  /**
   * Set game state
   * @param {boolean} isPlayerWhite - Whether player is white
   * @param {number} gameMode - Current game mode
   */
  setGameState(isPlayerWhite, gameMode) {
    this.#isPlayerWhite = isPlayerWhite;
    this.#gameMode = gameMode;
  }

  /**
   * Execute computer move
   * @returns {Promise<boolean>} Success status
   */
  async executeComputerMove() {
    if (this.#gameMode === null) return false;
    
    const fen = this.#getCurrentFEN();
    
    // Check if it's the computer's turn
    if (this.#isPlayerWhite && fen.includes(' w ')) return false;
    if (!this.#isPlayerWhite && fen.includes(' b ')) return false;

    // Wait for engine to be ready
    if (!this.#playEngine || !this.#playEngine.ready) {
      setTimeout(() => this.executeComputerMove(), 100);
      return false;
    }

    // Handle engine busy state
    if (!this.#playEngine.waiting) {
      this.#playEngine.kill = true;
      setTimeout(() => this.executeComputerMove(), 50);
      return false;
    }

    try {
      // Prepare engine for new move
      this.#playEngine.kill = false;
      this.#playEngine.waiting = false;
      this.#playEngine.stop();
      this.#playEngine.newGame();
      this.#playEngine.score = null;

      // Get computer move
      const result = await this.#playEngine.evaluate(fen);
      this.#playEngine.waiting = true;

      // Verify position hasn't changed
      if (fen !== this.#getCurrentFEN()) return false;

      if (result.bestmove) {
        const move = result.bestmove;
        const fenBeforeMove = this.#getCurrentFEN();
        
        // Apply the computer's move
        const pos = this.#doMove(this.#parseFEN(fenBeforeMove), move.from, move.to, move.p);
        this.#setCurrentFEN(this.#generateFEN(pos));
        
        // Compute SAN notation
        const san = this.#sanMove(this.#parseFEN(fenBeforeMove), move, this.#genMoves(this.#parseFEN(fenBeforeMove)));
        
        // Add to history
        this.#historyAdd(this.#getCurrentFEN(), null, move, san);
        
        // Update UI
        this.#updateTooltip('');
        this.#showBoard(false);
        
        return true;
      }
    } catch (error) {
      console.error('Computer move failed:', error);
      this.#playEngine.waiting = true;
    }

    return false;
  }
}

/**
 * Legacy doComputerMove function for backward compatibility
 * @param {Object} gameState - Game state object
 * @deprecated Use ComputerMoveManager class instead
 */
export function doComputerMove(gameState) {
  // This will be implemented when we integrate with main.js
  console.warn('doComputerMove: Use ComputerMoveManager class for new code');
}
