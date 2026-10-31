import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditorService } from '../../../services/editor.service';
import { UiStateService } from '../../../services/ui-state.service';

@Component({
  selector: 'app-about-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutModalComponent {
  protected readonly editor = inject(EditorService);
  protected readonly ui = inject(UiStateService);

  closeModal(): void {
    this.ui.closeAboutModal();
  }
}

