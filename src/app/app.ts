import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditorService } from './services/editor.service';
import { UiStateService } from './services/ui-state.service';
import { HeaderComponent } from './components/header/header.component';
import { ToolbarComponent } from './components/toolbar/toolbar.component';
import { EditorComponent } from './components/editor/editor.component';
import { CaretInspectorComponent } from './components/caret-inspector/caret-inspector.component';
import { StatusBarComponent } from './components/status-bar/status-bar.component';
import { ContextMenuComponent } from './components/context-menu/context-menu.component';
import { FindModalComponent } from './components/modals/find-modal/find-modal.component';
import { SnippetsModalComponent } from './components/modals/snippets-modal/snippets-modal.component';
import { AboutModalComponent } from './components/modals/about-modal/about-modal.component';
import * as EC from './constants/editor.constants';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    ToolbarComponent,
    EditorComponent,
    CaretInspectorComponent,
    StatusBarComponent,
    ContextMenuComponent,
    FindModalComponent,
    SnippetsModalComponent,
    AboutModalComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  protected readonly editor = inject(EditorService);
  protected readonly ui = inject(UiStateService);

  @HostListener('document:click')
  onDocumentClick(): void {
    this.ui.closeMenus();
  }

  @HostListener('document:keydown', ['$event'])
  onGlobalKeyDown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey) {
      switch (event.key.toLowerCase()) {
        case 'n':
          event.preventDefault();
          this.editor.newDocument();
          break;
        case 'o':
          event.preventDefault();
          this.triggerFileInput();
          break;
        case 's':
          event.preventDefault();
          this.editor.saveFile();
          break;
        case 'z':
          event.preventDefault();
          if (event.shiftKey) {
            this.editor.redo();
          } else {
            this.editor.undo();
          }
          break;
        case 'y':
          event.preventDefault();
          this.editor.redo();
          break;
        case 'f':
          event.preventDefault();
          this.ui.openFindModal();
          break;
        case 'p':
          event.preventDefault();
          this.editor.printDocument();
          break;
        case '=':
        case '+':
          event.preventDefault();
          this.editor.changeZoom(EC.ZOOM_STEP);
          break;
        case '-':
          event.preventDefault();
          this.editor.changeZoom(-EC.ZOOM_STEP);
          break;
        case '0':
          event.preventDefault();
          this.editor.resetZoom();
          break;
      }
    } else if (event.key === 'F5') {
      event.preventDefault();
      this.editor.insertTimestamp();
    }
  }

  triggerFileInput(): void {
    if (this.fileInput) {
      this.fileInput.nativeElement.click();
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        this.editor.loadDocument(content, file.name);
        input.value = '';
      };
      reader.readAsText(file);
    }
  }
}
