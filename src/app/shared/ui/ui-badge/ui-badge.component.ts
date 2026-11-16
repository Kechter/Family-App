import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-badge',
  template: `
    <span [ngClass]="badgeClasses">
      <ng-content></ng-content>
    </span>
  `
})
export class UiBadgeComponent {
  @Input() variant: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'danger' | 'neutral' = 'neutral';
  @Input() extraClass = '';

  get badgeClasses(): string {
    return ['badge', 'badge-' + this.variant, this.extraClass].filter(Boolean).join(' ');
  }
}
