export interface SnippetRule {
  id: string;
  trigger: string;
  replacement: string;
  description: string;
  enabled: boolean;
}

export const DEFAULT_SNIPPET_RULES: SnippetRule[] = [
  {
    id: '1',
    trigger: ':date:',
    replacement: new Date().toISOString().split('T')[0],
    description: 'Current Date',
    enabled: true,
  },
  {
    id: '2',
    trigger: ':time:',
    replacement: new Date().toLocaleTimeString(),
    description: 'Current Time',
    enabled: true,
  },
  {
    id: '3',
    trigger: ':shrug:',
    replacement: '¯\\_(ツ)_/¯',
    description: 'Shrug Emoticon',
    enabled: true,
  },
  {
    id: '4',
    trigger: ':todo:',
    replacement: '[ ] ',
    description: 'Todo Box',
    enabled: true,
  },
  {
    id: '5',
    trigger: ':lorem:',
    replacement: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    description: 'Lorem Sample',
    enabled: true,
  },
  {
    id: '6',
    trigger: ':email:',
    replacement: 'user@example.com',
    description: 'Sample Email',
    enabled: true,
  },
];

