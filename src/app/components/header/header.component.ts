import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditorService } from '../../services/editor.service';
import { UiStateService } from '../../services/ui-state.service';
import { SnippetService } from '../../services/snippet.service';
import { FONT_OPTIONS } from '../../models/editor-options.model';
import * as EC from '../../constants/editor.constants';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
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
export class HeaderComponent {
  protected readonly editor = inject(EditorService);
  protected readonly ui = inject(UiStateService);
  protected readonly snippets = inject(SnippetService);

  readonly fontOptions = FONT_OPTIONS;
  readonly zoomStep = EC.ZOOM_STEP;
  readonly openFileInput = output<void>();

  triggerFileInput(): void {
    this.ui.activeMenu.set(null);
    this.openFileInput.emit();
  }

  toggleMenu(name: string, event: MouseEvent): void {
    event.stopPropagation();
    if (event.type !== "mouseover"
      || (this.ui.activeMenu() !== null
        && this.ui.activeMenu() !== name))
      this.ui.toggleMenu(name);
  }
}
