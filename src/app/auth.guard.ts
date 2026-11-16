import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly router: Router
  ) {}

  async canActivate(): Promise<boolean | UrlTree> {
    const isAuth = await this.supabaseService.isAuthenticated();
    if (!isAuth) {
      return this.router.createUrlTree(['/login']);
    }
    return true;
  }
}
