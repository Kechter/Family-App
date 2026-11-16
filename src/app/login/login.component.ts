import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService, Profile } from '../supabase.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loading = false;
  setupLoading = false;
  demoLoadingId: string | null = null;
  errorMessage = '';
  setupSuccess: string | null = null;
  setupMode = false;
  demoProfiles: Profile[] = [];

  signInForm: FormGroup = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  setupForm: FormGroup = this.formBuilder.group({
    username: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  constructor(
    public readonly supabaseService: SupabaseService,
    private readonly formBuilder: FormBuilder,
    private readonly router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    const isAuth = await this.supabaseService.isAuthenticated();
    if (isAuth) {
      await this.router.navigate(['/wichteln']);
      return;
    }

    if (this.supabaseService.isDemoMode) {
      this.demoProfiles = await this.supabaseService.getAllProfiles();
    }
  }

  setSetupMode(mode: boolean): void {
    this.setupMode = mode;
    this.errorMessage = '';
    this.setupSuccess = null;
  }

  toggleSetupMode(): void {
    this.setSetupMode(!this.setupMode);
  }

  async onSubmit(): Promise<void> {
    if (this.signInForm.invalid) {
      this.errorMessage = 'Bitte gib deine E-Mail-Adresse und dein Passwort ein.';
      return;
    }

    this.errorMessage = '';
    this.setupSuccess = null;
    this.loading = true;

    try {
      const email = this.signInForm.value.email || '';
      const password = this.signInForm.value.password || '';
      const { error } = await this.supabaseService.signIn(email, password);
      if (error) {
        throw error;
      }
      await this.router.navigate(['/wichteln']);
    } catch (err: any) {
      this.errorMessage = err?.message || 'Anmeldung fehlgeschlagen. Bitte prüfe deine Zugangsdaten.';
    } finally {
      this.loading = false;
    }
  }

  async onSetupSubmit(): Promise<void> {
    if (this.setupForm.invalid) {
      this.errorMessage = 'Bitte Name, gültige E-Mail und ein Passwort mit mindestens 6 Zeichen eingeben.';
      return;
    }

    this.errorMessage = '';
    this.setupSuccess = null;
    this.setupLoading = true;

    try {
      const username = this.setupForm.value.username?.trim() || '';
      const email = this.setupForm.value.email?.trim() || '';
      const password = this.setupForm.value.password || '';

      const { data, error } = await this.supabaseService.signUp(email, password, username);
      if (error) {
        throw error;
      }

      if (data?.session) {
        await this.router.navigate(['/wichteln']);
        return;
      }

      this.setupSuccess = 'Konto erfolgreich angelegt! Bitte bestätige ggf. den Link in deiner E-Mail und melde dich dann an.';
      this.setupMode = false;
      this.signInForm.patchValue({ email });
    } catch (err: any) {
      this.errorMessage = err?.message || 'Fehler beim Anlegen des Kontos.';
    } finally {
      this.setupLoading = false;
    }
  }

  async onDemoLogin(profile: Profile): Promise<void> {
    this.errorMessage = '';
    this.setupSuccess = null;
    this.demoLoadingId = profile.id;
    try {
      await this.supabaseService.demoSignIn(profile.id);
      await this.router.navigate(['/wichteln']);
    } catch (err: any) {
      this.errorMessage = err?.message || 'Schnell-Login fehlgeschlagen.';
    } finally {
      this.demoLoadingId = null;
    }
  }
}
