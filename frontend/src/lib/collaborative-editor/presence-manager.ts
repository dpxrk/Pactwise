// src/lib/collaborative-editor/presence-manager.ts
import {
  UserPresence,
  CursorPosition,
  TextSelection,
  CollaborativeSession,
  EditorEvent,
  CursorEvent,
  UserJoinEvent,
  USER_COLORS,
  EDITOR_CONSTANTS
} from '@/types/collaborative-editor.types';
// import { Id } from '../../../convex/_generated/dataModel';

// ============================================================================
// PRESENCE MANAGER - Handles real-time user presence and cursor tracking
// ============================================================================

export class PresenceManager {
  private presenceMap = new Map<string, UserPresence>();
  private cursorElements = new Map<string, HTMLElement>();
  private selectionElements = new Map<string, HTMLElement>();
  private userColorMap = new Map<string, string>();
  private eventListeners = new Set<(event: EditorEvent) => void>();
  private updateTimer: NodeJS.Timeout | null = null;
  private editorElement: HTMLElement | null = null;

  constructor(private documentId: Id<"collaborativeDocuments">) {
    this.setupPeriodicUpdates();
  }

  // ============================================================================
  // USER PRESENCE MANAGEMENT
  // ============================================================================

  /**
   * Add a user to the presence system
   */
  addUser(user: UserPresence): void {
    const userId = user.userId;
    
    // Assign a color if not already assigned
    if (!this.userColorMap.has(userId)) {
      this.assignUserColor(userId);
    }

    // Update user presence
    this.presenceMap.set(userId, {
      ...user,
      userColor: this.userColorMap.get(userId) || USER_COLORS[0],
      lastSeen: Date.now(),
      isActive: true
    });

    // Create cursor elements for the user
    this.createCursorElements(userId);

    // Emit user join event
    this.emitEvent({
      type: 'user-join',
      documentId: this.documentId,
      userId,
      timestamp: Date.now(),
      data: { user: this.presenceMap.get(userId)! }
    } as UserJoinEvent);
  }

  /**
   * Remove a user from the presence system
   */
  removeUser(userId: Id<"users">): void {
    const user = this.presenceMap.get(userId);
    if (!user) return;

    // Mark as inactive instead of removing immediately
    this.presenceMap.set(userId, {
      ...user,
      isActive: false,
      lastSeen: Date.now()
    });

    // Remove cursor elements
    this.removeCursorElements(userId);

    // Emit user leave event
    this.emitEvent({
      type: 'user-leave',
      documentId: this.documentId,
      userId,
      timestamp: Date.now(),
      data: { userId }
    });

    // Clean up after a delay
    setTimeout(() => {
      this.presenceMap.delete(userId);
      this.userColorMap.delete(userId);
    }, 30000); // 30 seconds
  }

  /**
   * Update a user's cursor position
   */
  updateCursor(
    userId: Id<"users">,
    position: number,
    selection?: TextSelection
  ): void {
    const user = this.presenceMap.get(userId);
    if (!user) return;

    const updatedUser: UserPresence = {
      ...user,
      cursor: {
        position,
        isVisible: true
      },
      lastSeen: Date.now()
    };
    
    if (selection) {
      updatedUser.selection = selection;
    }

    this.presenceMap.set(userId, updatedUser);
    this.updateCursorVisual(userId, position, selection);

    // Emit cursor event
    this.emitEvent({
      type: 'cursor-move',
      documentId: this.documentId,
      userId,
      timestamp: Date.now(),
      data: { position, selection }
    } as CursorEvent);
  }

  /**
   * Get all active users
   */
  getActiveUsers(): UserPresence[] {
    return Array.from(this.presenceMap.values())
      .filter(user => user.isActive)
      .sort((a, b) => a.userName.localeCompare(b.userName));
  }

  /**
   * Get a specific user's presence
   */
  getUser(userId: Id<"users">): UserPresence | undefined {
    return this.presenceMap.get(userId);
  }

