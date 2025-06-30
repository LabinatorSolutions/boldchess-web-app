# Chess Board Module Extraction Plan

## 📋 Overview

This document outlines the detailed plan for extracting the Chess Board Module from `main.js` into a dedicated ES2024 module. This is the next critical step in the BoldChess refactoring process.

## 🎯 Objective

Create `public/chess-board.js` - a comprehensive ES2024 module that handles all chess board rendering, display, drag & drop functionality, and board state management.

## 📊 Current Status Analysis

### Main.js Current State
- **Total Lines**: 4,761 lines
- **Completed Modules**: Constants (177), DOM Utils (219), Chess Engine (449), Chess Core (890) = 1,735 lines
- **Target for Chess Board Module**: ~400-600 lines (board rendering, drag & drop, move handling)
- **Expected Reduction**: main.js should go from 4,761 to ~4,200 lines

### Functional Areas in Current main.js
1. ✅ **ES2024 Imports & Global Variables** (lines 1-84)
2. ✅ **Initialization Logic** (lines 85-209)
3. 🎯 **Promotion & Coach Mode Functions** (lines 210-240) - Keep in main.js
4. 🎯 **Search & Command Functions** (lines 241-607) - Keep in main.js for now
5. 🔴 **Tooltip Functions** (lines 608-673) - Extract to Chess Board
6. 🔴 **Board Display & Legal Moves** (lines 674-802) - Extract to Chess Board
7. 🔴 **Arrow System** (lines 803-956) - Extract to Chess Board
8. 🔴 **Board Info & Updates** (lines 957-969) - Extract to Chess Board
9. 🎯 **Move List Functions** (lines 970-1026) - Keep in main.js for now
10. 🎯 **History Functions** (lines 1027-1079) - Keep in main.js for now
11. 🔴 **Mouse & Keyboard Events** (lines 1080-1549) - Extract to Chess Board
12. 🎯 **Evaluation Engine** (lines 1550-1756) - Keep in main.js for now
13. 🎯 **Static Evaluation** (lines 1757-end) - Keep in main.js for now

## 🔴 Functions to Extract to Chess Board Module

### Category 1: Board Rendering & Display (Priority: HIGH)
```javascript
// Board Display Functions
- showBoard() // ~50 lines - Currently missing imports
- showLegalMoves(from) // ~80 lines - Lines 687-766
- updateLegalMoves() // ~40 lines - Lines 766-802
- getEvalText(e, s) // ~10 lines - Lines 678-686

// Board State Management
- Board state synchronization
- Legal move highlighting
- Piece positioning and scaling
```

### Category 2: Mouse & Touch Interaction (Priority: HIGH)
```javascript
// Mouse Event Handlers
- onMouseDown(e) // ~100 lines - Lines ~1100-1200
- onMouseMove(e) // ~80 lines - Lines ~1200-1280  
- onMouseUp(e) // ~100 lines - Lines ~1280-1380
- onWheel(e) // ~30 lines - Lines ~1380-1410

// Drag & Drop System
- dragActivate() // ~40 lines
- doMoveHandler(move, copy) // ~80 lines
- getDragX(x, full) / getDragY(y, full) // ~20 lines each

// Touch Support
- paintMouse(e, p) // ~50 lines
- isEdit() // ~10 lines
- getPaintPiece() / setPaintPiece(newp) // ~20 lines each
```

### Category 3: Arrow Display System (Priority: MEDIUM)
```javascript
// Arrow Management
- setArrow(state) // ~6 lines - Lines 803-809
- repaintLastMoveArrow() // ~17 lines - Lines 809-826
- showArrowInternal(move, wrapperId, opacity) // ~25 lines - Lines 826-851
- showArrow1(move, opacity) // ~9 lines - Lines 851-860
- showArrow2(move) // ~4 lines - Lines 860-864
- showArrow3(move) // ~13 lines - Lines 864-877
- finalArrow3() // ~20 lines - Lines 877-896
```

### Category 4: Tooltip & UI Interaction (Priority: MEDIUM)
```javascript
// Tooltip System
- getClientY(e) // ~6 lines - Lines 612-618
- updateTooltipPos(e) // ~6 lines - Lines 618-624
- updateTooltip(text, answerpv, movenumber, cl, e) // ~54 lines - Lines 624-678

// Board Info Updates
- updateInfo() // ~70 lines - Lines 897-969
- getCurScale() // ~10 lines
- getCircleClassName(index) // Helper function
```

