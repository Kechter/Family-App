import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import {
  Profile,
  WichtelColor,
  WichtelParticipant,
  WichtelRound,
  WICHTEL_COLORS
} from '../../supabase.service';

@Component({
  selector: 'app-wichtel-admin-panel',
  templateUrl: './wichtel-admin-panel.component.html'
})
export class WichtelAdminPanelComponent implements OnChanges {
  @Input() round!: WichtelRound;
  @Input() profiles: Profile[] = [];
  @Input() participants: WichtelParticipant[] = [];
  @Input() defaultColors: WichtelColor[] = WICHTEL_COLORS;
  @Input() isProcessing = false;
  @Input() adminError: string | null = null;
  @Input() adminSuccess: string | null = null;

  @Output() saveMetadata = new EventEmitter<{ title: string; year: number; budget: string; event_date: string }>();
  @Output() saveParticipants = new EventEmitter<string[]>();
  @Output() toggleColor = new EventEmitter<WichtelColor>();
  @Output() addCustomColor = new EventEmitter<WichtelColor>();
  @Output() addExclusion = new EventEmitter<{ userAId: string; userBId: string }>();
  @Output() removeExclusion = new EventEmitter<number>();
  @Output() requestDraw = new EventEmitter<void>();
  @Output() requestReset = new EventEmitter<void>();
  @Output() dismissError = new EventEmitter<void>();
  @Output() dismissSuccess = new EventEmitter<void>();

  metaTitle = '';
  metaYear = 2026;
  metaBudget = '25 €';
  metaEventDate = '2026-12-24';
  selectedUserIds: Set<string> = new Set<string>();

  customColorName = '';
  customColorHex = '#dc2626';

  exclUserA = '';
  exclUserB = '';

  showAdvanced = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['round'] && this.round) {
      this.metaTitle = this.round.title || '';
      this.metaYear = this.round.year || 2026;
      this.metaBudget = this.round.budget || '25 €';
      this.metaEventDate = this.round.event_date || '2026-12-24';
    }

    if (changes['participants'] && this.participants) {
      this.selectedUserIds = new Set(this.participants.map((p) => p.user_id));
    }
  }

  onSaveMetadata(): void {
    this.saveMetadata.emit({
      title: this.metaTitle.trim() || 'Wichtelrunde',
      year: Number(this.metaYear) || 2026,
      budget: this.metaBudget.trim() || '25 €',
      event_date: this.metaEventDate
    });
  }

  toggleParticipantCheckbox(userId: string, isChecked: boolean): void {
    if (isChecked) {
      this.selectedUserIds.add(userId);
    } else {
      this.selectedUserIds.delete(userId);
    }
  }

  isUserSelected(userId: string): boolean {
    return this.selectedUserIds.has(userId);
  }

  onSaveParticipants(): void {
    this.saveParticipants.emit(Array.from(this.selectedUserIds));
  }

  isColorActive(hex: string): boolean {
    if (!this.round?.colors) return false;
    return this.round.colors.some((c) => c.hex.toLowerCase() === hex.toLowerCase());
  }

  onToggleColor(color: WichtelColor): void {
    this.toggleColor.emit(color);
  }

  onAddCustomColor(): void {
    const name = this.customColorName.trim();
    const hex = this.customColorHex.trim();
    this.addCustomColor.emit({ name, hex });
    this.customColorName = '';
  }

  onAddExclusion(): void {
    this.addExclusion.emit({ userAId: this.exclUserA, userBId: this.exclUserB });
    this.exclUserA = '';
    this.exclUserB = '';
  }

  getUserName(userId: string): string {
    const prof = this.profiles.find((p) => p.id === userId);
    return prof?.username || 'Unbekannt';
  }

  getContrastColor(hex?: string): string {
    if (!hex) return '#1e293b';
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
    const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
    const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 160 ? '#1e293b' : '#ffffff';
  }
}
