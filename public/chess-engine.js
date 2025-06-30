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
   * @param {Function} onReady - Callback when engine is ready
   * @returns {ChessEngine}
   */
  static getAnalysisEngine(onReady = null) {
    if (!ChessEngine.#analysisInstance) {
      ChessEngine.#analysisInstance = new ChessEngine(onReady);
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
    // Send UCI initialization commands
    this.send('uci', (data) => {
      if (data.includes('uciok')) {
        this.send('setoption name Hash value 128');
        this.send('setoption name Threads value 1');
        this.send('setoption name UCI_Chess960 value false');
        this.send('isready', (readyData) => {
          if (readyData.includes('readyok')) {
            this.#ready = true;
            if (this.#onReadyCallback) {
              this.#onReadyCallback(this);
            }
          }
        });
      }
    });
  }

  /**
   * Send UCI command to engine
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

      this.#fen = fen;
      let evaluation = {
        score: null,
        depth: 0,
        nodes: 0,
        bestMove: null,
        pv: []
      };

      this.send(`position fen ${fen}`);
      this.send(`go depth ${this.#depth}`, (data) => {
        if (data.includes('info')) {
          // Parse evaluation info
          const scoreMatch = data.match(/score cp (-?\d+)/);
          const depthMatch = data.match(/depth (\d+)/);
          const nodesMatch = data.match(/nodes (\d+)/);
          const pvMatch = data.match(/pv (.+)/);

          if (scoreMatch) evaluation.score = parseInt(scoreMatch[1]);
          if (depthMatch) evaluation.depth = parseInt(depthMatch[1]);
          if (nodesMatch) evaluation.nodes = parseInt(nodesMatch[1]);
          if (pvMatch) evaluation.pv = pvMatch[1].split(' ');

          if (onProgress) onProgress(evaluation);
        }

        if (data.includes('bestmove')) {
          const bestMoveMatch = data.match(/bestmove (\w+)/);
          if (bestMoveMatch) {
            evaluation.bestMove = bestMoveMatch[1];
          }
          
          if (onComplete) onComplete(evaluation);
          resolve(evaluation);
        }
      });
    });
  }

  /**
   * Stop current evaluation
   */
  stop() {
    if (this.#worker && this.#ready) {
      this.send('stop');
    }
  }

  /**
   * Terminate the engine worker
   */
  terminate() {
    if (this.#worker) {
      this.#worker.terminate();
      this.#worker = null;
      this.#ready = false;
    }
  }

  // Getters for backward compatibility
  get ready() { return this.#ready; }
  get kill() { return this.#kill; }
  get waiting() { return this.#waiting; }
  get depth() { return this.#depth; }
  get lastNodes() { return this.#lastNodes; }
  get fen() { return this.#fen; }
  get score() { return this.#score; }

  // Setters for backward compatibility
  set kill(value) { this.#kill = value; }
  set waiting(value) { this.#waiting = value; }
  set depth(value) { this.#depth = value; }
  set lastNodes(value) { this.#lastNodes = value; }
  set fen(value) { this.#fen = value; }
  set score(value) { this.#score = value; }
}

/**
 * Computer Move Manager for future expansion
 */
export class ComputerMoveManager {
  static #instance = null;

  static getInstance() {
    if (!ComputerMoveManager.#instance) {
      ComputerMoveManager.#instance = new ComputerMoveManager();
    }
    return ComputerMoveManager.#instance;
  }

  async calculateMove(fen, difficulty = 'normal') {
    const engine = ChessEngine.getPlayEngine();
    if (!engine.ready) {
      throw new Error('Chess engine not ready');
    }

    return engine.evaluate(fen);
  }
}

// Legacy compatibility layer
let _legacyAnalysisEngine = null;
let _legacyPlayEngine = null;

/**
 * Create a legacy wrapper object for backward compatibility
 * @param {ChessEngine} engine - Modern engine instance
 * @returns {Object} Legacy-compatible engine object
 * @private
 */
function createLegacyWrapper(engine) {
  const wrapper = {
    get ready() { return engine.ready; },
    get kill() { return engine.kill; },
    set kill(value) { engine.kill = value; },
    get waiting() { return engine.waiting; },
    set waiting(value) { engine.waiting = value; },
    get depth() { return engine.depth; },
    set depth(value) { engine.depth = value; },
    get lastNodes() { return engine.lastNodes; },
    set lastNodes(value) { engine.lastNodes = value; },
    get fen() { return engine.fen; },
    set fen(value) { engine.fen = value; },
    score: null, // This will be updated by evaluate
    send: (command, handler) => engine.send(command, handler),
    stop: () => engine.stop(),
    terminate: () => engine.terminate(),
    
    // Legacy evaluate method that mimics the old behavior
    evaluate: (fen, onComplete, onProgress) => {
      wrapper.score = null;
      
      engine.send(`position fen ${fen}`);
      engine.send(`go depth ${engine.depth}`, (data) => {
        if (data.includes('info')) {
          // Parse evaluation info and update wrapper properties
          const scoreMatch = data.match(/score cp (-?\d+)/);
          const mateMatch = data.match(/score mate (-?\d+)/);
          const depthMatch = data.match(/depth (\d+)/);
          const nodesMatch = data.match(/nodes (\d+)/);
          const pvMatch = data.match(/pv (.+)/);

          if (scoreMatch) {
            wrapper.score = parseInt(scoreMatch[1]);
          } else if (mateMatch) {
            // Convert mate in X to a high score
            const mateIn = parseInt(mateMatch[1]);
            wrapper.score = mateIn > 0 ? (1000000 - Math.abs(mateIn)) : -(1000000 - Math.abs(mateIn));
          }
          
          if (depthMatch) {
            // Don't override the engine's global depth setting
            const infoDepth = parseInt(depthMatch[1]);
          }
          if (nodesMatch) {
            engine.lastNodes = parseInt(nodesMatch[1]);
          }

          // Call the info callback with legacy format if provided
          if (onProgress && (scoreMatch || mateMatch) && depthMatch && pvMatch) {
            const score = wrapper.score;
            const depth = parseInt(depthMatch[1]);
            const pv = pvMatch[1].split(' ');
            onProgress(depth, score, pv);
          }
        }

        if (data.includes('bestmove')) {
          // Call completion callback with raw engine response for legacy parsing
          if (onComplete) {
            onComplete(data);
          }
        }
      });
    }
  };
  
  return wrapper;
}

/**
 * Legacy loadEngine function for backward compatibility
 * @param {Function} onReady - Callback when engine is ready
 * @returns {Object} Legacy engine object
 * @deprecated Use ChessEngine class instead
 */
export function loadEngine(onReady = null) {
  if (onReady) {
    // Check if this should be a play engine or analysis engine
    // If _legacyAnalysisEngine doesn't exist, this is the analysis engine
    if (!_legacyAnalysisEngine) {
      // This is for the analysis engine
      _legacyAnalysisEngine = ChessEngine.getAnalysisEngine(onReady);
      return createLegacyWrapper(_legacyAnalysisEngine);
    } else {
      // This is for the play engine
      _legacyPlayEngine = ChessEngine.getPlayEngine(onReady);
      return createLegacyWrapper(_legacyPlayEngine);
    }
  } else {
    // This is for the analysis engine (legacy call without callback)
    _legacyAnalysisEngine = ChessEngine.getAnalysisEngine();
    return createLegacyWrapper(_legacyAnalysisEngine);
  }
}

/**
 * Parse best move from UCI engine response
 * @param {string} moveString - UCI move string
 * @returns {Object|null} Parsed move object
 */
export function parseBestMove(moveString) {
  if (!moveString || typeof moveString !== 'string') {
    return null;
  }

  const cleanMove = moveString.trim();
  if (cleanMove.length < 4) {
    return null;
  }

  const from = {
    x: cleanMove.charCodeAt(0) - 97, // a-h to 0-7
    y: 8 - parseInt(cleanMove[1])     // 1-8 to 7-0
  };

  const to = {
    x: cleanMove.charCodeAt(2) - 97, // a-h to 0-7  
    y: 8 - parseInt(cleanMove[3])     // 1-8 to 7-0
  };

  // Check for promotion
  let promotion = null;
  if (cleanMove.length > 4) {
    promotion = cleanMove[4];
  }

  return {
    from: from,
    to: to,
    p: promotion
  };
}

/**
 * Add evaluation data to history
 * @param {Array} history - Game history array
 * @param {number} index - History index
 * @param {number} score - Evaluation score
 * @param {number} depth - Search depth
 * @param {Object} move - Move object
 * @returns {boolean} Whether history was updated
 */
export function addHistoryEval(history, index, score, depth, move) {
  if (!history || index < 0 || index >= history.length) {
    return false;
  }

  const historyEntry = history[index];
  if (!historyEntry) {
    return false;
  }

  // Ensure we have at least 4 elements: [fen, evalData, move, san]
  while (historyEntry.length < 4) {
    historyEntry.push(null);
  }

  // Initialize or update evaluation data object at index [1]
  if (!historyEntry[1]) {
    historyEntry[1] = {};
  }

  // Store evaluation data in the evaluation data object
  if (score !== null) {
    historyEntry[1].score = score;
    // Determine if this is from black's perspective
    // This is a simple heuristic - you might need to adjust based on your FEN parsing
    const fen = historyEntry[0];
    const fenParts = fen ? fen.split(' ') : [];
    historyEntry[1].black = fenParts.length > 1 && fenParts[1] === 'b';
  }
  
  if (depth !== null) {
    historyEntry[1].depth = depth;
  }

  // Don't overwrite the move object if it already exists and we're not providing a new one
  if (move && (!historyEntry[2] || !historyEntry[2].from)) {
    historyEntry[2] = move;
  }

  return true;
}
