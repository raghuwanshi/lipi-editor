import { TestBed } from '@angular/core/testing';
import { EditorService } from './editor.service';
import * as EC from '../constants/editor.constants';

describe('EditorService', () => {
  let service: EditorService;
  let textarea: HTMLTextAreaElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EditorService],
    });
    service = TestBed.inject(EditorService);
    textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    service.setEditorElement(textarea);
  });

  afterEach(() => {
    document.body.removeChild(textarea);
    service.setEditorElement(null);
  });

  it('should initialize with default constants and welcome text', () => {
    expect(service.fontSize()).toBe(EC.DEFAULT_FONT_SIZE);
    expect(service.zoomLevel()).toBe(EC.DEFAULT_ZOOM_LEVEL);
    expect(service.lineNumbersArray().length).toBeGreaterThan(1);
  });

  it('should dynamically update line numbers when appending new lines at the end of the document', () => {
    service.text.set('Line 1');
    expect(service.lineNumbersArray()).toEqual([1]);

    // Append newline at the end
    service.text.set('Line 1\n');
    expect(service.lineNumbersArray()).toEqual([1, 2]);

    // Append another newline at the end
    service.text.set('Line 1\n\n');
    expect(service.lineNumbersArray()).toEqual([1, 2, 3]);

    // Append third line
    service.text.set('Line 1\nLine 2\nLine 3');
    expect(service.lineNumbersArray()).toEqual([1, 2, 3]);

    // Append trailing newline after third line
    service.text.set('Line 1\nLine 2\nLine 3\n');
    expect(service.lineNumbersArray()).toEqual([1, 2, 3, 4]);
  });

  it('should clamp zoom level between MIN_ZOOM_LEVEL and MAX_ZOOM_LEVEL', () => {
    service.resetZoom();
    expect(service.zoomLevel()).toBe(EC.DEFAULT_ZOOM_LEVEL);

    service.changeZoom(EC.ZOOM_STEP);
    expect(service.zoomLevel()).toBe(EC.DEFAULT_ZOOM_LEVEL + EC.ZOOM_STEP);

    // Zoom out beyond minimum
    service.changeZoom(-500);
    expect(service.zoomLevel()).toBe(EC.MIN_ZOOM_LEVEL);

    // Zoom in beyond maximum
    service.changeZoom(1000);
    expect(service.zoomLevel()).toBe(EC.MAX_ZOOM_LEVEL);
  });

  it('should perform range edit and undo/redo correctly via setRangeText', () => {
    textarea.value = 'Hello World';
    service.text.set('Hello World');
    service.updateCaretPosition();

    // Replace "World" with "Lipi"
    service.applyRangeEdit(6, 11, 'Lipi', 'end');
    expect(textarea.value).toBe('Hello Lipi');
    expect(service.text()).toBe('Hello Lipi');
    expect(service.canUndo()).toBe(true);

    // Undo edit
    service.undo();
    expect(textarea.value).toBe('Hello World');
    expect(service.text()).toBe('Hello World');
    expect(service.canRedo()).toBe(true);

    // Redo edit
    service.redo();
    expect(textarea.value).toBe('Hello Lipi');
    expect(service.text()).toBe('Hello Lipi');
  });

  it('should navigate caret to the target line using goToLine', () => {
    service.text.set('Line 1\nLine 2\nLine 3\nLine 4');
    textarea.value = 'Line 1\nLine 2\nLine 3\nLine 4';

    // Navigate to Line 3 (index of 'L' in Line 3 is 14: "Line 1\nLine 2\n" = 7 + 7 = 14)
    service.goToLine(3);
    expect(service.caretPos()).toBe(14);
    expect(service.currentLineNumber()).toBe(3);

    // Navigate to Line 1
    service.goToLine(1);
    expect(service.caretPos()).toBe(0);
    expect(service.currentLineNumber()).toBe(1);
  });

  it('should compute effectiveFontSize proportionally with zoomLevel', () => {
    service.setFontSize(14);
    service.resetZoom();
    expect(service.effectiveFontSize()).toBe(14);

    service.changeZoom(50); // 150% zoom
    expect(service.effectiveFontSize()).toBe(21); // 14 * 1.5 = 21

    service.changeZoom(-100); // 50% zoom (MIN_ZOOM_LEVEL)
    expect(service.effectiveFontSize()).toBe(7); // 14 * 0.5 = 7
  });

  it('should store and retrieve wrapped line information in lineNumbersInfo', () => {
    const customInfo = [
      { lineNumber: 1, height: 63, visualLines: 3 },
      { lineNumber: 2, height: 21, visualLines: 1 },
      { lineNumber: 3, height: 42, visualLines: 2 },
    ];
    service.setLineNumbersInfo(customInfo);
    expect(service.lineNumbersInfo()).toEqual(customInfo);
    expect(service.lineNumbersInfo()[0].height).toBe(63);
    expect(service.lineNumbersInfo()[0].visualLines).toBe(3);
    expect(service.lineNumbersInfo()[1].lineNumber).toBe(2);
  });
});
