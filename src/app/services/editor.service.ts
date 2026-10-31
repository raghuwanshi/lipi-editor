import { Injectable, computed, signal } from '@angular/core';
import { TextHistoryState } from '../models/text-history.model';

const INITIAL_WELCOME_TEXT = `Welcome to Lipi Editor!

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

@Injectable({
  providedIn: 'root',
})
export class EditorService {
  private editorElement: HTMLTextAreaElement | null = null;

  // Document State
  readonly fileName = signal<string>('Untitled.txt');
  readonly text = signal<string>(INITIAL_WELCOME_TEXT);
  readonly isModified = signal<boolean>(false);

  // Feature Flags
  // Caret Context Inspector is hidden by default. Set to true in code to enable inspector controls in menu and toolbar.
  readonly enableCaretInspector = signal<boolean>(false);

  // Formatting & View State
  readonly wordWrap = signal<boolean>(true);
  readonly fontFamily = signal<string>('Consolas, "Courier New", monospace');
  readonly fontSize = signal<number>(14);
  readonly zoomLevel = signal<number>(100);
  readonly isDarkMode = signal<boolean>(true);
  readonly showLineNumbers = signal<boolean>(true);
  readonly showCaretInspector = signal<boolean>(false);
  readonly showStatusBar = signal<boolean>(true);

  // Caret & Selection State
  readonly caretPos = signal<number>(0);
  readonly selectionEnd = signal<number>(0);

  // History State
  private history: TextHistoryState[] = [];
  private historyIndex = -1;
  readonly canUndo = computed(() => this.historyIndex > 0);
  readonly canRedo = computed(() => this.historyIndex < this.history.length - 1);

  // Computed Properties
  readonly currentLineNumber = computed(() => {
    const val = this.text().substring(0, this.caretPos());
    return val.split('\n').length;
  });

  readonly currentColNumber = computed(() => {
    const val = this.text().substring(0, this.caretPos());
    const lastNewline = val.lastIndexOf('\n');
    return lastNewline === -1 ? val.length + 1 : val.length - lastNewline;
  });

  readonly lineNumbersArray = computed(() => {
    const totalLines = this.text().split('\n').length;
    return Array.from({ length: Math.max(1, totalLines) }, (_, i) => i + 1);
  });

  readonly charCount = computed(() => this.text().length);

  readonly wordCount = computed(() => {
    const trimmed = this.text().trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  });

  readonly selectionLength = computed(() =>
    Math.abs(this.selectionEnd() - this.caretPos())
  );

  readonly textBeforeCaret = computed(() => {
    const pos = this.caretPos();
    const val = this.text();
    const start = Math.max(0, pos - 20);
    return val.substring(start, pos);
  });

  readonly textAfterCaret = computed(() => {
    const pos = this.caretPos();
    const val = this.text();
    const end = Math.min(val.length, pos + 20);
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
    this.pushHistory(this.text(), 0);
    this.isModified.set(false);
  }

  setEditorElement(el: HTMLTextAreaElement | null): void {
    this.editorElement = el;
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
    }
  }

  // History & Undo / Redo
  pushHistory(textValue: string, caretIndex: number): void {
    this.isModified.set(true);
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }
    this.history.push({ text: textValue, caretPos: caretIndex });
    this.historyIndex = this.history.length - 1;
  }

  undo(): void {
    if (this.canUndo()) {
      this.historyIndex--;
      const state = this.history[this.historyIndex];
      this.text.set(state.text);
      setTimeout(() => {
        this.setCaretRange(state.caretPos, state.caretPos);
      }, 0);
    }
  }

  redo(): void {
    if (this.canRedo()) {
      this.historyIndex++;
      const state = this.history[this.historyIndex];
      this.text.set(state.text);
      setTimeout(() => {
        this.setCaretRange(state.caretPos, state.caretPos);
      }, 0);
    }
  }

  // Document Operations
  newDocument(): void {
    this.text.set('');
    this.fileName.set('Untitled.txt');
    this.history = [];
    this.historyIndex = -1;
    this.pushHistory('', 0);
    this.isModified.set(false);
    if (this.editorElement) {
      this.setCaretRange(0, 0);
    }
  }

  loadDocument(content: string, name: string): void {
    this.text.set(content);
    this.fileName.set(name);
    this.history = [];
    this.historyIndex = -1;
    this.pushHistory(content, 0);
    this.isModified.set(false);
  }

  saveFile(): void {
    this.downloadFile(this.text(), this.fileName(), 'text/plain');
    this.isModified.set(false);
  }

  exportAs(format: 'txt' | 'md'): void {
    const ext = format === 'md' ? '.md' : '.txt';
    const name = this.fileName().replace(/\.[^/.]+$/, '') + ext;
    this.downloadFile(this.text(), name, 'text/plain');
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
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(
        `<pre style="font-family: monospace; white-space: pre-wrap;">${this.text()}</pre>`
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

    this.text.set(sample);
    this.pushHistory(sample, 0);
  }

  // Editing Actions
  async cutText(): Promise<void> {
    if (this.editorElement) {
      const start = this.editorElement.selectionStart;
      const end = this.editorElement.selectionEnd;
      if (start !== end) {
        const selected = this.text().substring(start, end);
        await navigator.clipboard.writeText(selected);
        const newText = this.text().substring(0, start) + this.text().substring(end);
        this.text.set(newText);
        this.pushHistory(newText, start);
        setTimeout(() => {
          this.setCaretRange(start, start);
        }, 0);
      }
    }
  }

  async copyText(): Promise<void> {
    if (this.editorElement) {
      const start = this.editorElement.selectionStart;
      const end = this.editorElement.selectionEnd;
      if (start !== end) {
        const selected = this.text().substring(start, end);
        await navigator.clipboard.writeText(selected);
      }
    }
  }

  async pasteText(): Promise<void> {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText && this.editorElement) {
        const start = this.editorElement.selectionStart;
        const end = this.editorElement.selectionEnd;
        const newText = this.text().substring(0, start) + clipText + this.text().substring(end);
        this.text.set(newText);
        const newPos = start + clipText.length;
        this.pushHistory(newText, newPos);
        setTimeout(() => {
          this.setCaretRange(newPos, newPos);
        }, 0);
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
    const val = this.text();
    const pos = this.caretPos();
    const lineStart = val.lastIndexOf('\n', pos - 1) + 1;
    let lineEnd = val.indexOf('\n', pos);
    if (lineEnd === -1) lineEnd = val.length;

    if (this.editorElement) {
      this.setCaretRange(lineStart, lineEnd);
    }
  }

  insertTimestamp(): void {
    const timestamp = new Date().toLocaleString();
    this.insertTextAtCaret(` [${timestamp}] `);
  }

  insertTextAtCaret(inserted: string): void {
    if (this.editorElement) {
      const start = this.editorElement.selectionStart;
      const end = this.editorElement.selectionEnd;
      const newText = this.text().substring(0, start) + inserted + this.text().substring(end);
      this.text.set(newText);
      const newPos = start + inserted.length;
      this.pushHistory(newText, newPos);
      setTimeout(() => {
        this.setCaretRange(newPos, newPos);
      }, 0);
    }
  }

  clearEditor(): void {
    this.text.set('');
    this.pushHistory('', 0);
    this.updateCaretPosition();
  }

  transformSelection(mode: 'upper' | 'lower' | 'title'): void {
    if (this.editorElement) {
      const start = this.editorElement.selectionStart;
      const end = this.editorElement.selectionEnd;
      if (start !== end) {
        const selected = this.text().substring(start, end);
        let transformed = selected;
        if (mode === 'upper') transformed = selected.toUpperCase();
        if (mode === 'lower') transformed = selected.toLowerCase();
        if (mode === 'title') {
          transformed = selected.replace(
            /\w\S*/g,
            (w) => w.charAt(0).toUpperCase() + w.substring(1).toLowerCase()
          );
        }
        const newText = this.text().substring(0, start) + transformed + this.text().substring(end);
        this.text.set(newText);
        this.pushHistory(newText, end);
        setTimeout(() => {
          this.setCaretRange(start, end);
        }, 0);
      }
    }
  }

  transformActiveWord(mode: 'upper' | 'lower'): void {
    const word = this.activeWordUnderCaret();
    if (!word) return;

    const val = this.text();
    const pos = this.caretPos();
    let start = pos;
    while (start > 0 && /\w/.test(val[start - 1])) start--;
    let end = pos;
    while (end < val.length && /\w/.test(val[end])) end++;

    const transformed = mode === 'upper' ? word.toUpperCase() : word.toLowerCase();
    const newText = val.substring(0, start) + transformed + val.substring(end);
    this.text.set(newText);
    const newPos = start + transformed.length;
    this.pushHistory(newText, newPos);
    setTimeout(() => {
      this.setCaretRange(newPos, newPos);
    }, 0);
  }

  cleanExtraWhitespace(): void {
    const cleaned = this.text()
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n');
    this.text.set(cleaned);
    this.pushHistory(cleaned, 0);
  }

  // Find & Replace Operations
  updateMatchesCount(query: string, matchCase: boolean): number {
    if (!query) return 0;
    const flags = matchCase ? 'g' : 'gi';
    const regex = new RegExp(this.escapeRegExp(query), flags);
    const matches = this.text().match(regex);
    return matches ? matches.length : 0;
  }

  findNext(query: string, matchCase: boolean): void {
    if (!query || !this.editorElement) return;
    const val = this.text();
    const q = matchCase ? query : query.toLowerCase();
    const currentVal = matchCase ? val : val.toLowerCase();

    const start = this.caretPos();
    let matchIdx = currentVal.indexOf(q, start);

    if (matchIdx === -1) {
      matchIdx = currentVal.indexOf(q, 0);
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
    const selected = this.text().substring(start, end);

    const matches = matchCase
      ? selected === query
      : selected.toLowerCase() === query.toLowerCase();

    if (matches) {
      const newText = this.text().substring(0, start) + replaceText + this.text().substring(end);
      this.text.set(newText);
      const newPos = start + replaceText.length;
      this.pushHistory(newText, newPos);
      setTimeout(() => {
        this.findNext(query, matchCase);
      }, 0);
    } else {
      this.findNext(query, matchCase);
    }
  }

  replaceAll(query: string, replaceText: string, matchCase: boolean): void {
    if (!query) return;
    const flags = matchCase ? 'g' : 'gi';
    const regex = new RegExp(this.escapeRegExp(query), flags);
    const newText = this.text().replace(regex, replaceText);
    this.text.set(newText);
    this.pushHistory(newText, 0);
  }

  private escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // View Options
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
    this.zoomLevel.update((z) => Math.max(50, Math.min(200, z + delta)));
  }

  resetZoom(): void {
    this.zoomLevel.set(100);
  }
}

