import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-card',
  template: `
    <div [ngClass]="cardClasses">
      <ng-content></ng-content>
    </div>
  `
})
export class UiCardComponent {
  @Input() variant: 'default' | 'compact' | 'interactive' | 'subtle' | 'hero' | 'hero-secondary' | 'admin' = 'default';
  @Input() extraClass = '';

  get cardClasses(): string {
    const map: Record<string, string> = {
      default: 'card',
      compact: 'card-compact',
      interactive: 'card-interactive',
      subtle: 'card-subtle',
      hero: 'card-hero',
      'hero-secondary': 'card-hero-secondary',
      admin: 'card-admin'
    };
    const baseClass = map[this.variant] || 'card';
    return [baseClass, this.extraClass].filter(Boolean).join(' ');
  }
}
