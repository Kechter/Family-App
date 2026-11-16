import { Component } from '@angular/core';
import { ThemeService } from '../../../theme.service';

@Component({
  selector: 'app-theme-switcher',
  template: `
    <div class="theme-switcher" title="Design wechseln" role="group" aria-label="Design-Auswahl">
      <button
        *ngFor="let t of themeService.themes"
        type="button"
        class="theme-chip"
        [class.theme-chip-active]="(themeService.activeTheme$ | async) === t.id"
        (click)="themeService.setTheme(t.id)"
      >
        {{ t.shortLabel }}
      </button>
    </div>
  `
})
export class UiThemeSwitcherComponent {
  constructor(public readonly themeService: ThemeService) {}
}
