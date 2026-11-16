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

export function getSeasonalTheme(date: Date = new Date()): DesignThemeId {
  const month = date.getMonth();
  const day = date.getDate();
  if (month === 10 || month === 11 || (month === 0 && day <= 10)) {
    return 'atelier';
  }
  return 'chalet';
}

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  readonly themes = DESIGN_THEMES;
  readonly activeTheme$ = new BehaviorSubject<DesignThemeId>(getSeasonalTheme());

  constructor() {
    this.setTheme(getSeasonalTheme());
  }

  setTheme(themeId: DesignThemeId): void {
    const valid: DesignThemeId = DESIGN_THEMES.some((t) => t.id === themeId) ? themeId : getSeasonalTheme();
    this.activeTheme$.next(valid);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', valid);
      const themeColorMeta = document.querySelector('meta[name="theme-color"]');
      const option = DESIGN_THEMES.find((t) => t.id === valid);
      if (themeColorMeta && option) {
        themeColorMeta.setAttribute('content', option.previewPrimary);
      }
    }
  }
}
