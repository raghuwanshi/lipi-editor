import { Injectable, signal } from '@angular/core';
import { DEFAULT_SNIPPET_RULES, SnippetRule } from '../models/snippet-rule.model';

export interface SnippetMatch {
  start: number;
  end: number;
  trigger: string;
  replacement: string;
}

@Injectable({
  providedIn: 'root',
})
export class SnippetService {
  readonly snippetRules = signal<SnippetRule[]>([...DEFAULT_SNIPPET_RULES]);
  readonly autoReplaceEnabled = signal<boolean>(true);

  toggleAutoReplace(): void {
    this.autoReplaceEnabled.update((v) => !v);
  }

  addNewRule(trigger: string, replacement: string, description: string): boolean {
    const trimmedTrigger = trigger.trim();
    if (!trimmedTrigger || !replacement) {
      return false;
    }

    const newRule: SnippetRule = {
      id: Date.now().toString(),
      trigger: trimmedTrigger,
      replacement,
      description: description.trim() || 'Custom Rule',
      enabled: true,
    };

    this.snippetRules.update((rules) => [newRule, ...rules]);
    return true;
  }

  toggleRuleEnabled(id: string): void {
    this.snippetRules.update((rules) =>
      rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  }

  deleteRule(id: string): void {
    this.snippetRules.update((rules) => rules.filter((r) => r.id !== id));
  }

  resetDefaultSnippets(): void {
    this.snippetRules.set([
      { id: '1', trigger: ':date:', replacement: new Date().toISOString().split('T')[0], description: 'Current Date', enabled: true },
      { id: '2', trigger: ':time:', replacement: new Date().toLocaleTimeString(), description: 'Current Time', enabled: true },
      { id: '3', trigger: ':shrug:', replacement: '¯\\_(ツ)_/¯', description: 'Shrug Emoticon', enabled: true },
      { id: '4', trigger: ':todo:', replacement: '[ ] ', description: 'Todo Box', enabled: true },
      { id: '5', trigger: ':lorem:', replacement: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.', description: 'Lorem Sample', enabled: true },
    ]);
  }

  getActiveMatchingRule(textBeforeCaret: string): SnippetRule | null {
    const activeRules = this.snippetRules().filter((r) => r.enabled);
    for (const rule of activeRules) {
      if (textBeforeCaret.endsWith(rule.trigger)) {
        return rule;
      }
    }
    return null;
  }

  findMatchingSnippet(textBeforeCaret: string, caretPos: number): SnippetMatch | null {
    if (!this.autoReplaceEnabled()) {
      return null;
    }

    const activeRules = this.snippetRules().filter((r) => r.enabled);

    for (const rule of activeRules) {
      if (textBeforeCaret.endsWith(rule.trigger)) {
        const replacement =
          rule.trigger === ':date:'
            ? new Date().toISOString().split('T')[0]
            : rule.trigger === ':time:'
            ? new Date().toLocaleTimeString()
            : rule.replacement;

        const triggerStart = caretPos - rule.trigger.length;
        return {
          start: triggerStart,
          end: caretPos,
          trigger: rule.trigger,
          replacement,
        };
      }
    }
    return null;
  }

  checkAndApplySnippet(text: string, caretPos: number): { text: string; newPos: number } | null {
    const match = this.findMatchingSnippet(text.substring(0, caretPos), caretPos);
    if (!match) {
      return null;
    }
    const newText = text.substring(0, match.start) + match.replacement + text.substring(match.end);
    const newPos = match.start + match.replacement.length;
    return { text: newText, newPos };
  }
}
