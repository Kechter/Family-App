import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FamilyEvent, Profile, RsvpStatus } from '../../supabase.service';

@Component({
  selector: 'app-calendar-event-card',
  templateUrl: './calendar-event-card.component.html'
})
export class CalendarEventCardComponent {
  @Input() event!: FamilyEvent;
  @Input() currentUser: Profile | null = null;
  @Input() profiles: Profile[] = [];
  @Input() rsvpSaving = false;

  @Output() rsvp = new EventEmitter<{ eventId: string; status: RsvpStatus }>();
  @Output() deleteRequest = new EventEmitter<FamilyEvent>();

  get categoryBadgeVariant(): 'primary' | 'secondary' | 'accent' | 'warning' | 'neutral' {
    switch (this.event.category) {
      case 'christmas': return 'primary';
      case 'birthday': return 'accent';
      case 'gathering': return 'secondary';
      case 'vacation': return 'warning';
      default: return 'neutral';
    }
  }

  get categoryLabel(): string {
    switch (this.event.category) {
      case 'christmas': return 'Weihnachten';
      case 'birthday': return 'Geburtstag';
      case 'gathering': return 'Familientreffen';
      case 'vacation': return 'Urlaub';
      default: return 'Sonstiges';
    }
  }

  get categoryIcon(): string {
    switch (this.event.category) {
      case 'christmas': return '🎄';
      case 'birthday': return '🎂';
      case 'gathering': return '👨‍👩‍👧‍👦';
      case 'vacation': return '🏖️';
      default: return '📌';
    }
  }

  get canDelete(): boolean {
    if (!this.currentUser) return false;
    return this.currentUser.role === 'admin' || this.event.created_by === this.currentUser.id;
  }

  get creatorName(): string {
    if (!this.event.created_by) return 'Familie';
    const prof = this.profiles.find((p) => p.id === this.event.created_by);
    return prof?.username || 'Familienmitglied';
  }

  get userRsvpStatus(): RsvpStatus | null {
    if (!this.currentUser || !this.event.attendees) return null;
    return this.event.attendees[this.currentUser.id] || null;
  }

  formatDateGerman(dateStr?: string): string {
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

  getAttendeesByStatus(status: RsvpStatus): Profile[] {
    if (!this.event.attendees) return [];
    const userIds = Object.entries(this.event.attendees)
      .filter(([_, st]) => st === status)
      .map(([uid]) => uid);

    return userIds
      .map((uid) => this.profiles.find((p) => p.id === uid))
      .filter((p): p is Profile => Boolean(p));
  }

  onRsvpClick(status: RsvpStatus): void {
    this.rsvp.emit({ eventId: this.event.id, status });
  }
}
