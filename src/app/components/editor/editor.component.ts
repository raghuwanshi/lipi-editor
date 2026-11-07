import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditorService } from '../../services/editor.service';
import { UiStateService } from '../../services/ui-state.service';
import { SnippetService } from '../../services/snippet.service';
import { LineNumbersComponent } from '../line-numbers/line-numbers.component';
import * as EC from '../../constants/editor.constants';
import { LineNumberInfo } from '../../models/line-number.model';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [CommonModule, LineNumbersComponent],
  templateUrl: './editor.component.html',
  styles: [
    `
      :host {
        display: flex;
        flex: 1 1 0%;
        height: 100%;
        width: 100%;
        min-width: 0;
        min-height: 0;
        overflow: hidden;
        position: relative;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorComponent implements AfterViewInit, OnDestroy {
  @ViewChild('editorArea') editorArea!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('mirrorElement') mirrorElement?: ElementRef<HTMLDivElement>;
  @ViewChild(LineNumbersComponent) lineNumbers?: LineNumbersComponent;

  protected readonly editor = inject(EditorService);
  protected readonly ui = inject(UiStateService);
  protected readonly snippets = inject(SnippetService);

  private resizeObserver: ResizeObserver | null = null;
  private rafId: number | null = null;

  constructor() {
    effect(() => {
      // Re-evaluate line heights when text, wordWrap, font size/zoom, or font family change
      this.editor.text();
      this.editor.wordWrap();
      this.editor.effectiveFontSize();
      this.editor.fontFamily();
      this.scheduleLineHeightUpdate();
    });
  }

  ngAfterViewInit(): void {
    if (this.editorArea) {
      this.editor.setEditorElement(this.editorArea.nativeElement);
      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => {
          this.scheduleLineHeightUpdate();
        });
        this.resizeObserver.observe(this.editorArea.nativeElement);
      }
    }
    this.updateLineHeights();
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.editor.setEditorElement(null);
  }

  scheduleLineHeightUpdate(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.updateLineHeights();
    });
  }

  updateLineHeights(): void {
    if (!this.editorArea) return;
    const textarea = this.editorArea.nativeElement;
    const text = this.editor.text();
    const lines = text.split('\n');
    const count = Math.min(lines.length, EC.MAX_DISPLAYED_LINE_NUMBERS);
    const fontSize = this.editor.effectiveFontSize();
    const lineHeightVal = parseFloat(this.editor.lineHeight);
    const singleLineHeight = Math.round(fontSize * lineHeightVal);

    // If word wrap is disabled or mirror is not ready, each physical line occupies exactly 1 line height
    if (!this.editor.wordWrap() || !this.mirrorElement) {
      const fallback: LineNumberInfo[] = [];
      for (let i = 0; i < count; i++) {
        fallback.push({
          lineNumber: i + 1,
          height: singleLineHeight,
          visualLines: 1,
        });
      }
      this.editor.setLineNumbersInfo(fallback);
      return;
    }

    const mirror = this.mirrorElement.nativeElement;
    const availableWidth = textarea.clientWidth;

    if (availableWidth <= 0) {
      const fallback: LineNumberInfo[] = [];
      for (let i = 0; i < count; i++) {
        fallback.push({
          lineNumber: i + 1,
          height: singleLineHeight,
          visualLines: 1,
        });
      }
      this.editor.setLineNumbersInfo(fallback);
      return;
    }

    const textareaStyle = window.getComputedStyle(textarea);
    const paddingLeft = parseFloat(textareaStyle.paddingLeft) || 8;
    const paddingRight = parseFloat(textareaStyle.paddingRight) || 8;

    mirror.style.width = availableWidth + 'px';
    mirror.style.paddingLeft = paddingLeft + 'px';
    mirror.style.paddingRight = paddingRight + 'px';
    mirror.style.fontFamily = textareaStyle.fontFamily;
    mirror.style.fontSize = textareaStyle.fontSize;
    mirror.style.lineHeight = textareaStyle.lineHeight;
    mirror.style.letterSpacing = textareaStyle.letterSpacing;
    mirror.style.tabSize = textareaStyle.tabSize;
    mirror.style.wordBreak = textareaStyle.wordBreak || 'normal';
    mirror.style.overflowWrap = textareaStyle.overflowWrap || 'break-word';

    mirror.textContent = '';
    const fragment = document.createDocumentFragment();
    const lineDivs: HTMLDivElement[] = [];

    // Reference single-line div to measure exact rendered base height
    const refDiv = document.createElement('div');
    refDiv.textContent = '\u00A0';
    fragment.appendChild(refDiv);

    for (let i = 0; i < count; i++) {
      const div = document.createElement('div');
      div.textContent = lines[i] === '' ? '\u00A0' : lines[i];
      fragment.appendChild(div);
      lineDivs.push(div);
    }

    mirror.appendChild(fragment);

    const actualSingleLineHeight = refDiv.offsetHeight || singleLineHeight;
    const result: LineNumberInfo[] = [];

    for (let i = 0; i < count; i++) {
      const measured = lineDivs[i].offsetHeight;
      const visualLines = Math.max(1, Math.round(measured / actualSingleLineHeight));
      result.push({
        lineNumber: i + 1,
        height: visualLines * actualSingleLineHeight,
        visualLines,
      });
    }

    this.editor.setLineNumbersInfo(result);
  }

  onEditorInput(event: Event): void {
    if (!this.editorArea) return;
    const textarea = this.editorArea.nativeElement;
    const pos = textarea.selectionStart;

    // 1. Check Snippet trigger on the characters immediately before caret (O(1) lookback)
    const lookback = textarea.value.substring(Math.max(0, pos - EC.SNIPPET_LOOKBACK_CHAR_COUNT), pos);
    const snippetMatch = this.snippets.findMatchingSnippet(lookback, pos);

    if (snippetMatch) {
      // Use setRangeText for instant snippet replacement and push delta to history
      this.editor.applyRangeEdit(
        snippetMatch.start,
        snippetMatch.end,
        snippetMatch.replacement,
        'end'
      );
      this.scheduleLineHeightUpdate();
      this.syncGutterScroll();
      return;
    }

    // 2. Coalesce user typing into lightweight delta steps
    this.editor.recordTypingInput(event as InputEvent);
    this.editor.updateCaretPosition();
    this.scheduleLineHeightUpdate();
    this.syncGutterScroll();
  }

  onKeyDown(event: KeyboardEvent): void {
    // Tab key support using setRangeText and range delta
    if (event.key === 'Tab') {
      event.preventDefault();
      const textarea = this.editorArea.nativeElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      this.editor.applyRangeEdit(start, end, EC.TAB_INDENT_SPACES, 'end');
      this.scheduleLineHeightUpdate();
    }
  }

  updateCaretPosition(): void {
    this.editor.updateCaretPosition();
  }

  syncGutterScroll(): void {
    if (this.editorArea && this.lineNumbers) {
      this.lineNumbers.syncScroll(this.editorArea.nativeElement.scrollTop);
      requestAnimationFrame(() => {
        if (this.editorArea && this.lineNumbers) {
          this.lineNumbers.syncScroll(this.editorArea.nativeElement.scrollTop);
        }
      });
    }
  }

  onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    this.ui.openContextMenu(event.clientX, event.clientY);
  }
}
