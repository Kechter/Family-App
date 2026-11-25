import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-confirm-modal',
  template: `
    <div
      *ngIf="open"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      (click)="onBackdropClick()"
      role="dialog"
      aria-modal="true"
    >
      <div
        class="card max-w-md w-full max-h-[90dvh] overflow-y-auto space-y-4 shadow-xl"
        (click)="$event.stopPropagation()"
      >
        <div class="flex items-start gap-3">
          <div *ngIf="icon" class="text-2xl shrink-0 select-none">{{ icon }}</div>
          <div class="space-y-1 flex-1">
            <h3 *ngIf="title" class="font-display font-bold text-lg text-main leading-tight">{{ title }}</h3>
            <p *ngIf="message" class="text-sm text-muted leading-relaxed">{{ message }}</p>
          </div>
        </div>

        <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 sm:gap-3 pt-2">
          <button
            type="button"
            class="btn btn-outline w-full sm:w-auto"
            [disabled]="loading"
            (click)="onCancel()"
          >
            {{ cancelLabel }}
          </button>
          <button
            type="button"
            class="btn w-full sm:w-auto"
            [ngClass]="variant === 'danger' ? 'btn-danger' : 'btn-primary'"
            [disabled]="loading"
            (click)="onConfirm()"
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
            <span>{{ confirmLabel }}</span>
          </button>
        </div>
      </div>
    </div>
  `
})
export class UiConfirmModalComponent {
  @Input() open = false;
  @Input() icon = '⚠️';
  @Input() title = '';
  @Input() message = '';
  @Input() confirmLabel = 'Bestätigen';
  @Input() cancelLabel = 'Abbrechen';
  @Input() variant: 'primary' | 'danger' = 'primary';
  @Input() loading = false;

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  onBackdropClick(): void {
    if (!this.loading) {
      this.cancel.emit();
    }
  }

  onCancel(): void {
    if (!this.loading) {
      this.cancel.emit();
    }
  }

  onConfirm(): void {
    if (!this.loading) {
      this.confirm.emit();
    }
  }
}