  /**
   * Update user activity timestamp
   */
  updateActivity(userId: Id<"users">): void {
    const user = this.presenceMap.get(userId);
    if (!user) return;

    this.presenceMap.set(userId, {
      ...user,
      lastSeen: Date.now(),
      isActive: true
    });
  }

  // ============================================================================
  // CURSOR VISUALIZATION
  // ============================================================================

  /**
   * Set the editor element for cursor positioning
   */
  setEditorElement(element: HTMLElement): void {
    this.editorElement = element;
    this.setupCursorContainer();
  }

  /**
   * Create cursor elements for a user
   */
  private createCursorElements(userId: Id<"users">): void {
    if (!this.editorElement) return;

    const user = this.presenceMap.get(userId);
    if (!user) return;

    // Create cursor element
    const cursor = this.createCursorElement(user);
    this.cursorElements.set(userId, cursor);

    // Create selection element
    const selection = this.createSelectionElement(user);
    this.selectionElements.set(userId, selection);

    // Add to editor
    const cursorContainer = this.getCursorContainer();
    if (cursorContainer) {
      cursorContainer.appendChild(cursor);
      cursorContainer.appendChild(selection);
    }
  }

  /**
   * Remove cursor elements for a user
   */
  private removeCursorElements(userId: Id<"users">): void {
    const cursor = this.cursorElements.get(userId);
    const selection = this.selectionElements.get(userId);

    if (cursor) {
      cursor.remove();
      this.cursorElements.delete(userId);
    }

    if (selection) {
      selection.remove();
      this.selectionElements.delete(userId);
    }
  }

  /**
   * Create a cursor element
   */
  private createCursorElement(user: UserPresence): HTMLElement {
    const cursor = document.createElement('div');
    cursor.className = 'collaborative-cursor';
    cursor.style.cssText = `
      position: absolute;
      width: 2px;
      height: 20px;
      background-color: ${user.userColor};
      pointer-events: none;
      z-index: 1000;
      opacity: 0;
      transition: opacity 0.2s ease;
      border-radius: 1px;
    `;

    // Add user label
    const label = document.createElement('div');
    label.className = 'collaborative-cursor-label';
    label.textContent = user.userName;
    label.style.cssText = `
      position: absolute;
      top: -25px;
      left: -5px;
      background-color: ${user.userColor};
      color: white;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: 500;
      white-space: nowrap;
      opacity: 0;
      transition: opacity 0.2s ease;
      pointer-events: none;
    `;

    cursor.appendChild(label);

    // Add blinking animation
    this.addCursorBlinkAnimation(cursor);

    return cursor;
  }

  /**
   * Create a selection element
   */
  private createSelectionElement(user: UserPresence): HTMLElement {
    const selection = document.createElement('div');
    selection.className = 'collaborative-selection';
    selection.style.cssText = `
      position: absolute;
      background-color: ${user.userColor};
      opacity: 0.2;
      pointer-events: none;
      z-index: 999;
      border-radius: 2px;
    `;

    return selection;
  }

  /**
   * Update cursor visual position
   */
  private updateCursorVisual(
    userId: Id<"users">,
    position: number,
    selection?: TextSelection
  ): void {
    if (!this.editorElement) return;

    const cursor = this.cursorElements.get(userId);
    const selectionEl = this.selectionElements.get(userId);
    
    if (!cursor || !selectionEl) return;

    try {
      // Calculate cursor position
      const range = this.createRangeAtPosition(position);
      if (!range) return;

      const rect = range.getBoundingClientRect();
      const editorRect = this.editorElement.getBoundingClientRect();

      // Position cursor
      cursor.style.left = `${rect.left - editorRect.left}px`;
      cursor.style.top = `${rect.top - editorRect.top}px`;
      cursor.style.opacity = '1';

      // Show/hide label on cursor movement
      const label = cursor.querySelector('.collaborative-cursor-label') as HTMLElement;
      if (label) {
        label.style.opacity = '1';
        setTimeout(() => {
          label.style.opacity = '0';
        }, 2000);
      }

      // Handle selection
      if (selection && selection.start !== selection.end) {
        this.updateSelectionVisual(userId, selection);
      } else {
        selectionEl.style.opacity = '0';
      }
    } catch (error) {
      // Failed to update cursor visual
    }
  }

