import { Component, EventEmitter, Input, Output } from '@angular/core';
import { WichtelAssignmentView, WichtelRound } from '../../supabase.service';

@Component({
  selector: 'app-wichtel-reveal-card',
  templateUrl: './wichtel-reveal-card.component.html',
  styles: [`
    @keyframes giftWiggle {
      0%, 100% {
        transform: rotate(0deg) scale(1);
      }
      20% {
        transform: rotate(-8deg) scale(1.05);
      }
      40% {
        transform: rotate(8deg) scale(1.08);
      }
      60% {
        transform: rotate(-6deg) scale(1.05);
      }
      80% {
        transform: rotate(6deg) scale(1.03);
      }
    }

    .gift-box {
      cursor: pointer;
      box-shadow: 0 10px 25px -5px rgba(185, 28, 28, 0.4), 0 8px 10px -6px rgba(185, 28, 28, 0.3);
    }

    .gift-box:hover {
      animation: giftWiggle 0.9s ease-in-out infinite;
    }

    .gift-unwrapping {
      animation: giftWiggle 0.3s ease-in-out infinite !important;
      filter: brightness(1.2);
    }
  `]
})
export class WichtelRevealCardComponent {
  @Input() round!: WichtelRound;
  @Input() assignment: WichtelAssignmentView | null = null;
  @Input() participantCount = 0;
  @Input() isUnwrapping = false;
  @Input() hiddenForPrivacy = false;

  @Output() unwrap = new EventEmitter<void>();
  @Output() togglePrivacy = new EventEmitter<void>();

  getContrastColor(hex?: string): string {
    if (!hex) return '#1e293b';
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
    const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
    const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 160 ? '#1e293b' : '#ffffff';
  }

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