## 🏗️ Module Architecture Design

### ES2024 Class Structure
```javascript
/**
 * Chess Board Manager - ES2024 Module
 * Handles all chess board rendering, interaction, and state management
 */
export class ChessBoardManager {
    // Private fields
    #state = {
        flip: false,
        dragElement: null,
        dragActive: false,
        clickFrom: null,
        clickFromElem: null,
        arrow: false,
        tooltipState: false
    };
    
    #dependencies = {
        // Functions from main.js that board needs access to
        refreshMoves: null,
        evalAll: null,
        repaintGraph: null,
        doComputerMove: null,
        showHideMenu: null
    };
    
    // Singleton pattern
    static #instance = null;
    
    static getInstance() {
        if (!ChessBoardManager.#instance) {
            ChessBoardManager.#instance = new ChessBoardManager();
        }
        return ChessBoardManager.#instance;
    }
    
    // Public methods
    showBoard(noeval, refreshhistory, keepcontent) { /* Implementation */ }
    showLegalMoves(from) { /* Implementation */ }
    updateLegalMoves() { /* Implementation */ }
    onMouseDown(e) { /* Implementation */ }
    onMouseMove(e) { /* Implementation */ }
    onMouseUp(e) { /* Implementation */ }
    
    // Private helper methods
    #renderPieces() { /* Implementation */ }
    #handleDragAndDrop() { /* Implementation */ }
    #updateArrows() { /* Implementation */ }
}

// Backward compatibility exports
export const showBoard = (...args) => ChessBoardManager.getInstance().showBoard(...args);
export const showLegalMoves = (...args) => ChessBoardManager.getInstance().showLegalMoves(...args);
// ... etc for all functions
```

### Dependencies
```javascript
// Required imports
import { BOARD_CONFIG, UI_CONFIG } from './constants.js';
import { setElemText, getCurFEN, setCurFEN } from './dom-utils.js';
import { parseFEN, generateFEN, isLegal, bounds } from './chess-core.js';
```

## 📝 Implementation Steps

### Step 1: Create Module Foundation (30 minutes)
1. Create `public/chess-board.js` file
2. Set up ES2024 class structure with private fields
3. Implement singleton pattern
4. Add basic imports and dependencies
5. Create backward compatibility exports

### Step 2: Extract Board Display Functions (45 minutes)
1. Extract `getEvalText()` - evaluation text formatting
2. Extract `showLegalMoves()` - legal move highlighting 
3. Extract `updateLegalMoves()` - move list updates
4. Extract `getCircleClassName()` helper if exists
5. Test board display functionality

### Step 3: Extract Arrow System (30 minutes)
1. Extract all arrow functions:
   - `setArrow()`, `repaintLastMoveArrow()`
   - `showArrowInternal()`, `showArrow1/2/3()`
   - `finalArrow3()`
2. Create private arrow state management
3. Test arrow display and interaction

### Step 4: Extract Tooltip System (20 minutes)
1. Extract `getClientY()`, `updateTooltipPos()`
2. Extract `updateTooltip()` - main tooltip logic
3. Integrate tooltip with board interactions
4. Test tooltip display and positioning

### Step 5: Extract Mouse Event Handlers (60 minutes)
1. Extract `onMouseDown()` - mouse press handling
2. Extract `onMouseMove()` - drag and move tracking
3. Extract `onMouseUp()` - move execution and release
4. Extract `onWheel()` - wheel event handling
5. Extract drag helper functions
6. Test complete mouse interaction workflow

### Step 6: Extract Drag & Drop System (45 minutes)
1. Extract `dragActivate()` - drag initiation
2. Extract `doMoveHandler()` - move execution logic
3. Extract `getDragX()` / `getDragY()` coordinate conversion
4. Extract painting functions for edit mode
5. Test drag and drop functionality

### Step 7: Extract Board State & Info (30 minutes)
1. Extract `updateInfo()` - position and move info display
2. Extract `getCurScale()` - board scaling calculations
3. Extract board state synchronization logic
4. Test info display and board scaling