  /**
   * Update selection visual
   */
  private updateSelectionVisual(userId: Id<"users">, selection: TextSelection): void {
    const selectionEl = this.selectionElements.get(userId);
    if (!selectionEl || !this.editorElement) return;

    try {
      const startRange = this.createRangeAtPosition(selection.start);
      const endRange = this.createRangeAtPosition(selection.end);
      
      if (!startRange || !endRange) return;

      const startRect = startRange.getBoundingClientRect();
      const endRect = endRange.getBoundingClientRect();
      const editorRect = this.editorElement.getBoundingClientRect();

      // Simple single-line selection for now
      if (startRect.top === endRect.top) {
        selectionEl.style.left = `${startRect.left - editorRect.left}px`;
        selectionEl.style.top = `${startRect.top - editorRect.top}px`;
        selectionEl.style.width = `${endRect.left - startRect.left}px`;
        selectionEl.style.height = `${startRect.height}px`;
        selectionEl.style.opacity = '0.2';
      } else {
        // Multi-line selection would require more complex handling
        selectionEl.style.opacity = '0';
      }
    } catch (error) {
      // Failed to update selection visual
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Create a range at a specific position in the text
   */
  private createRangeAtPosition(position: number): Range | null {
    if (!this.editorElement) return null;

    try {
      const walker = document.createTreeWalker(
        this.editorElement,
        NodeFilter.SHOW_TEXT,
        null
      );

      let currentPos = 0;
      let node: Node | null;

      while ((node = walker.nextNode())) {
        const textNode = node as Text;
        const nodeLength = textNode.textContent?.length || 0;

        if (currentPos + nodeLength >= position) {
          const range = document.createRange();
          range.setStart(textNode, position - currentPos);
          range.setEnd(textNode, position - currentPos);
          return range;
        }

        currentPos += nodeLength;
      }

      // If position is beyond text, create range at end
      const range = document.createRange();
      range.selectNodeContents(this.editorElement);
      range.collapse(false);
      return range;
    } catch (error) {
      // Failed to create range at position
      return null;
    }
  }

  /**
   * Setup cursor container
   */
  private setupCursorContainer(): void {
    if (!this.editorElement) return;

    let container = this.editorElement.querySelector('.cursor-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'cursor-container';
      (container as HTMLElement).style.cssText = `
        position: relative;
        pointer-events: none;
        z-index: 1000;
      `;
      this.editorElement.appendChild(container);
    }
  }

  /**
   * Get cursor container
   */
  private getCursorContainer(): HTMLElement | null {
    if (!this.editorElement) return null;
    return this.editorElement.querySelector('.cursor-container');
  }

  /**
   * Add blinking animation to cursor
   */
  private addCursorBlinkAnimation(cursor: HTMLElement): void {
    let visible = true;
    
    setInterval(() => {
      if (visible) {
        cursor.style.opacity = '0.3';
      } else {
        cursor.style.opacity = '1';
      }
      visible = !visible;
    }, EDITOR_CONSTANTS.CURSOR_BLINK_INTERVAL);
  }

  /**
   * Assign a color to a user
   */
  private assignUserColor(userId: Id<"users">): void {
    const usedColors = new Set(this.userColorMap.values());
    const availableColors = USER_COLORS.filter(color => !usedColors.has(color));
    
    if (availableColors.length > 0) {
      this.userColorMap.set(userId, availableColors[0]!);
    } else {
      // If all colors are used, use a random one
      const randomIndex = Math.floor(Math.random() * USER_COLORS.length);
      this.userColorMap.set(userId, USER_COLORS[randomIndex]!);
    }
  }

  /**
   * Setup periodic presence updates
   */
  private setupPeriodicUpdates(): void {
    this.updateTimer = setInterval(() => {
      this.cleanupInactiveUsers();
      this.updateCursorPositions();
    }, EDITOR_CONSTANTS.PRESENCE_UPDATE_INTERVAL);
  }

  /**
   * Clean up inactive users
   */
  private cleanupInactiveUsers(): void {
    const now = Date.now();
    const inactiveThreshold = 60000; // 1 minute

    for (const [userId, user] of this.presenceMap.entries()) {
      if (now - user.lastSeen > inactiveThreshold) {
        this.removeUser(userId as Id<"users">);
      }
    }
  }

  /**
   * Update cursor positions based on document changes
   */
  private updateCursorPositions(): void {
    // This would be called when the document content changes
    // to update cursor positions accordingly
    for (const [userId, user] of this.presenceMap.entries()) {
      if (user.isActive && user.cursor.isVisible) {
        this.updateCursorVisual(
          userId as Id<"users">,
          user.cursor.position,
          user.selection
        );
      }
    }
  }

  // ============================================================================
  // EVENT SYSTEM
  // ============================================================================

  /**
   * Add event listener
   */
  addEventListener(listener: (event: EditorEvent) => void): void {
    this.eventListeners.add(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: (event: EditorEvent) => void): void {
    this.eventListeners.delete(listener);
  }

  /**
   * Emit an event to all listeners
   */
  private emitEvent(event: EditorEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  /**
   * Destroy the presence manager
   */
  destroy(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }

    // Remove all cursor elements
    for (const userId of this.presenceMap.keys()) {
      this.removeCursorElements(userId as Id<"users">);
    }

    // Clear maps
    this.presenceMap.clear();
    this.cursorElements.clear();
    this.selectionElements.clear();
    this.userColorMap.clear();
    this.eventListeners.clear();
  }
}

// ============================================================================
// CURSOR POSITION UTILITIES
// ============================================================================

export class CursorUtils {
  /**
   * Get cursor position from a DOM selection
   */
  static getCursorPositionFromSelection(
    editorElement: HTMLElement,
    selection: Selection
  ): number {
    if (!selection.rangeCount) return 0;

    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(editorElement);
    preCaretRange.setEnd(range.endContainer, range.endOffset);

    return preCaretRange.toString().length;
  }

  /**
   * Set cursor position in a DOM element
   */
  static setCursorPosition(
    editorElement: HTMLElement,
    position: number
  ): void {
    const range = this.createRangeAtPosition(editorElement, position);
    if (!range) return;

    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  /**
   * Create a range at a specific position
   */
  private static createRangeAtPosition(
    editorElement: HTMLElement,
    position: number
  ): Range | null {
    const walker = document.createTreeWalker(
      editorElement,
      NodeFilter.SHOW_TEXT,
      null
    );

    let currentPos = 0;
    let node: Node | null;

    while ((node = walker.nextNode())) {
      const textNode = node as Text;
      const nodeLength = textNode.textContent?.length || 0;

      if (currentPos + nodeLength >= position) {
        const range = document.createRange();
        range.setStart(textNode, position - currentPos);
        range.setEnd(textNode, position - currentPos);
        return range;
      }

      currentPos += nodeLength;
    }

    return null;
  }

  /**
   * Get text selection from DOM
   */
  static getTextSelection(
    editorElement: HTMLElement,
    selection: Selection
  ): TextSelection | undefined {
    if (!selection.rangeCount) return undefined;

    const range = selection.getRangeAt(0);
    const start = this.getCursorPositionFromSelection(
      editorElement,
      selection
    );
    const end = start + range.toString().length;

    if (start === end) return undefined;

    return {
      start: Math.min(start, end),
      end: Math.max(start, end),
      direction: start <= end ? 'forward' : 'backward'
    };
  }
}