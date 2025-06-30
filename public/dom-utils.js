/**
 * Modern DOM Utilities for BoldChess Web App
 * ES2024 compliant with class-based architecture
 */

import { CSS_CLASSES, ERROR_MESSAGES } from './constants.js';

export class DOMUtils {
  // Private static cache for frequently accessed elements
  static #elementCache = new Map();
  
  /**
   * Set text content of an element (modern replacement for setElemText)
   * @param {HTMLElement|string} element - Element or selector
   * @param {string} text - Text to set
   * @returns {boolean} Success status
   */
  static setElementText(element, text = '') {
    try {
      const elem = DOMUtils.#resolveElement(element);
      if (!elem) return false;
      
      // Modern approach - more performant than removeChild loop
      elem.textContent = text;
      return true;
    } catch (error) {
      console.warn('setElementText failed:', error);
      return false;
    }
  }

  /**
   * Get text content of an element (modern replacement for getElemText)
   * @param {HTMLElement|string} element - Element or selector
   * @returns {string} Text content or empty string
   */
  static getElementText(element) {
    try {
      const elem = DOMUtils.#resolveElement(element);
      return elem?.textContent ?? '';
    } catch (error) {
      console.warn('getElementText failed:', error);
      return '';
    }
  }

  /**
   * Set current FEN position (modern replacement for setCurFEN)
   * @param {string} fen - FEN notation string
   * @returns {boolean} Success status
   */
  static setCurrentFEN(fen) {
    return DOMUtils.setElementText('#fen', fen);
  }

  /**
   * Get current FEN position (modern replacement for getCurFEN)
   * @returns {string} FEN notation string
   */
  static getCurrentFEN() {
    return DOMUtils.getElementText('#fen');
  }

  /**
   * Safely get element by ID with caching
   * @param {string} id - Element ID
   * @returns {HTMLElement|null}
   */
  static getElementById(id) {
    // Use optional chaining and nullish coalescing
    const cached = DOMUtils.#elementCache.get(id);
    if (cached?.isConnected) return cached;
    
    const element = document.getElementById(id);
    if (element) {
      DOMUtils.#elementCache.set(id, element);
    }
    return element;
  }

  /**
   * Toggle CSS class with modern approach
   * @param {HTMLElement|string} element - Element or selector
   * @param {string} className - Class name to toggle
   * @param {boolean} force - Force add/remove
   * @returns {boolean} Whether class is present after toggle
   */
  static toggleClass(element, className, force) {
    const elem = DOMUtils.#resolveElement(element);
    return elem?.classList.toggle(className, force) ?? false;
  }

  /**
   * Set multiple CSS properties at once
   * @param {HTMLElement|string} element - Element or selector
   * @param {Object} styles - Style properties object
   * @returns {boolean} Success status
   */
  static setStyles(element, styles = {}) {
    try {
      const elem = DOMUtils.#resolveElement(element);
      if (!elem) return false;
      
      Object.assign(elem.style, styles);
      return true;
    } catch (error) {
      console.warn('setStyles failed:', error);
      return false;
    }
  }

  /**
   * Create element with modern syntax
   * @param {string} tagName - Tag name
   * @param {Object} options - Element options
   * @returns {HTMLElement|null}
   */
  static createElement(tagName, { 
    textContent = '', 
    className = '', 
    id = '', 
    attributes = {},
    styles = {},
    children = []
  } = {}) {
    try {
      const element = document.createElement(tagName);
      
      if (textContent) element.textContent = textContent;
      if (className) element.className = className;
      if (id) element.id = id;
      
      // Set attributes
      Object.entries(attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
      });
      
      // Set styles
      Object.assign(element.style, styles);
      
      // Append children
      children.forEach(child => {
        if (typeof child === 'string') {
          element.appendChild(document.createTextNode(child));
        } else if (child instanceof HTMLElement) {
          element.appendChild(child);
        }
      });
      
      return element;
    } catch (error) {
      console.warn('createElement failed:', error);
      return null;
    }
  }

  /**
   * Add event listener with modern options
   * @param {HTMLElement|string} element - Element or selector
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @param {Object} options - Event options
   * @returns {AbortController|null} Abort controller for cleanup
   */
  static addEventListener(element, event, handler, options = {}) {
    try {
      const elem = DOMUtils.#resolveElement(element);
      if (!elem || typeof handler !== 'function') return null;
      
      const controller = new AbortController();
      const eventOptions = { 
        signal: controller.signal,
        ...options 
      };
      
      elem.addEventListener(event, handler, eventOptions);
      return controller;
    } catch (error) {
      console.warn('addEventListener failed:', error);
      return null;
    }
  }

  /**
   * Clear element cache (for cleanup)
   */
  static clearCache() {
    DOMUtils.#elementCache.clear();
  }

  /**
   * Private method to resolve element from various inputs
   * @param {HTMLElement|string} element - Element or selector
   * @returns {HTMLElement|null}
   */
  static #resolveElement(element) {
    if (element instanceof HTMLElement) {
      return element;
    }
    
    if (typeof element === 'string') {
      // Handle ID selector (#id) or plain ID
      if (element.startsWith('#')) {
        return DOMUtils.getElementById(element.slice(1));
      }
      
      // Try as ID first, then as selector
      return DOMUtils.getElementById(element) ?? document.querySelector(element);
    }
    
    return null;
  }
}

// Backward compatibility exports (for gradual migration)
export const setElemText = DOMUtils.setElementText;
export const getElemText = DOMUtils.getElementText;
export const setCurFEN = DOMUtils.setCurrentFEN;
export const getCurFEN = DOMUtils.getCurrentFEN;
