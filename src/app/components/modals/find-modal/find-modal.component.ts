import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EditorService } from '../../../services/editor.service';
import { UiStateService } from '../../../services/ui-state.service';

@Component({
  selector: 'app-find-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './find-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FindModalComponent {
  protected readonly editor = inject(EditorService);
  protected readonly ui = inject(UiStateService);

  findQuery = '';
  replaceQuery = '';
  matchCase = false;
  readonly findMatchesCount = signal<number>(0);

  onFindQueryChange(): void {
    const count = this.editor.updateMatchesCount(this.findQuery, this.matchCase);
    this.findMatchesCount.set(count);
  }

  findNext(): void {
    this.editor.findNext(this.findQuery, this.matchCase);
  }

  replaceNext(): void {
    this.editor.replaceNext(this.findQuery, this.replaceQuery, this.matchCase);
    this.onFindQueryChange();
  }

  replaceAll(): void {
    this.editor.replaceAll(this.findQuery, this.replaceQuery, this.matchCase);
    this.onFindQueryChange();
  }

  closeModal(): void {
    this.ui.closeFindModal();
  }
}
