import { Component, OnInit } from '@angular/core';
import {
  SupabaseService,
  Profile,
  WichtelRound,
  WichtelAssignmentView,
  FamilyEvent
} from '../supabase.service';

export interface UpcomingBirthday {
  profile: Profile;
  formattedDate: string;
  daysRemaining: number;
  turningAge: number | null;
}

@Component({
  selector: 'app-homepage',
  templateUrl: './homepage.component.html',
  styleUrls: ['./homepage.component.css']
})
export class HomepageComponent implements OnInit {
  currentUser: Profile | null = null;
  activeRound: WichtelRound | null = null;
  assignment: WichtelAssignmentView | null = null;
  upcomingEvents: FamilyEvent[] = [];
  upcomingBirthdays: UpcomingBirthday[] = [];

  todayFormatted = '';
  showSecret = false;
  loading = true;

  constructor(public readonly supabaseService: SupabaseService) {}

  async ngOnInit(): Promise<void> {
    this.initTodayDate();
    await this.loadAllData();
  }

  private initTodayDate(): void {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    this.todayFormatted = new Intl.DateTimeFormat('de-DE', options).format(new Date());
  }

  async loadAllData(): Promise<void> {
    this.loading = true;
    try {
      this.currentUser = await this.supabaseService.getCurrentProfile();

      const [roundResult, events, allProfiles] = await Promise.all([
        this.supabaseService.getActiveWichtelRound(),
        this.supabaseService.getEvents(),
        this.supabaseService.getAllProfiles()
      ]);

      this.activeRound = roundResult.round;

      if (this.activeRound && this.activeRound.status === 'drawn') {
        this.assignment = await this.supabaseService.getMyWichtelAssignment(this.activeRound.id);
      } else {
        this.assignment = null;
      }

      this.upcomingEvents = this.calculateUpcomingEvents(events);
      this.upcomingBirthdays = this.calculateUpcomingBirthdays(allProfiles);
    } catch (err) {
      console.error('Error loading homepage data:', err);
    } finally {
      this.loading = false;
    }
  }

  toggleSecret(): void {
    this.showSecret = !this.showSecret;
  }

  private calculateUpcomingEvents(events: FamilyEvent[]): FamilyEvent[] {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    const future = events.filter((e) => e.event_date >= todayStr);
    const pool = future.length > 0 ? future : events;
    return [...pool].sort((a, b) => a.event_date.localeCompare(b.event_date)).slice(0, 4);
  }

  private calculateUpcomingBirthdays(profiles: Profile[]): UpcomingBirthday[] {
    const now = new Date();
    const currentYear = now.getFullYear();
    const today = new Date(currentYear, now.getMonth(), now.getDate());

    const result: UpcomingBirthday[] = [];
    const monthNames = [
      'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
      'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
    ];

    for (const prof of profiles) {
      if (!prof.birthday) continue;
      const parts = prof.birthday.split('-');
      if (parts.length < 3) continue;

      const bYear = parseInt(parts[0], 10);
      const bMonth = parseInt(parts[1], 10) - 1;
      const bDay = parseInt(parts[2], 10);

      if (isNaN(bMonth) || isNaN(bDay)) continue;

      let nextBday = new Date(currentYear, bMonth, bDay);
      if (nextBday < today) {
        nextBday = new Date(currentYear + 1, bMonth, bDay);
      }

      const diffMs = nextBday.getTime() - today.getTime();
      const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));
      const turningAge = !isNaN(bYear) ? nextBday.getFullYear() - bYear : null;
      const formattedDate = `${bDay}. ${monthNames[bMonth] || ''}`;

      result.push({
        profile: prof,
        formattedDate,
        daysRemaining,
        turningAge
      });
    }

    result.sort((a, b) => a.daysRemaining - b.daysRemaining);
    return result.slice(0, 4);
  }

  formatEventDate(dateStr: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const months = [
        'Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni',
        'Juli', 'Aug.', 'Sept.', 'Okt.', 'Nov.', 'Dez.'
      ];
      const day = parseInt(parts[2], 10);
      const month = parseInt(parts[1], 10) - 1;
      return `${day}. ${months[month] || ''}`;
    }
    return dateStr;
  }

  getCategoryLabel(category: string): string {
    switch (category) {
      case 'christmas': return 'Weihnachten 🎄';
      case 'birthday': return 'Geburtstag 🎂';
      case 'gathering': return 'Treffen ☕';
      case 'vacation': return 'Urlaub ⛺';
      default: return 'Termin 📅';
    }
  }

  getAttendingCount(event: FamilyEvent): number {
    if (!event.attendees) return 0;
    return Object.values(event.attendees).filter((s) => s === 'yes').length;
  }
}
