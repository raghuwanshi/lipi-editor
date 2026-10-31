export interface FontOption {
  label: string;
  value: string;
}

export const FONT_OPTIONS: FontOption[] = [
  { label: 'Consolas (Monospace)', value: 'Consolas, "Courier New", monospace' },
  { label: 'Segoe UI (Sans-Serif)', value: '"Segoe UI", -apple-system, sans-serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace' },
  { label: 'Fira Code / JetBrains', value: '"Fira Code", "JetBrains Mono", monospace' },
  { label: 'Georgia (Serif)', value: 'Georgia, serif' },
];

export const FONT_SIZE_OPTIONS: number[] = [10, 12, 14, 16, 18, 20, 24, 28, 32];

