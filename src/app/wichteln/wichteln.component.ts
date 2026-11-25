import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import {
  SupabaseService,
  Profile,
  WichtelRound,
  WichtelParticipant,
  WichtelAssignmentView,
  WichtelColor,
  WICHTEL_COLORS
} from '../supabase.service';

@Component({
  selector: 'app-wichteln',
  templateUrl: './wichteln.component.html',
  styleUrls: ['./wichteln.component.css']
})
export class WichtelnComponent implements OnInit, OnDestroy {
  currentUser: Profile | null = null;
  profiles: Profile[] = [];
  round: WichtelRound | null = null;
  participants: WichtelParticipant[] = [];
  assignment: WichtelAssignmentView | null = null;

  loading = true;
  unwrapping = false;
  hiddenForPrivacy = false;

  // Progressive disclosure navigation
  activeTab: 'none' | 'participants' | 'admin' = 'none';

  // Modals & banners
  showDrawConfirm = false;
  showResetConfirm = false;
  isProcessingAction = false;
  adminError: string | null = null;
  adminSuccess: string | null = null;

  private userSub?: Subscription;

  constructor(public readonly supabase: SupabaseService) {}

  async ngOnInit(): Promise<void> {
    this.userSub = this.supabase.currentUser$.subscribe((user) => {
      this.currentUser = user;
    });

    await this.loadAll();
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
  }

