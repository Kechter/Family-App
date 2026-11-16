import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import {
  SupabaseService,
  Profile,
  FamilyEvent,
  EventCategory,
  RsvpStatus
} from '../supabase.service';
import { CalendarCell } from './calendar-month-grid/calendar-month-grid.component';
import { CreateEventPayload } from './calendar-event-form/calendar-event-form.component';

export interface CategoryInfo {
  id: EventCategory | 'all';
  label: string;
  icon: string;
  badgeClass: string;
  dotClass: string;
}

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css']
})
export class CalendarComponent implements OnInit, OnDestroy {
  currentUser: Profile | null = null;
  profiles: Profile[] = [];
  events: FamilyEvent[] = [];

  loading = true;
  actionInProgress = false;

  // Viewing month/year for the grid
  viewYear: number;
  viewMonth: number; // 0-11

  // Selected date filter (YYYY-MM-DD or null)
  selectedDate: string | null = null;

  // Active category filter
  selectedCategory: EventCategory | 'all' = 'all';

  // Active view tab ('upcoming' | 'month' | 'all')
  viewFilter: 'upcoming' | 'month' | 'all' = 'upcoming';

  // Collapsible creation panel
  showCreatePanel = false;

  // Event delete confirmation state
  eventToDelete: FamilyEvent | null = null;

  // Feedback messages
  feedbackError: string | null = null;
  feedbackSuccess: string | null = null;

  // Month names in German
  readonly monthNames = [
    'Januar',
    'Februar',
    'März',
    'April',
    'Mai',
    'Juni',
    'Juli',
    'August',
    'September',
    'Oktober',
    'November',
    'Dezember'
  ];

  // Categories metadata
  readonly categories: CategoryInfo[] = [
    { id: 'all', label: 'Alle', icon: '📅', badgeClass: 'badge-neutral', dotClass: 'bg-muted' },
    { id: 'christmas', label: 'Weihnachten', icon: '🎄', badgeClass: 'badge-primary', dotClass: 'bg-brand-primary' },
    { id: 'birthday', label: 'Geburtstag', icon: '🎂', badgeClass: 'badge-accent', dotClass: 'bg-brand-accent' },
    { id: 'gathering', label: 'Familientreffen', icon: '👨‍👩‍👧‍👦', badgeClass: 'badge-secondary', dotClass: 'bg-brand-secondary' },
    { id: 'vacation', label: 'Urlaub', icon: '🏖️', badgeClass: 'badge-warning', dotClass: 'bg-warning' },
    { id: 'other', label: 'Sonstiges', icon: '📌', badgeClass: 'badge-neutral', dotClass: 'bg-muted' }
  ];

  readonly categoryDots: Record<EventCategory, string> = {
    christmas: 'bg-brand-primary',
    birthday: 'bg-brand-accent',
    gathering: 'bg-brand-secondary',
    vacation: 'bg-warning',
    other: 'bg-muted'
  };

  private userSub?: Subscription;

  constructor(public readonly supabase: SupabaseService) {
    const today = new Date();
    this.viewYear = today.getFullYear();
    this.viewMonth = today.getMonth();
  }

  async ngOnInit(): Promise<void> {
    this.userSub = this.supabase.currentUser$.subscribe((user) => {
      this.currentUser = user;
    });

    await this.loadAll();
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
  }

  get monthTitle(): string {
    return `${this.monthNames[this.viewMonth]} ${this.viewYear}`;
  }

  get todayIso(): string {
    return this.formatDateIso(new Date());
  }

  get deleteModalMessage(): string {
    if (!this.eventToDelete) return '';
    return `Möchtest du den Termin "${this.eventToDelete.title}" wirklich aus dem Familienkalender entfernen? Dies kann nicht rückgängig gemacht werden.`;
  }

