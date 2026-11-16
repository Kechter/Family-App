import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { SupabaseService, Profile } from './supabase.service';
import { ThemeService } from './theme.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Family-App';
  currentUser: Profile | null = null;
  isLoginPage = false;

  private authSub?: Subscription;
  private routerSub?: Subscription;

  constructor(
    public readonly supabaseService: SupabaseService,
    public readonly themeService: ThemeService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.authSub = this.supabaseService.currentUser$.subscribe((user) => {
      this.currentUser = user;
    });

    this.checkCurrentRoute(this.router.url);
    this.routerSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.checkCurrentRoute(event.urlAfterRedirects || event.url);
      });
  }

  ngOnDestroy(): void {
    this.authSub?.unsubscribe();
    this.routerSub?.unsubscribe();
  }

  private checkCurrentRoute(url: string): void {
    this.isLoginPage = !url || url === '/' || url.startsWith('/login') || url.startsWith('/register');
  }

  async onSignOut(): Promise<void> {
    await this.supabaseService.signOut();
    await this.router.navigate(['/login']);
  }
}