### Step 8: Integration & Testing (30 minutes)
1. Update imports in `main.js`
2. Remove extracted functions from `main.js`
3. Test all board functionality:
   - Piece movement and drag & drop
   - Legal move highlighting
   - Arrow display
   - Tooltip interactions
   - Board scaling and responsiveness
4. Verify no regressions in existing features

## 🧪 Testing Checklist

### Core Board Functionality
- [ ] Board renders correctly with pieces in starting position
- [ ] Legal moves highlight when clicking pieces
- [ ] Drag and drop moves work (both mouse and touch)
- [ ] Move validation prevents illegal moves
- [ ] Board flipping works correctly
- [ ] Board scaling responds to window resize

### Visual Elements
- [ ] Arrows display correctly for best moves
- [ ] Last move arrow shows with correct color
- [ ] Tooltips appear on move hover with evaluation
- [ ] Evaluation numbers appear in legal move hints
- [ ] Circle classes and colors work correctly

### Interaction
- [ ] Mouse down/move/up events work correctly
- [ ] Touch events work on mobile devices
- [ ] Wheel events work for history navigation
- [ ] Edit mode piece painting works
- [ ] Right-click context menus disabled appropriately

### State Management
- [ ] Board state synchronizes with game state
- [ ] Position info updates correctly
- [ ] Move counters and history display properly
- [ ] Engine analysis integrates with board display

## 📈 Expected Outcomes

### Code Organization Benefits
- **Separation of Concerns**: Clear distinction between board UI and game logic
- **Reusability**: Board component can be reused in different contexts
- **Testability**: Isolated board functionality easier to unit test
- **Maintainability**: Board-related bugs easier to locate and fix

### Performance Benefits
- **Optimized Rendering**: Board updates can be batched and optimized
- **Event Handling**: More efficient mouse and touch event management
- **Memory Management**: Better cleanup of event listeners and DOM elements

### Development Benefits
- **Modern Architecture**: ES2024 classes with private fields and methods
- **Type Safety**: Better JSDoc annotations and runtime validation
- **IDE Support**: Improved autocomplete and refactoring capabilities
- **Future Enhancements**: Easier to add new board features

## 🚨 Risk Mitigation

### Potential Issues
1. **State Synchronization**: Board state must stay in sync with main game state
2. **Event Handler Conflicts**: Ensure no duplicate event listeners
3. **Global Variable Dependencies**: Some board functions may depend on global state
4. **CSS Dependencies**: Board styling may need coordination with main styles

### Mitigation Strategies
1. **Incremental Testing**: Test after each extraction step
2. **Backward Compatibility**: Maintain function exports during transition
3. **State Management**: Clear interface for state synchronization
4. **Documentation**: Document all dependencies and interactions

## 📅 Timeline

- **Total Estimated Time**: 4-5 hours
- **Recommended Approach**: Extract in phases over 2-3 sessions
- **Testing Time**: 30 minutes after each major phase
- **Final Integration**: 1 hour for complete testing and cleanup

## 🎯 Success Metrics

### Quantitative Goals
- [ ] Reduce main.js from 4,761 to ~4,200 lines (500+ line reduction)
- [ ] Create chess-board.js with ~400-600 lines of focused functionality
- [ ] Zero functionality regressions
- [ ] All existing tests pass

### Qualitative Goals
- [ ] Cleaner separation between board UI and game logic
- [ ] More maintainable codebase structure
- [ ] Better preparation for future UI enhancements
- [ ] Improved developer experience with focused modules

## 📄 Next Steps After Chess Board Module

1. **Game History Module** - Move navigation, PGN handling, history display
2. **Menu System Module** - Game mode selection, settings, menu management  
3. **Evaluation Graph Module** - Canvas rendering, graph interaction, zoom/pan
4. **Static Evaluation Module** - Position analysis display and explanations
5. **Input Handler Module** - Command processing, keyboard shortcuts, search

---

**Created**: June 30, 2025  
**Priority**: HIGH - Next immediate step in refactoring  
**Dependencies**: All foundation modules completed  
**Estimated Completion**: 4-5 hours of focused development  
**Target**: Reduce main.js by 10-15% while improving code organization
