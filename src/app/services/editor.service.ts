import { Injectable, computed, signal } from '@angular/core';
import { HistoryStep, TextDelta } from '../models/text-history.model';
import { LineNumberInfo } from '../models/line-number.model';
import * as EC from '../constants/editor.constants';

@Injectable({
  providedIn: 'root',
})
export class EditorService {
  private editorElement: HTMLTextAreaElement | null = null;

  // Document State
  readonly fileName = signal<string>('Untitled.txt');
  readonly text = signal<string>(EC.INITIAL_WELCOME_TEXT);
  readonly isModified = signal<boolean>(false);

  // Feature Flags
  // Caret Context Inspector is hidden by default. Set to true in code to enable inspector controls in menu and toolbar.
  readonly enableCaretInspector = signal<boolean>(false);

  // Formatting & View State
  readonly wordWrap = signal<boolean>(true);
  readonly fontFamily = signal<string>(EC.DEFAULT_FONT_FAMILY);
  readonly fontSize = signal<number>(EC.DEFAULT_FONT_SIZE);
  readonly zoomLevel = signal<number>(EC.DEFAULT_ZOOM_LEVEL);
  readonly isDarkMode = signal<boolean>(true);
  readonly showLineNumbers = signal<boolean>(true);
  readonly showCaretInspector = signal<boolean>(false);
  readonly showStatusBar = signal<boolean>(true);
  readonly lineHeight = EC.DEFAULT_LINE_HEIGHT;
  readonly defaultZoomLevel = EC.DEFAULT_ZOOM_LEVEL;
  readonly effectiveFontSize = computed(
    () => (this.fontSize() * this.zoomLevel()) / this.defaultZoomLevel
  );

  // Line Numbers with Visual Wrapped Height Tracking
  readonly lineNumbersInfo = signal<LineNumberInfo[]>([]);

  // Caret & Selection State
  readonly caretPos = signal<number>(0);
  readonly selectionEnd = signal<number>(0);

  // Range Delta History Engine (Memory efficient, supports thousands of undos on large files)
  private history: HistoryStep[] = [];
  private historyIndex = -1;

  // Active Typing Batch for coalescing consecutive keystrokes
  private typingBatch: HistoryStep | null = null;
  private typingTimer: ReturnType<typeof setTimeout> | null = null;

  // Tracking last known caret/selection before an input event
  private lastCaretBeforeInput = 0;
  private lastSelectionEndBeforeInput = 0;

  readonly canUndo = computed(() => this.historyIndex >= 0 || this.typingBatch !== null);
  readonly canRedo = computed(() => this.historyIndex < this.history.length - 1 && this.typingBatch === null);

  // Reactive Computed Properties (Reliably track this.text signal without full-file string splits)
  readonly currentLineNumber = computed(() => {
    const pos = this.caretPos();
    const val = this.text();
    let line = 1;
    const limit = Math.min(pos, val.length);
    for (let i = 0; i < limit; i++) {
      if (val.charCodeAt(i) === EC.CHAR_CODE_NEWLINE) line++;
    }
    return line;
  });

  readonly currentColNumber = computed(() => {
    const pos = this.caretPos();
    const val = this.text();
    const lastNewline = val.lastIndexOf('\n', pos - 1);
    return lastNewline === -1 ? pos + 1 : pos - lastNewline;
  });

  readonly lineNumbersArray = computed(() => {
    const val = this.text();
    let totalLines = 1;
    for (let i = 0; i < val.length; i++) {
      if (val.charCodeAt(i) === EC.CHAR_CODE_NEWLINE) totalLines++;
    }
    // Cap gutter line numbers to prevent browser DOM exhaustion on massive files
    const capped = Math.min(totalLines, EC.MAX_DISPLAYED_LINE_NUMBERS);
    return Array.from({ length: Math.max(1, capped) }, (_, i) => i + 1);
  });

  readonly charCount = computed(() => {
    return this.text().length;
  });

  readonly wordCount = computed(() => {
    const val = this.text();
    let count = 0;
    let inWord = false;
    for (let i = 0; i < val.length; i++) {
      if (val.charCodeAt(i) > EC.CHAR_CODE_SPACE) {
        if (!inWord) {
          count++;
          inWord = true;
        }
      } else {
        inWord = false;
      }
    }
    return count;
  });

