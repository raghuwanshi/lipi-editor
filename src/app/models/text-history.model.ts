export interface TextDelta {
  start: number;
  end: number;
  oldText: string;
  newText: string;
}

export interface HistoryStep {
  deltas: TextDelta[];
  caretBefore: number;
  caretAfter: number;
  selectionEndBefore?: number;
  selectionEndAfter?: number;
}
