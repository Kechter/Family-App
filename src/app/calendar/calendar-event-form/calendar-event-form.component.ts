import { Component, EventEmitter, Input, OnInit, OnChanges, Output, SimpleChanges } from '@angular/core';
import { EventCategory } from '../../supabase.service';

export interface CreateEventPayload {
  title: string;
  event_date: string;
  event_time: string;
  location: string;
  category: EventCategory;
  description: string;
}

@Component({
  selector: 'app-calendar-event-form',
  templateUrl: './calendar-event-form.component.html'
})
export class CalendarEventFormComponent implements OnInit, OnChanges {
  @Input() open = false;
  @Input() initialDate = '';
  @Input() isSaving = false;

  @Output() create = new EventEmitter<CreateEventPayload>();
  @Output() close = new EventEmitter<void>();

  newEvent: CreateEventPayload = {
    title: '',
    event_date: '',
    event_time: '',
    location: '',
    category: 'gathering',
    description: ''
  };

  ngOnInit(): void {
    if (this.initialDate && !this.newEvent.event_date) {
      this.newEvent.event_date = this.initialDate;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialDate'] && this.initialDate) {
      this.newEvent.event_date = this.initialDate;
    }
    if (changes['open']) {
      if (this.open) {
        if (this.initialDate && !this.newEvent.event_date) {
          this.newEvent.event_date = this.initialDate;
        }
      } else {
        this.reset();
      }
    }
  }

  onSubmit(): void {
    const title = this.newEvent.title.trim();
    const date = this.newEvent.event_date.trim();

    if (!title || !date) {
      return;
    }

    this.create.emit({
      title,
      event_date: date,
      event_time: this.newEvent.event_time.trim(),
      location: this.newEvent.location.trim(),
      category: this.newEvent.category,
      description: this.newEvent.description.trim()
    });
  }

  reset(): void {
    this.newEvent = {
      title: '',
      event_date: this.initialDate || '',
      event_time: '',
      location: '',
      category: 'gathering',
      description: ''
    };
  }
}
