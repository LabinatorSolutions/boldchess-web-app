/**
 * Constants for BoldChess Web App
 * Extracted from main.js for better organization and ES2024 compliance
 */

// ============================
// Engine Configuration
// ============================

export const ENGINE_CONFIG = {
  // File Paths
  NNUE_PATH: './engine/nn-b1a57edbea57.nnue',
  
  // Engine Depth Constants
  MIN_DEPTH: 1,
  MAX_DEPTH: 28,
  DEFAULT_DEPTH: 12, // Reduced from 18 for faster evaluation
};

// ============================
// Chess Game Configuration
// ============================

export const CHESS_CONFIG = {
  // Default Starting FEN
  START_FEN: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  
  // Player Names
  DEFAULT_WHITE_NAME: 'White',
  DEFAULT_BLACK_NAME: 'Black',
  
  // Default ELO Rating
  DEFAULT_UCI_ELO_RATING: 2200,
};

// ============================
// UI Configuration
// ============================

export const UI_CONFIG = {
  // Static Evaluation Cache
  STATIC_EVAL_CACHE_SIZE: 20,
  
  // Coach Mode
  COACH_MODE_ACTIVE_LABEL: "Active Coach Mode",
  COACH_MODE_INACTIVE_LABEL: "Activate Coach Mode",
  COACH_MODE_DEACTIVATE_LABEL: "Deactivate Coach Mode",
  
  // Promotion
  DEFAULT_PROMOTION_PIECE: 'Q',
  PROMOTION_QUEEN_TEXT: 'Pawn Promotion: Queen',
  PROMOTION_KNIGHT_TEXT: 'Pawn Promotion: Knight',
};

// ============================
// Game Modes
// ============================

export const GAME_MODES = {
  ANALYSIS: 1,
  PLAY_VS_ENGINE: 2,
  EDIT: 3,
};

// ============================
// Board Configuration
// ============================

export const BOARD_CONFIG = {
  // Board dimensions
  BOARD_SIZE: 8,
  SQUARE_SIZE: 40, // pixels
  
  // Board files and ranks
  FILES: 'abcdefgh',
  RANKS: '87654321',
  
  // Colors
  WHITE: 0,
  BLACK: 1,
};

// ============================
// Mouse and Touch Events
// ============================

export const INPUT_CONFIG = {
  // Touch/Mouse tolerance
  DRAG_THRESHOLD: 5, // pixels
  
  // Tooltip offset
  TOOLTIP_OFFSET_Y: 20, // pixels
};

// ============================
// Storage Keys
// ============================

export const STORAGE_KEYS = {
  PROMOTION_PIECE: 'promotionPiece',
  BOARD_THEME: 'boardTheme',
  ENGINE_DEPTH: 'engineDepth',
};

// ============================
// CSS Classes
// ============================

export const CSS_CLASSES = {
  // Board states
  FLIPPED: 'flipped',
  HIGHLIGHTED: 'highlighted',
  SELECTED: 'selected',
  LEGAL_MOVE: 'legal-move',
  
  // UI states
  ACTIVE: 'on',
  INACTIVE: 'off',
  HIDDEN: 'hidden',
  VISIBLE: 'visible',
};

// ============================
// Error Messages
// ============================

export const ERROR_MESSAGES = {
  ENGINE_LOAD_FAILED: 'Failed to load chess engine',
  INVALID_FEN: 'Invalid FEN notation',
  INVALID_MOVE: 'Invalid move',
  WEBASSEMBLY_NOT_SUPPORTED: 'WebAssembly not supported in this browser',
  WORKER_NOT_SUPPORTED: 'Web Workers not supported in this browser',
};

// ============================
// Regular Expressions
// ============================

export const REGEX_PATTERNS = {
  // FEN validation pattern (simplified)
  FEN_PATTERN: /^([rnbqkpRNBQKP1-8]+\/){7}[rnbqkpRNBQKP1-8]+\s[bw]\s(-|[KQkq]+)\s(-|[a-h][36])\s\d+\s\d+$/,
  
  // Move pattern (algebraic notation)
  MOVE_PATTERN: /^[a-h][1-8][a-h][1-8][qrbn]?$/,
  
  // Mobile device detection
  MOBILE_PATTERN: /Android|webOS|iPhone|iPad|iPod|BlackBerry|Windows Phone/i,
};

// ============================
// Animation Configuration
// ============================

export const ANIMATION_CONFIG = {
  // Animation durations (in milliseconds)
  MOVE_DURATION: 200,
  FADE_DURATION: 150,
  TOOLTIP_DELAY: 500,
  
  // Easing functions
  EASE_OUT: 'ease-out',
  EASE_IN_OUT: 'ease-in-out',
};

// ============================
// Performance Configuration
// ============================

export const PERFORMANCE_CONFIG = {
  // Throttling and debouncing
  RESIZE_DEBOUNCE: 250, // milliseconds
  SCROLL_THROTTLE: 16, // milliseconds (~60fps)
  
  // Batch sizes
  MOVE_BATCH_SIZE: 100,
  RENDER_BATCH_SIZE: 50,
};
