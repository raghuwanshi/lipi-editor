import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditorService } from '../../services/editor.service';
import { UiStateService } from '../../services/ui-state.service';

@Component({
  selector: 'app-context-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './context-menu.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContextMenuComponent {
  protected readonly editor = inject(EditorService);
  protected readonly ui = inject(UiStateService);

  onCut(): void {
    this.editor.cutText();
    this.ui.closeContextMenu();
  }

  onCopy(): void {
    this.editor.copyText();
    this.ui.closeContextMenu();
  }

  onPaste(): void {
    this.editor.pasteText();
    this.ui.closeContextMenu();
  }

  onSelectLine(): void {
    this.editor.selectCurrentLine();
    this.ui.closeContextMenu();
  }

  onUppercaseWord(): void {
    this.editor.transformActiveWord('upper');
    this.ui.closeContextMenu();
  }

  onLowercaseWord(): void {
    this.editor.transformActiveWord('lower');
    this.ui.closeContextMenu();
  }

  onInsertTimestamp(): void {
    this.editor.insertTimestamp();
    this.ui.closeContextMenu();
  }

  onClear(): void {
    this.editor.clearEditor();
    this.ui.closeContextMenu();
  }
}

