import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type DesignThemeId = 'atelier' | 'chalet';

export interface DesignThemeOption {
  id: DesignThemeId;
  label: string;
  shortLabel: string;
  description: string;
  previewPrimary: string;
  previewSecondary: string;
  previewCanvas: string;
}

export const DESIGN_THEMES: DesignThemeOption[] = [
  {
    id: 'atelier',
    label: 'Weihnachten',
    shortLabel: '🎄 Weihnachten',
    description: 'Festliches Cranberry-Rot, Tannengrün, Messing & warme Leinen-Optik',
    previewPrimary: '#9E2A2B',
    previewSecondary: '#1B4332',
    previewCanvas: '#FAF6EE'
  },
  {
    id: 'chalet',
    label: 'Alpen-Chalet',
    shortLabel: '🏔️ Chalet',
    description: 'Gemütliches Ganzjahres-Chalet in Holz-, Kupfer- & Waldtönen',
    previewPrimary: '#B45309',
    previewSecondary: '#14532D',
    previewCanvas: '#F2EFE9'
  }
];

const THEME_STORAGE_KEY = 'family_app_theme_v1';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  readonly themes = DESIGN_THEMES;
  readonly activeTheme$ = new BehaviorSubject<DesignThemeId>('atelier');

  constructor() {
    this.setTheme(this.loadSavedTheme());
  }

  setTheme(themeId: DesignThemeId): void {
    const valid = DESIGN_THEMES.some((t) => t.id === themeId) ? themeId : this.getDefaultSeasonalTheme();
    this.activeTheme$.next(valid);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', valid);
      const themeColorMeta = document.querySelector('meta[name="theme-color"]');
      const option = DESIGN_THEMES.find((t) => t.id === valid);
      if (themeColorMeta && option) {
        themeColorMeta.setAttribute('content', option.previewPrimary);
      }
    }
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(THEME_STORAGE_KEY, valid);
      }
    } catch {
      // Ignore storage errors
    }
  }

  private getDefaultSeasonalTheme(): DesignThemeId {
    const month = new Date().getMonth();
    return (month === 10 || month === 11) ? 'atelier' : 'chalet';
  }

  private loadSavedTheme(): DesignThemeId {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(THEME_STORAGE_KEY) as DesignThemeId | null;
        if (stored && DESIGN_THEMES.some((t) => t.id === stored)) {
          return stored;
        }
      }
    } catch {
      // Ignore storage errors
    }
    return this.getDefaultSeasonalTheme();
  }
}
