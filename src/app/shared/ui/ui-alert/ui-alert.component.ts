import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-alert',
  template: `
    <div *ngIf="message" [ngClass]="alertClasses" role="alert">
      <!-- Status Icons -->
      <svg
        *ngIf="type === 'error'"
        class="w-5 h-5 shrink-0 text-current mt-0.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>

      <svg
        *ngIf="type === 'success'"
        class="w-5 h-5 shrink-0 text-current mt-0.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>

      <svg
        *ngIf="type === 'info'"
        class="w-5 h-5 shrink-0 text-current mt-0.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>

      <div class="flex-1 leading-snug">{{ message }}</div>

      <button
        *ngIf="dismissible"
        type="button"
        class="text-current opacity-70 hover:opacity-100 transition-opacity p-0.5 -mr-1 -mt-1 rounded cursor-pointer leading-none"
        (click)="dismiss.emit()"
        aria-label="Schließen"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  `
})
export class UiAlertComponent {
  @Input() type: 'error' | 'success' | 'info' = 'info';
  @Input() message: string | null | undefined = null;
  @Input() dismissible = false;

  @Output() dismiss = new EventEmitter<void>();

  get alertClasses(): string {
    return 'alert-' + this.type;
  }
}
