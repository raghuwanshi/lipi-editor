import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EditorService } from '../../../services/editor.service';
import { UiStateService } from '../../../services/ui-state.service';
import { SnippetService } from '../../../services/snippet.service';

@Component({
  selector: 'app-snippets-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './snippets-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SnippetsModalComponent {
  protected readonly editor = inject(EditorService);
  protected readonly ui = inject(UiStateService);
  protected readonly snippets = inject(SnippetService);

  newRuleTrigger = '';
  newRuleReplacement = '';
  newRuleDescription = '';

  addNewRule(): void {
    const success = this.snippets.addNewRule(
      this.newRuleTrigger,
      this.newRuleReplacement,
      this.newRuleDescription
    );
    if (success) {
      this.newRuleTrigger = '';
      this.newRuleReplacement = '';
      this.newRuleDescription = '';
    }
  }

  toggleRule(id: string): void {
    this.snippets.toggleRuleEnabled(id);
  }

  deleteRule(id: string): void {
    this.snippets.deleteRule(id);
  }

  resetDefaults(): void {
    this.snippets.resetDefaultSnippets();
  }

  closeModal(): void {
    this.ui.closeSnippetsModal();
  }
}

