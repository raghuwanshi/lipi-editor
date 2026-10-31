import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditorService } from '../../services/editor.service';

@Component({
  selector: 'app-status-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-bar.component.html',
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
export class StatusBarComponent {
  protected readonly editor = inject(EditorService);
}