  async loadAll(): Promise<void> {
    this.loading = true;
    try {
      this.profiles = await this.supabase.getAllProfiles();
      this.events = await this.supabase.getEvents();
    } catch (err: any) {
      console.error('Error loading calendar data:', err);
      this.feedbackError = 'Fehler beim Laden der Termine.';
    } finally {
      this.loading = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Month Navigation
  // ---------------------------------------------------------------------------
  prevMonth(): void {
    if (this.viewMonth === 0) {
      this.viewMonth = 11;
      this.viewYear -= 1;
    } else {
      this.viewMonth -= 1;
    }
  }

  nextMonth(): void {
    if (this.viewMonth === 11) {
      this.viewMonth = 0;
      this.viewYear += 1;
    } else {
      this.viewMonth += 1;
    }
  }

  goToToday(): void {
    const today = new Date();
    this.viewYear = today.getFullYear();
    this.viewMonth = today.getMonth();
    this.selectedDate = this.formatDateIso(today);
  }

  // ---------------------------------------------------------------------------
  // Month Grid Calculation
  // ---------------------------------------------------------------------------
  get calendarCells(): CalendarCell[] {
    const cells: CalendarCell[] = [];
    const todayStr = this.formatDateIso(new Date());

    const firstDayOfMonth = new Date(this.viewYear, this.viewMonth, 1);
    // Weekday offset (0 = Monday, ..., 6 = Sunday)
    const startDayOffset = (firstDayOfMonth.getDay() + 6) % 7;

    const daysInCurrentMonth = new Date(this.viewYear, this.viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(this.viewYear, this.viewMonth, 0).getDate();

    // 1. Previous month padding
    for (let i = startDayOffset - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(this.viewYear, this.viewMonth - 1, dayNum);
      const dateStr = this.formatDateIso(prevDate);
      cells.push({
        date: dateStr,
        day: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        events: this.getEventsForDate(dateStr)
      });
    }

    // 2. Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const curDate = new Date(this.viewYear, this.viewMonth, d);
      const dateStr = this.formatDateIso(curDate);
      cells.push({
        date: dateStr,
        day: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        events: this.getEventsForDate(dateStr)
      });
    }

    // 3. Next month padding (complete full 7-day rows, 35 or 42 cells total)
    const totalCells = Math.ceil(cells.length / 7) * 7;
    const paddingNext = totalCells - cells.length;
    for (let d = 1; d <= paddingNext; d++) {
      const nextDate = new Date(this.viewYear, this.viewMonth + 1, d);
      const dateStr = this.formatDateIso(nextDate);
      cells.push({
        date: dateStr,
        day: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        events: this.getEventsForDate(dateStr)
      });
    }

    return cells;
  }

  private getEventsForDate(dateStr: string): FamilyEvent[] {
    return this.events.filter((e) => e.event_date === dateStr);
  }

  selectDate(dateStr: string): void {
    if (this.selectedDate === dateStr) {
      this.selectedDate = null;
    } else {
      this.selectedDate = dateStr;
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        if (y !== this.viewYear || m !== this.viewMonth) {
          this.viewYear = y;
          this.viewMonth = m;
        }
      }
    }
  }

  clearDateSelection(): void {
    this.selectedDate = null;
  }

  // ---------------------------------------------------------------------------
  // Filters & Filtered Events List
  // ---------------------------------------------------------------------------
  setCategory(cat: EventCategory | 'all'): void {
    this.selectedCategory = cat;
  }

  setViewFilter(filter: 'upcoming' | 'month' | 'all'): void {
    this.viewFilter = filter;
  }

  get filteredEvents(): FamilyEvent[] {
    const todayStr = this.formatDateIso(new Date());
    const yearMonthStr = `${this.viewYear}-${String(this.viewMonth + 1).padStart(2, '0')}`;

    return this.events
      .filter((ev) => {
        // Category filter
        if (this.selectedCategory !== 'all' && ev.category !== this.selectedCategory) {
          return false;
        }

        // Explicit single-day filter
        if (this.selectedDate) {
          return ev.event_date === this.selectedDate;
        }

        // View mode filter
        if (this.viewFilter === 'upcoming') {
          return ev.event_date >= todayStr;
        }
        if (this.viewFilter === 'month') {
          return ev.event_date.startsWith(yearMonthStr);
        }
        return true; // 'all'
      })
      .sort((a, b) => {
        const dComp = a.event_date.localeCompare(b.event_date);
        if (dComp !== 0) return dComp;
        return (a.event_time || '').localeCompare(b.event_time || '');
      });
  }

  // ---------------------------------------------------------------------------
  // Event Creation
  // ---------------------------------------------------------------------------
  toggleCreatePanel(): void {
    this.showCreatePanel = !this.showCreatePanel;
  }

  async saveNewEvent(payload: CreateEventPayload): Promise<void> {
    this.actionInProgress = true;
    this.feedbackError = null;
    this.feedbackSuccess = null;

    try {
      const { data, error } = await this.supabase.createEvent(payload);
      if (error) throw error;

      this.feedbackSuccess = `Termin "${payload.title}" wurde erfolgreich angelegt!`;
      this.showCreatePanel = false;
      await this.loadAll();

      setTimeout(() => (this.feedbackSuccess = null), 4000);
    } catch (err: any) {
      console.error('Error creating event:', err);
      this.feedbackError = err?.message || 'Fehler beim Erstellen des Termins.';
    } finally {
      this.actionInProgress = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Event Deletion
  // ---------------------------------------------------------------------------
  promptDeleteEvent(event: FamilyEvent): void {
    this.eventToDelete = event;
  }

  cancelDeleteEvent(): void {
    this.eventToDelete = null;
  }

  async confirmDeleteEvent(): Promise<void> {
    if (!this.eventToDelete) return;

    this.actionInProgress = true;
    try {
      const { error } = await this.supabase.deleteEvent(this.eventToDelete.id);
      if (error) throw error;

      this.feedbackSuccess = `Termin "${this.eventToDelete.title}" wurde gelöscht.`;
      this.eventToDelete = null;
      await this.loadAll();

      setTimeout(() => (this.feedbackSuccess = null), 3000);
    } catch (err: any) {
      console.error('Error deleting event:', err);
      this.feedbackError = err?.message || 'Fehler beim Löschen des Termins.';
    } finally {
      this.actionInProgress = false;
    }
  }

  // ---------------------------------------------------------------------------
  // RSVP Actions
  // ---------------------------------------------------------------------------
  async onRsvp(eventId: string, status: RsvpStatus): Promise<void> {
    if (!this.currentUser) {
      this.feedbackError = 'Du musst angemeldet sein, um zu- oder abzusagen.';
      return;
    }

    try {
      const { error } = await this.supabase.toggleRsvp(eventId, status);
      if (error) throw error;

      // Update local state directly for instant feedback
      const ev = this.events.find((e) => e.id === eventId);
      if (ev) {
        ev.attendees = {
          ...(ev.attendees || {}),
          [this.currentUser.id]: status
        };
      }
    } catch (err: any) {
      console.error('Error toggling RSVP:', err);
      this.feedbackError = err?.message || 'Fehler beim Aktualisieren deiner Zusage.';
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  formatDateIso(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
