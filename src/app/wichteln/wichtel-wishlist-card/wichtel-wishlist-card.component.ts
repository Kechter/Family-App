import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-wichtel-wishlist-card',
  templateUrl: './wichtel-wishlist-card.component.html'
})
export class WichtelWishlistCardComponent implements OnChanges {
  @Input() isParticipant = false;
  @Input() wishlistNote = '';
  @Input() isSaving = false;
  @Input() savedSuccess = false;

  @Output() saveWishlist = new EventEmitter<string>();

  localNote = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['wishlistNote']) {
      this.localNote = changes['wishlistNote'].currentValue || '';
    }
  }

  onSave(): void {
    this.saveWishlist.emit(this.localNote);
  }
}
