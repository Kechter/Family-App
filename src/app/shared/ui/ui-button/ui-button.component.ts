import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-button',
  template: `
    <button
      [type]="type"
      [disabled]="disabled || loading"
      (click)="onClick($event)"
      [ngClass]="buttonClasses"
    >
      <svg
        *ngIf="loading"
        class="animate-spin h-4 w-4 shrink-0 text-current"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <ng-content></ng-content>
    </button>
  `
})
export class UiButtonComponent {
  @Input() variant: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'danger' | 'hero' = 'primary';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() block = false;
  @Input() loading = false;
  @Input() disabled = false;
  @Input() extraClass = '';

  @Output() btnClick = new EventEmitter<MouseEvent>();

  get buttonClasses(): string {
    return [
      'btn',
      'btn-' + this.variant,
      this.size === 'sm' ? 'btn-sm' : this.size === 'lg' ? 'btn-lg' : '',
      this.block ? 'btn-block' : '',
      this.extraClass
    ].filter(Boolean).join(' ');
  }

  onClick(event: MouseEvent): void {
    if (!this.disabled && !this.loading) {
      this.btnClick.emit(event);
    }
  }
}