  async loadAll(): Promise<void> {
    this.loading = true;
    this.adminError = null;

    try {
      this.profiles = await this.supabase.getAllProfiles();
      const { round, participants } = await this.supabase.getActiveWichtelRound();
      this.round = round;
      this.participants = participants;

      if (round) {
        // If drawn, load secret assignment
        if (round.status === 'drawn') {
          this.assignment = await this.supabase.getMyWichtelAssignment(round.id);
          this.hiddenForPrivacy = false;
        } else {
          this.assignment = null;
        }
      }
    } catch (err: any) {
      console.error('Error loading wichteln data:', err);
      this.adminError = err?.message || 'Fehler beim Laden der Wichteldaten.';
    } finally {
      this.loading = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Empty State: Create initial round
  // ---------------------------------------------------------------------------
  async createInitialRound(): Promise<void> {
    this.loading = true;
    this.adminError = null;
    try {
      const year = new Date().getFullYear();
      const { round, error } = await this.supabase.createOrUpdateWichtelRound({
        title: `Weihnachten ${year}`,
        year: year,
        budget: '',
        event_date: `${year}-12-24`,
        status: 'open',
        colors: [...WICHTEL_COLORS],
        exclusions: []
      });

      if (error || !round) {
        throw error || new Error('Runde konnte nicht erstellt werden.');
      }

      // Automatically add all existing profiles as participants
      if (this.profiles.length > 0) {
        await this.supabase.setRoundParticipants(
          round.id,
          this.profiles.map((p) => p.id)
        );
      }

      this.adminSuccess = 'Erste Wichtelrunde erfolgreich angelegt!';
      await this.loadAll();
    } catch (err: any) {
      console.error('Error creating initial round:', err);
      this.adminError = err?.message || 'Fehler beim Anlegen der Wichtelrunde.';
    } finally {
      this.loading = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Reveal Card & Privacy Actions
  // ---------------------------------------------------------------------------
  async unwrapGift(): Promise<void> {
    if (!this.assignment || this.unwrapping) return;

    this.unwrapping = true;
    try {
      // 600ms festive unwrap animation
      await new Promise((resolve) => setTimeout(resolve, 600));

      const { error } = await this.supabase.markWichtelRevealed(
        this.assignment.participantId
      );
      if (error) throw error;

      this.assignment.revealed = true;
      this.hiddenForPrivacy = false;

      // Update participant list state as well
      const p = this.participants.find((item) => item.id === this.assignment?.participantId);
      if (p) {
        p.revealed = true;
      }
    } catch (err: any) {
      console.error('Error revealing wichtel assignment:', err);
      alert('Das Los konnte nicht aufgedeckt werden: ' + (err?.message || ''));
    } finally {
      this.unwrapping = false;
    }
  }

  togglePrivacy(): void {
    this.hiddenForPrivacy = !this.hiddenForPrivacy;
  }

  toggleTab(tab: 'participants' | 'admin'): void {
    this.activeTab = this.activeTab === tab ? 'none' : tab;
  }

  // ---------------------------------------------------------------------------
  // Admin: Round Metadata
  // ---------------------------------------------------------------------------
  async onSaveMetadata(data: { title: string; year: number; event_date: string }): Promise<void> {
    if (!this.round) return;
    this.isProcessingAction = true;
    this.adminError = null;
    this.adminSuccess = null;

    try {
      const { round, error } = await this.supabase.createOrUpdateWichtelRound({
        id: this.round.id,
        title: data.title,
        year: data.year,
        event_date: data.event_date
      });

      if (error || !round) throw error || new Error('Fehler beim Speichern');

      this.round = round;
      this.adminSuccess = 'Rundendaten wurden erfolgreich aktualisiert!';
      setTimeout(() => (this.adminSuccess = null), 4000);
    } catch (err: any) {
      this.adminError = err?.message || 'Fehler beim Speichern der Rundendaten.';
    } finally {
      this.isProcessingAction = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Admin: Participants
  // ---------------------------------------------------------------------------
  async onSaveParticipants(userIds: string[]): Promise<void> {
    if (!this.round) return;
    this.isProcessingAction = true;
    this.adminError = null;
    this.adminSuccess = null;

    try {
      const { error } = await this.supabase.setRoundParticipants(this.round.id, userIds);
      if (error) throw error;

      this.adminSuccess = `Teilnehmerliste aktualisiert (${userIds.length} Personen).`;
      await this.loadAll();
      setTimeout(() => (this.adminSuccess = null), 4000);
    } catch (err: any) {
      this.adminError = err?.message || 'Fehler beim Übernehmen der Teilnehmer.';
    } finally {
      this.isProcessingAction = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Admin: Color Pool
  // ---------------------------------------------------------------------------
  async onToggleColor(color: WichtelColor): Promise<void> {
    if (!this.round) return;
    const current = this.round.colors || [];
    const exists = current.some((c) => c.hex.toLowerCase() === color.hex.toLowerCase());
    let next: WichtelColor[];
    if (exists) {
      if (current.length <= 1) {
        this.adminError = 'Mindestens eine Farbe muss im Farb-Pool verbleiben.';
        return;
      }
      next = current.filter((c) => c.hex.toLowerCase() !== color.hex.toLowerCase());
    } else {
      next = [...current, color];
    }
    await this.updateColors(next);
  }

  async onAddCustomColor(color: WichtelColor): Promise<void> {
    if (!this.round) return;
    const name = color.name.trim();
    const hex = color.hex.trim();

    if (!name) {
      this.adminError = 'Bitte gib einen Namen für die Farbe ein.';
      return;
    }

    const current = this.round.colors || [];
    const exists = current.some((c) => c.hex.toLowerCase() === hex.toLowerCase());
    if (exists) {
      this.adminError = 'Diese Farbe (Hexcode) existiert bereits im Pool.';
      return;
    }

    const next = [...current, { name, hex }];
    await this.updateColors(next);
  }

  async onResetDefaultColors(): Promise<void> {
    await this.updateColors([...WICHTEL_COLORS]);
  }

  private async updateColors(colors: WichtelColor[]): Promise<void> {
    if (!this.round) return;
    this.adminError = null;
    try {
      const { round, error } = await this.supabase.createOrUpdateWichtelRound({
        id: this.round.id,
        colors
      });
      if (error || !round) throw error || new Error('Fehler beim Aktualisieren der Farben');
      this.round.colors = round.colors;
      this.adminSuccess = 'Farb-Pool aktualisiert!';
      setTimeout(() => (this.adminSuccess = null), 3000);
    } catch (err: any) {
      this.adminError = err?.message || 'Fehler beim Aktualisieren der Farben.';
    }
  }

  // ---------------------------------------------------------------------------
  // Admin: Exclusions
  // ---------------------------------------------------------------------------
  async onAddExclusion(exclusion: { userAId: string; userBId: string }): Promise<void> {
    if (!this.round) return;
    this.adminError = null;

    if (!exclusion.userAId || !exclusion.userBId) {
      this.adminError = 'Bitte wähle zwei verschiedene Personen für den Ausschluss aus.';
      return;
    }

    if (exclusion.userAId === exclusion.userBId) {
      this.adminError = 'Eine Person kann nicht von sich selbst ausgeschlossen werden.';
      return;
    }

    const current = this.round.exclusions || [];
    const exists = current.some(
      (e) =>
        (e.userAId === exclusion.userAId && e.userBId === exclusion.userBId) ||
        (e.userAId === exclusion.userBId && e.userBId === exclusion.userAId)
    );

    if (exists) {
      this.adminError = 'Dieser Ausschluss existiert bereits.';
      return;
    }

    const next = [...current, { userAId: exclusion.userAId, userBId: exclusion.userBId }];
    await this.saveExclusions(next);
  }

  async onRemoveExclusion(index: number): Promise<void> {
    if (!this.round?.exclusions) return;
    const next = this.round.exclusions.filter((_, idx) => idx !== index);
    await this.saveExclusions(next);
  }

  private async saveExclusions(exclusions: { userAId: string; userBId: string }[]): Promise<void> {
    if (!this.round) return;
    this.adminError = null;
    try {
      const { round, error } = await this.supabase.createOrUpdateWichtelRound({
        id: this.round.id,
        exclusions
      });
      if (error || !round) throw error || new Error('Fehler beim Speichern des Ausschlusses.');
      this.round.exclusions = round.exclusions;
      this.adminSuccess = 'Ausschlüsse gespeichert!';
      setTimeout(() => (this.adminSuccess = null), 3000);
    } catch (err: any) {
      this.adminError = err?.message || 'Fehler beim Speichern des Ausschlusses.';
    }
  }

  // ---------------------------------------------------------------------------
  // Admin: Draw & Reset Actions (with Confirmation Guards)
  // ---------------------------------------------------------------------------
  openDrawModal(): void {
    this.adminError = null;
    this.showDrawConfirm = true;
  }

  closeDrawModal(): void {
    this.showDrawConfirm = false;
  }

  async executeDraw(): Promise<void> {
    if (!this.round) return;
    this.isProcessingAction = true;
    this.adminError = null;
    this.adminSuccess = null;

    try {
      const { error } = await this.supabase.drawWichtelRound(this.round.id);
      if (error) throw error;

      this.adminSuccess = '🎉 Auslosung erfolgreich abgeschlossen! Alle Wichtelpartner wurden zugewiesen.';
      await this.loadAll();
    } catch (err: any) {
      this.adminError = err?.message || 'Fehler bei der Auslosung.';
    } finally {
      this.showDrawConfirm = false;
      this.isProcessingAction = false;
    }
  }

  openResetModal(): void {
    this.adminError = null;
    this.showResetConfirm = true;
  }

  closeResetModal(): void {
    this.showResetConfirm = false;
  }

  async executeReset(): Promise<void> {
    if (!this.round) return;
    this.isProcessingAction = true;
    this.adminError = null;
    this.adminSuccess = null;

    try {
      const { error } = await this.supabase.resetWichtelRound(this.round.id);
      if (error) throw error;

      this.adminSuccess = 'Wichtelrunde wurde zurückgesetzt. Der Status ist wieder "offen".';
      await this.loadAll();
    } catch (err: any) {
      this.adminError = err?.message || 'Fehler beim Zurücksetzen der Runde.';
    } finally {
      this.showResetConfirm = false;
      this.isProcessingAction = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  formatDateGerman(dateStr?: string): string {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        return d.toLocaleDateString('de-DE', {
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
