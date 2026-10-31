import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditorService } from '../../services/editor.service';
import { SnippetService } from '../../services/snippet.service';

@Component({
  selector: 'app-caret-inspector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './caret-inspector.component.html',
  styles: [
    `
      :host {
        display: flex;
        height: 100%;
        flex-shrink: 0;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CaretInspectorComponent {
  protected readonly editor = inject(EditorService);
  protected readonly snippets = inject(SnippetService);

  readonly activeMatchingRule = computed(() =>
    this.snippets.getActiveMatchingRule(this.editor.textBeforeCaret())
  );
}
