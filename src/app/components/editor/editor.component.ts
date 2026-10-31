import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditorService } from '../../services/editor.service';
import { UiStateService } from '../../services/ui-state.service';
import { SnippetService } from '../../services/snippet.service';
import { LineNumbersComponent } from '../line-numbers/line-numbers.component';

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
  @ViewChild(LineNumbersComponent) lineNumbers?: LineNumbersComponent;

  protected readonly editor = inject(EditorService);
  protected readonly ui = inject(UiStateService);
  protected readonly snippets = inject(SnippetService);

  ngAfterViewInit(): void {
    if (this.editorArea) {
      this.editor.setEditorElement(this.editorArea.nativeElement);
    }
  }

  ngOnDestroy(): void {
    this.editor.setEditorElement(null);
  }

  onEditorInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    const newText = target.value;
    const pos = target.selectionStart;

    // Check Auto-Replace Engine logic
    const snippetResult = this.snippets.checkAndApplySnippet(newText, pos);
    if (snippetResult) {
      this.editor.text.set(snippetResult.text);
      this.editor.pushHistory(snippetResult.text, snippetResult.newPos);

      setTimeout(() => {
        this.editor.setCaretRange(snippetResult.newPos, snippetResult.newPos);
      }, 0);
      return;
    }

    this.editor.text.set(newText);
    this.editor.updateCaretPosition();
    this.editor.pushHistory(newText, pos);
  }

  onKeyDown(event: KeyboardEvent): void {
    // Tab key support
    if (event.key === 'Tab') {
      event.preventDefault();
      const textarea = this.editorArea.nativeElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const current = this.editor.text();

      const newText = current.substring(0, start) + '  ' + current.substring(end);
      this.editor.text.set(newText);
      this.editor.pushHistory(newText, start + 2);

      setTimeout(() => {
        this.editor.setCaretRange(start + 2, start + 2);
      }, 0);
    }
  }

  updateCaretPosition(): void {
    this.editor.updateCaretPosition();
  }

  syncGutterScroll(): void {
    if (this.editorArea && this.lineNumbers) {
      this.lineNumbers.syncScroll(this.editorArea.nativeElement.scrollTop);
    }
  }

  onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    this.ui.openContextMenu(event.clientX, event.clientY);
  }
}
