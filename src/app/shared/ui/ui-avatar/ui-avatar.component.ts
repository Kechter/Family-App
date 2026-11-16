import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-avatar',
  template: `
    <div
      [ngClass]="avatarClasses"
      [ngStyle]="{ 'background-color': color || 'rgb(var(--color-primary))' }"
      [title]="name"
      aria-hidden="true"
    >{{ initial }}</div>
  `
})
export class UiAvatarComponent {
  @Input() name = '';
  @Input() color: string | null | undefined = null;
  @Input() size: 'xs' | 'sm' | 'md' | 'lg' = 'md';
  @Input() extraClass = '';

  get initial(): string {
    const trimmed = (this.name || '').trim();
    return (trimmed[0] || 'F').toUpperCase();
  }

  get avatarClasses(): string {
    const sizeMap: Record<string, string> = {
      xs: 'w-6 h-6 text-[10px]',
      sm: 'w-7 h-7 text-xs',
      md: 'w-10 h-10 text-sm',
      lg: 'w-12 h-12 text-lg'
    };
    const sizeClass = sizeMap[this.size] || sizeMap['md'];
    return [
      'inline-flex items-center justify-center rounded-full font-bold text-white select-none shrink-0 shadow-sm',
      sizeClass,
      this.extraClass
    ].filter(Boolean).join(' ');
  }
}