  readonly selectionLength = computed(() =>
    Math.abs(this.selectionEnd() - this.caretPos())
  );

  readonly textBeforeCaret = computed(() => {
    const pos = this.caretPos();
    const val = this.text();
    const start = Math.max(0, pos - EC.CARET_CONTEXT_CHAR_COUNT);
    return val.substring(start, pos);
  });

  readonly textAfterCaret = computed(() => {
    const pos = this.caretPos();
    const val = this.text();
    const end = Math.min(val.length, pos + EC.CARET_CONTEXT_CHAR_COUNT);
    return val.substring(pos, end);
  });

  readonly activeWordUnderCaret = computed(() => {
    const val = this.text();
    const pos = this.caretPos();
    if (!val) return '';

    let start = pos;
    while (start > 0 && /\w/.test(val[start - 1])) {
      start--;
    }
    let end = pos;
    while (end < val.length && /\w/.test(val[end])) {
      end++;
    }
    return val.substring(start, end);
  });

  constructor() {
    this.isModified.set(false);
    this.initDefaultLineNumbersInfo();
  }

  private initDefaultLineNumbersInfo(): void {
    const singleHeight = Math.round(EC.DEFAULT_FONT_SIZE * parseFloat(EC.DEFAULT_LINE_HEIGHT));
    const lines = EC.INITIAL_WELCOME_TEXT.split('\n');
    const initialInfo: LineNumberInfo[] = lines.map((_, i) => ({
      lineNumber: i + 1,
      height: singleHeight,
      visualLines: 1,
    }));
    this.lineNumbersInfo.set(initialInfo);
  }

  setLineNumbersInfo(info: LineNumberInfo[]): void {
    this.lineNumbersInfo.set(info);
  }

  goToLine(lineNumber: number): void {
    const text = this.text();
    let pos = 0;
    let line = 1;
    while (line < lineNumber && pos < text.length) {
      const nextNewline = text.indexOf('\n', pos);
      if (nextNewline === -1) break;
      pos = nextNewline + 1;
      line++;
    }
    this.setCaretRange(pos, pos);
  }

  setEditorElement(el: HTMLTextAreaElement | null): void {
    this.editorElement = el;
    if (el) {
      this.lastCaretBeforeInput = el.selectionStart;
      this.lastSelectionEndBeforeInput = el.selectionEnd;
    }
  }

  getEditorElement(): HTMLTextAreaElement | null {
    return this.editorElement;
  }

  setCaretRange(start: number, end: number): void {
    if (this.editorElement) {
      this.editorElement.focus();
      this.editorElement.setSelectionRange(start, end);
      this.updateCaretPosition();
    }
  }

  updateCaretPosition(): void {
    if (this.editorElement) {
      this.caretPos.set(this.editorElement.selectionStart);
      this.selectionEnd.set(this.editorElement.selectionEnd);
      this.lastCaretBeforeInput = this.editorElement.selectionStart;
      this.lastSelectionEndBeforeInput = this.editorElement.selectionEnd;
    }
  }

  syncTextFromElement(): void {
    if (this.editorElement) {
      this.text.set(this.editorElement.value);
      this.isModified.set(true);
    }
  }

  // RANGE-BASED DELTA EDIT ENGINE
  // Mutates ONLY the targeted range in the DOM via setRangeText() and saves a lightweight delta
  applyRangeEdit(
    start: number,
    end: number,
    newText: string,
    selectMode: 'select' | 'start' | 'end' | 'preserve' = 'end'
  ): void {
    if (!this.editorElement) return;

    this.flushTypingBatch();

    const caretBefore = this.editorElement.selectionStart;
    const selectionEndBefore = this.editorElement.selectionEnd;
    const oldText = this.editorElement.value.substring(start, end);

    // 1. Direct, high-performance DOM range replacement
    this.editorElement.setRangeText(newText, start, end, selectMode);

    // 2. Capture post-edit positions
    const caretAfter = this.editorElement.selectionStart;
    const selectionEndAfter = this.editorElement.selectionEnd;

    // 3. Record range delta in history
    this.pushHistoryStep({
      deltas: [{ start, end, oldText, newText }],
      caretBefore,
      caretAfter,
      selectionEndBefore,
      selectionEndAfter,
    });

    this.updateCaretPosition();
    this.syncTextFromElement();
  }

