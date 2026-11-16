import { Component, EventEmitter, Input, Output } from '@angular/core';
import { EventCategory, FamilyEvent } from '../../supabase.service';

export interface CalendarCell {
  date: string; // 'YYYY-MM-DD'
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: FamilyEvent[];
}

@Component({
  selector: 'app-calendar-month-grid',
  templateUrl: './calendar-month-grid.component.html'
})
export class CalendarMonthGridComponent {
  @Input() monthTitle = '';
  @Input() cells: CalendarCell[] = [];
  @Input() selectedDate: string | null = null;
  @Input() categoryDots: Record<EventCategory, string> = {
    christmas: 'bg-brand-primary',
    birthday: 'bg-brand-accent',
    gathering: 'bg-brand-secondary',
    vacation: 'bg-warning',
    other: 'bg-muted'
  };

  @Output() prevMonth = new EventEmitter<void>();
  @Output() nextMonth = new EventEmitter<void>();
  @Output() goToToday = new EventEmitter<void>();
  @Output() selectDate = new EventEmitter<string>();
  @Output() clearSelectedDate = new EventEmitter<void>();

  readonly weekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  getDotClass(category: EventCategory): string {
    return this.categoryDots?.[category] || 'bg-muted';
  }

  formatDateGerman(dateStr?: string | null): string {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        return new Date(y, m, d).toLocaleDateString('de-DE', {
          weekday: 'short',
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        });
      }
      return new Date(dateStr).toLocaleDateString('de-DE');
    } catch {
      return dateStr;
    }
  }
}
