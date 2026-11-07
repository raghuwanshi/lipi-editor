/**
 * Editor Configuration & Constraint Constants
 * Centralized repository for all special numbers, limits, and configuration defaults.
 */

// Typography & Font Defaults
export const DEFAULT_FONT_SIZE = 14;
export const DEFAULT_FONT_FAMILY = 'Consolas, "Courier New", monospace';
export const DEFAULT_LINE_HEIGHT = '1.5';

// Zoom Level Constraints
export const DEFAULT_ZOOM_LEVEL = 100;
export const MIN_ZOOM_LEVEL = 50;
export const MAX_ZOOM_LEVEL = 200;
export const ZOOM_STEP = 10;

// History Stack & Undo Engine
export const MAX_HISTORY_STEPS = 1000;
export const TYPING_DEBOUNCE_MS = 1000;

// Large File Safety Constraints
export const MAX_DISPLAYED_LINE_NUMBERS = 5000;

// Character Code Lookups (Avoiding allocations in high-frequency loops)
export const CHAR_CODE_NEWLINE = 10; // '\n'
export const CHAR_CODE_SPACE = 32;   // ' ' (Characters > 32 are non-whitespace)

// Caret & Snippet Analysis Offsets
export const CARET_CONTEXT_CHAR_COUNT = 20;    // Number of characters inspected before and after caret
export const SNIPPET_LOOKBACK_CHAR_COUNT = 40; // Preceding characters inspected for snippet trigger matches

// Formatting & Indentation
export const TAB_INDENT_SPACES = '  ';

// Floating Context Menu Clamping Boundaries
export const CONTEXT_MENU_ESTIMATED_WIDTH = 220;
export const CONTEXT_MENU_ESTIMATED_HEIGHT = 300;

// Welcome Text
export const INITIAL_WELCOME_TEXT = `Welcome to Lipi Editor!

Try typing these auto-expansion snippet triggers followed by space or as you type:
- Type :date: -> Inserts today's date
- Type :time: -> Inserts current time
- Type :shrug: -> Inserts ¯\\_(ツ)_/¯
- Type :todo: -> Inserts [ ] check box
- Type :lorem: -> Inserts lorem ipsum sample text

Features:
1. Caret Context Inspector: Displays exact text surrounding your cursor.
2. Custom Snippet Rule Engine: Define your own text expansion rules.
3. Right-Click Context Menu: Quick options for transforms, selections, and cut/copy/paste.
4. Find & Replace: Search with case sensitivity & batch replace.

Enjoy editing!`;