  // BATCH RANGE EDIT (Used for Replace All and bulk cleans)
  // Replaces multiple ranges in reverse order to keep preceding indices intact, grouped into 1 undo step
  applyBatchRangeEdit(
    edits: { start: number; end: number; newText: string }[],
    caretBefore: number,
    caretAfter?: number
  ): void {
    if (!this.editorElement || edits.length === 0) return;

    this.flushTypingBatch();

    const text = this.editorElement.value;
    const deltas: TextDelta[] = [];

    // Sort descending so lower indices are not displaced by earlier replacements
    const sorted = [...edits].sort((a, b) => b.start - a.start);

    for (const edit of sorted) {
      const oldText = text.substring(edit.start, edit.end);
      this.editorElement.setRangeText(edit.newText, edit.start, edit.end, 'preserve');
      deltas.push({
        start: edit.start,
        end: edit.end,
        oldText,
        newText: edit.newText,
      });
    }

    const finalCaret = caretAfter ?? this.editorElement.selectionStart;
    this.pushHistoryStep({
      deltas,
      caretBefore,
      caretAfter: finalCaret,
      selectionEndBefore: caretBefore,
      selectionEndAfter: finalCaret,
    });

    this.updateCaretPosition();
    this.syncTextFromElement();
  }

  // DIRECT TYPING COALESCING (Groups single-char typing bursts into compact delta steps)
  recordTypingInput(event: InputEvent): void {
    if (!this.editorElement) return;

    const el = this.editorElement;
    const currentPos = el.selectionStart;
    const inputType = event.inputType;

    if (inputType === 'insertText' || inputType === 'insertLineBreak') {
      const inserted = event.data ?? '\n';
      const start = this.lastCaretBeforeInput;
      const end = this.lastSelectionEndBeforeInput;

      if (
        this.typingBatch &&
        this.typingBatch.deltas.length === 1 &&
        this.typingBatch.deltas[0].oldText === '' &&
        start === this.typingBatch.caretAfter
      ) {
        // Coalesce contiguous typing
        this.typingBatch.deltas[0].newText += inserted;
        this.typingBatch.caretAfter = currentPos;
      } else {
        this.flushTypingBatch();
        const oldText = end > start ? this.text().substring(start, end) : '';
        this.typingBatch = {
          deltas: [{ start, end, oldText, newText: inserted }],
          caretBefore: start,
          caretAfter: currentPos,
          selectionEndBefore: end,
          selectionEndAfter: currentPos,
        };
      }

      this.resetTypingTimer();
    } else if (inputType === 'deleteContentBackward') {
      this.flushTypingBatch();
      const hasSelection = this.lastSelectionEndBeforeInput > this.lastCaretBeforeInput;
      const start = hasSelection ? this.lastCaretBeforeInput : currentPos;
      const end = hasSelection ? this.lastSelectionEndBeforeInput : this.lastCaretBeforeInput;
      const oldText = this.text().substring(start, end);
      this.pushHistoryStep({
        deltas: [{ start, end, oldText, newText: '' }],
        caretBefore: end,
        caretAfter: start,
        selectionEndBefore: end,
        selectionEndAfter: start,
      });
    } else if (inputType === 'deleteContentForward') {
      this.flushTypingBatch();
      const hasSelection = this.lastSelectionEndBeforeInput > this.lastCaretBeforeInput;
      const start = this.lastCaretBeforeInput;
      const end = hasSelection ? this.lastSelectionEndBeforeInput : Math.min(this.text().length, start + 1);
      const oldText = this.text().substring(start, end);
      this.pushHistoryStep({
        deltas: [{ start, end, oldText, newText: '' }],
        caretBefore: start,
        caretAfter: start,
        selectionEndBefore: end,
        selectionEndAfter: start,
      });
    } else if (inputType === 'insertFromPaste') {
      this.flushTypingBatch();
      const start = this.lastCaretBeforeInput;
      const end = this.lastSelectionEndBeforeInput;
      const insertedLength = currentPos - start;
      const newText = el.value.substring(start, start + insertedLength);
      const oldText = end > start ? this.text().substring(start, end) : '';
      this.pushHistoryStep({
        deltas: [{ start, end, oldText, newText }],
        caretBefore: start,
        caretAfter: currentPos,
        selectionEndBefore: end,
        selectionEndAfter: currentPos,
      });
    } else {
      this.flushTypingBatch();
    }

    this.syncTextFromElement();
  }

