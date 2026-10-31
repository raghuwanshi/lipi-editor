import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EditorService } from '../../services/editor.service';
import { UiStateService } from '../../services/ui-state.service';
import { FONT_OPTIONS, FONT_SIZE_OPTIONS } from '../../models/editor-options.model';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './toolbar.component.html',
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        flex-shrink: 0;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToolbarComponent {
  protected readonly editor = inject(EditorService);
  protected readonly ui = inject(UiStateService);

  readonly fontOptions = FONT_OPTIONS;
  readonly fontSizeOptions = FONT_SIZE_OPTIONS;
  readonly openFileInput = output<void>();

  triggerFileInput(): void {
    this.openFileInput.emit();
  }
}
