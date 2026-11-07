import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditorService } from '../../services/editor.service';

@Component({
  selector: 'app-line-numbers',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './line-numbers.component.html',
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
export class LineNumbersComponent {
  @ViewChild('lineGutter') lineGutter!: ElementRef<HTMLDivElement>;
  protected readonly editor = inject(EditorService);

  syncScroll(scrollTop: number): void {
    if (this.lineGutter) {
      this.lineGutter.nativeElement.scrollTop = scrollTop;
    }
  }

  onLineClick(lineNumber: number): void {
    this.editor.goToLine(lineNumber);
  }
}