  private resetTypingTimer(): void {
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
    }
    this.typingTimer = setTimeout(() => {
      this.flushTypingBatch();
    }, EC.TYPING_DEBOUNCE_MS);
  }

  flushTypingBatch(): void {
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
      this.typingTimer = null;
    }
    if (this.typingBatch) {
      const batch = this.typingBatch;
      this.typingBatch = null;
      this.pushHistoryStep(batch);
    }
  }

  pushHistoryStep(step: HistoryStep): void {
    this.isModified.set(true);
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    this.history.push(step);

    if (this.history.length > EC.MAX_HISTORY_STEPS) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
  }

  // UNDO / REDO WITH setRangeText()
  undo(): void {
    if (!this.editorElement) return;

    if (this.typingBatch) {
      this.flushTypingBatch();
    }

    if (this.historyIndex < 0) return;

    const step = this.history[this.historyIndex];
    this.historyIndex--;

    // Invert deltas in reverse order
    for (let i = step.deltas.length - 1; i >= 0; i--) {
      const delta = step.deltas[i];
      const currentLength = delta.newText.length;
      this.editorElement.setRangeText(
        delta.oldText,
        delta.start,
        delta.start + currentLength,
        'preserve'
      );
    }

    const caret = step.caretBefore;
    const selEnd = step.selectionEndBefore ?? caret;
    this.editorElement.setSelectionRange(caret, selEnd);
    this.updateCaretPosition();
    this.syncTextFromElement();
  }

  redo(): void {
    if (!this.editorElement) return;

    if (this.typingBatch) {
      this.flushTypingBatch();
    }

    if (this.historyIndex >= this.history.length - 1) return;

    this.historyIndex++;
    const step = this.history[this.historyIndex];

    // Reapply deltas in forward order
    for (let i = 0; i < step.deltas.length; i++) {
      const delta = step.deltas[i];
      const currentLength = delta.oldText.length;
      this.editorElement.setRangeText(
        delta.newText,
        delta.start,
        delta.start + currentLength,
        'preserve'
      );
    }

    const caret = step.caretAfter;
    const selEnd = step.selectionEndAfter ?? caret;
    this.editorElement.setSelectionRange(caret, selEnd);
    this.updateCaretPosition();
    this.syncTextFromElement();
  }

  // DOCUMENT OPERATIONS
  newDocument(): void {
    this.flushTypingBatch();
    this.text.set('');
    this.fileName.set('Untitled.txt');
    this.history = [];
    this.historyIndex = -1;
    this.isModified.set(false);
    if (this.editorElement) {
      this.editorElement.value = '';
      this.setCaretRange(0, 0);
    }
  }

  loadDocument(content: string, name: string): void {
    this.flushTypingBatch();
    this.text.set(content);
    this.fileName.set(name);
    this.history = [];
    this.historyIndex = -1;
    this.isModified.set(false);
    if (this.editorElement) {
      this.editorElement.value = content;
      this.setCaretRange(0, 0);
    }
  }

  saveFile(): void {
    this.flushTypingBatch();
    const content = this.editorElement ? this.editorElement.value : this.text();
    this.downloadFile(content, this.fileName(), 'text/plain');
    this.isModified.set(false);
  }

  exportAs(format: 'txt' | 'md'): void {
    this.flushTypingBatch();
    const ext = format === 'md' ? '.md' : '.txt';
    const name = this.fileName().replace(/\.[^/.]+$/, '') + ext;
    const content = this.editorElement ? this.editorElement.value : this.text();
    this.downloadFile(content, name, 'text/plain');
  }

  private downloadFile(content: string, filename: string, type: string): void {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  printDocument(): void {
    this.flushTypingBatch();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const content = this.editorElement ? this.editorElement.value : this.text();
      printWindow.document.write(
        `<pre style="font-family: monospace; white-space: pre-wrap;">${content}</pre>`
      );
      printWindow.document.close();
      printWindow.print();
    }
  }

  loadSampleText(): void {
    const sample = `# Sample Lipi Editor Document

- Auto-Snippets Test:
  - Try typing :date:
  - Try typing :time:
  - Try typing :shrug:
  - Try typing :todo:

- Real-time Cursor Context Inspector:
  Inspect text dynamically before and after your cursor on the right panel.

- Custom Right-Click Context Menu:
  Right click anywhere inside this text area to convert case, select line, or insert timestamps.`;

    this.loadDocument(sample, 'Sample.txt');
  }

  // EDITING ACTIONS (All updated to use setRangeText & range deltas)
  async cutText(): Promise<void> {
    if (!this.editorElement) return;
    const start = this.editorElement.selectionStart;
    const end = this.editorElement.selectionEnd;
    if (start !== end) {
      const selected = this.editorElement.value.substring(start, end);
      await navigator.clipboard.writeText(selected);
      this.applyRangeEdit(start, end, '', 'end');
    }
  }

  async copyText(): Promise<void> {
    if (!this.editorElement) return;
    const start = this.editorElement.selectionStart;
    const end = this.editorElement.selectionEnd;
    if (start !== end) {
      const selected = this.editorElement.value.substring(start, end);
      await navigator.clipboard.writeText(selected);
    }
  }

  async pasteText(): Promise<void> {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText && this.editorElement) {
        const start = this.editorElement.selectionStart;
        const end = this.editorElement.selectionEnd;
        this.applyRangeEdit(start, end, clipText, 'end');
      }
    } catch {
      // Browser clipboard permission catch
    }
  }

  selectAll(): void {
    if (this.editorElement) {
      this.editorElement.select();
      this.updateCaretPosition();
    }
  }

  selectCurrentLine(): void {
    if (!this.editorElement) return;
    const val = this.editorElement.value;
    const pos = this.caretPos();
    const lineStart = val.lastIndexOf('\n', pos - 1) + 1;
    let lineEnd = val.indexOf('\n', pos);
    if (lineEnd === -1) lineEnd = val.length;
    this.setCaretRange(lineStart, lineEnd);
  }

  insertTimestamp(): void {
    const timestamp = new Date().toLocaleString();
    this.insertTextAtCaret(` [${timestamp}] `);
  }

  insertTextAtCaret(inserted: string): void {
    if (this.editorElement) {
      const start = this.editorElement.selectionStart;
      const end = this.editorElement.selectionEnd;
      this.applyRangeEdit(start, end, inserted, 'end');
    }
  }

  clearEditor(): void {
    if (this.editorElement) {
      this.applyRangeEdit(0, this.editorElement.value.length, '', 'end');
    }
  }

  transformSelection(mode: 'upper' | 'lower' | 'title'): void {
    if (!this.editorElement) return;
    const start = this.editorElement.selectionStart;
    const end = this.editorElement.selectionEnd;
    if (start !== end) {
      const selected = this.editorElement.value.substring(start, end);
      let transformed = selected;
      if (mode === 'upper') transformed = selected.toUpperCase();
      if (mode === 'lower') transformed = selected.toLowerCase();
      if (mode === 'title') {
        transformed = selected.replace(
          /\w\S*/g,
          (w) => w.charAt(0).toUpperCase() + w.substring(1).toLowerCase()
        );
      }
      this.applyRangeEdit(start, end, transformed, 'select');
    }
  }

  transformActiveWord(mode: 'upper' | 'lower'): void {
    if (!this.editorElement) return;
    const pos = this.editorElement.selectionStart;
    const val = this.editorElement.value;
    let start = pos;
    while (start > 0 && /\w/.test(val[start - 1])) start--;
    let end = pos;
    while (end < val.length && /\w/.test(val[end])) end++;
    if (start === end) return;

    const word = val.substring(start, end);
    const transformed = mode === 'upper' ? word.toUpperCase() : word.toLowerCase();
    this.applyRangeEdit(start, end, transformed, 'preserve');
  }

  cleanExtraWhitespace(): void {
    if (!this.editorElement) return;
    const text = this.editorElement.value;
    const regex = /[ \t]{2,}|\n{3,}/g;
    const matches: { start: number; end: number; newText: string }[] = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const matched = match[0];
      const replacement = matched.includes('\n') ? '\n\n' : ' ';
      matches.push({
        start: match.index,
        end: match.index + matched.length,
        newText: replacement,
      });
    }

    if (matches.length > 0) {
      this.applyBatchRangeEdit(matches, this.editorElement.selectionStart);
    }
  }

  // FIND & REPLACE OPERATIONS (All updated to use setRangeText & batch deltas)
  updateMatchesCount(query: string, matchCase: boolean): number {
    if (!query || !this.editorElement) return 0;
    const text = this.editorElement.value;
    const q = matchCase ? query : query.toLowerCase();
    const searchVal = matchCase ? text : text.toLowerCase();
    let count = 0;
    let idx = searchVal.indexOf(q);
    while (idx !== -1) {
      count++;
      idx = searchVal.indexOf(q, idx + q.length);
    }
    return count;
  }

  findNext(query: string, matchCase: boolean): void {
    if (!query || !this.editorElement) return;
    const text = this.editorElement.value;
    const q = matchCase ? query : query.toLowerCase();
    const searchVal = matchCase ? text : text.toLowerCase();

    const start = this.caretPos();
    let matchIdx = searchVal.indexOf(q, start);

    if (matchIdx === -1) {
      matchIdx = searchVal.indexOf(q, 0);
    }

    if (matchIdx !== -1) {
      const end = matchIdx + q.length;
      this.setCaretRange(matchIdx, end);
    }
  }

  replaceNext(query: string, replaceText: string, matchCase: boolean): void {
    if (!query || !this.editorElement) return;
    const start = this.editorElement.selectionStart;
    const end = this.editorElement.selectionEnd;
    const selected = this.editorElement.value.substring(start, end);

    const matches = matchCase
      ? selected === query
      : selected.toLowerCase() === query.toLowerCase();

    if (matches) {
      this.applyRangeEdit(start, end, replaceText, 'end');
      setTimeout(() => {
        this.findNext(query, matchCase);
      }, 0);
    } else {
      this.findNext(query, matchCase);
    }
  }

  replaceAll(query: string, replaceText: string, matchCase: boolean): void {
    if (!query || !this.editorElement) return;

    const text = this.editorElement.value;
    const q = matchCase ? query : query.toLowerCase();
    const searchVal = matchCase ? text : text.toLowerCase();

    const matches: { start: number; end: number; newText: string }[] = [];
    let idx = searchVal.indexOf(q);
    while (idx !== -1) {
      matches.push({ start: idx, end: idx + query.length, newText: replaceText });
      idx = searchVal.indexOf(q, idx + query.length);
    }

    if (matches.length > 0) {
      this.applyBatchRangeEdit(matches, this.editorElement.selectionStart);
    }
  }

  // VIEW OPTIONS
  toggleWordWrap(): void {
    this.wordWrap.update((v) => !v);
  }

  setFontFamily(font: string): void {
    this.fontFamily.set(font);
  }

  setFontSize(size: number): void {
    this.fontSize.set(Number(size));
  }

  toggleDarkMode(): void {
    this.isDarkMode.update((v) => !v);
  }

  toggleLineNumbers(): void {
    this.showLineNumbers.update((v) => !v);
  }

  toggleCaretInspector(): void {
    if (!this.enableCaretInspector()) {
      return;
    }
    this.showCaretInspector.update((v) => !v);
  }

  toggleStatusBar(): void {
    this.showStatusBar.update((v) => !v);
  }

  changeZoom(delta: number): void {
    this.zoomLevel.update((z) => Math.max(EC.MIN_ZOOM_LEVEL, Math.min(EC.MAX_ZOOM_LEVEL, z + delta)));
  }

  resetZoom(): void {
    this.zoomLevel.set(EC.DEFAULT_ZOOM_LEVEL);
  }
}
