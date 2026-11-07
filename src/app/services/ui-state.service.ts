import { Injectable, signal } from '@angular/core';
import { ContextMenuPosition } from '../models/context-menu.model';
import * as EC from '../constants/editor.constants';

@Injectable({
  providedIn: 'root',
})
export class UiStateService {
  readonly activeMenu = signal<string | null>(null);
  readonly contextMenu = signal<ContextMenuPosition>({ x: 0, y: 0, visible: false });

  readonly isFindModalOpen = signal<boolean>(false);
  readonly isSnippetsModalOpen = signal<boolean>(false);
  readonly isAboutModalOpen = signal<boolean>(false);

  toggleMenu(menuName: string): void {
    if (this.activeMenu() === menuName) {
      this.activeMenu.set(null);
    } else {
      this.activeMenu.set(menuName);
    }
  }

  closeMenus(): void {
    this.activeMenu.set(null);
    this.contextMenu.set({ x: 0, y: 0, visible: false });
  }

  openContextMenu(x: number, y: number): void {
    this.contextMenu.set({
      x: Math.min(x, window.innerWidth - EC.CONTEXT_MENU_ESTIMATED_WIDTH),
      y: Math.min(y, window.innerHeight - EC.CONTEXT_MENU_ESTIMATED_HEIGHT),
      visible: true,
    });
  }

  closeContextMenu(): void {
    this.contextMenu.set({ x: 0, y: 0, visible: false });
  }

  openFindModal(): void {
    this.isFindModalOpen.set(true);
  }

  closeFindModal(): void {
    this.isFindModalOpen.set(false);
  }

  openSnippetsModal(): void {
    this.isSnippetsModalOpen.set(true);
  }

  closeSnippetsModal(): void {
    this.isSnippetsModalOpen.set(false);
  }

  openAboutModal(): void {
    this.isAboutModalOpen.set(true);
  }

  closeAboutModal(): void {
    this.isAboutModalOpen.set(false);
  }
}
