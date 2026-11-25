import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SupabaseService, Profile } from '../supabase.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  currentUser: Profile | null = null;
  familyMembers: Profile[] = [];

  // Collapsible section toggles
  showPasswordSection = false;
  showFamilySection = false;

  // Feedback states
  profileLoading = false;
  profileSuccess = '';
  profileError = '';

  passwordLoading = false;
  passwordSuccess = '';
  passwordError = '';

  inviteLoading = false;
  inviteSuccess = '';
  inviteError = '';
  lastInviteText = '';
  inviteCopied = false;

  // Admin: Password reset state
  resetTargetMember: Profile | null = null;
  resetNewPassword = '';
  resetLoading = false;
  resetSuccess = '';
  resetError = '';
  resetMessageText = '';
  resetCopied = false;

  // Admin: Role toggle & user deletion state
  roleToggleLoadingId: string | null = null;
  deleteTargetMember: Profile | null = null;
  deleteLoading = false;
  adminActionSuccess = '';
  adminActionError = '';

  readonly presetColors: { name: string; hex: string }[] = [
    { name: 'Rot', hex: '#dc2626' },
    { name: 'Blau', hex: '#2563eb' },
    { name: 'Grün', hex: '#15803d' },
    { name: 'Gelb', hex: '#eab308' },
    { name: 'Orange', hex: '#ea580c' },
    { name: 'Lila', hex: '#7c3aed' },
    { name: 'Rosa', hex: '#db2777' },
    { name: 'Türkis', hex: '#0d9488' },
    { name: 'Braun', hex: '#78350f' },
    { name: 'Grau', hex: '#64748b' }
  ];

  profileForm: FormGroup = this.fb.group({
    username: ['', [Validators.required]],
    birthday: [''],
    avatar_color: ['#dc2626']
  });

  passwordForm: FormGroup = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  });

  inviteForm: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    tempPassword: ['', [Validators.required, Validators.minLength(6)]],
    role: ['member', [Validators.required]]
  });

  constructor(
    public readonly supabaseService: SupabaseService,
    private readonly fb: FormBuilder
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadData();
    this.generateRandomPassword();
  }

  async loadData(): Promise<void> {
    this.currentUser = await this.supabaseService.getCurrentProfile();
    if (this.currentUser) {
      this.profileForm.patchValue({
        username: this.currentUser.username || '',
        birthday: this.currentUser.birthday || '',
        avatar_color: this.currentUser.avatar_color || '#dc2626'
      });
    }

    this.familyMembers = await this.supabaseService.getAllProfiles();
  }

  selectColor(hex: string): void {
    this.profileForm.patchValue({ avatar_color: hex });
  }

  async onSaveProfile(): Promise<void> {
    if (!this.currentUser) return;
    if (this.profileForm.invalid) {
      this.profileError = 'Bitte gib einen gültigen Namen ein.';
      return;
    }

    this.profileLoading = true;
    this.profileError = '';
    this.profileSuccess = '';

    try {
      const payload: Partial<Profile> & { id: string } = {
        id: this.currentUser.id,
        username: this.profileForm.value.username?.trim(),
        birthday: this.profileForm.value.birthday || null,
        avatar_color: this.profileForm.value.avatar_color || '#dc2626'
      };

      const { error } = await this.supabaseService.updateProfile(payload);
      if (error) throw error;

      this.currentUser = { ...this.currentUser, ...payload };
      this.familyMembers = await this.supabaseService.getAllProfiles();
      this.profileSuccess = 'Dein Profil wurde erfolgreich gespeichert!';
      setTimeout(() => (this.profileSuccess = ''), 4000);
    } catch (err: any) {
      this.profileError = err?.message || 'Fehler beim Speichern des Profils.';
    } finally {
      this.profileLoading = false;
    }
  }

  async onChangePassword(): Promise<void> {
    if (this.passwordForm.invalid) {
      this.passwordError = 'Bitte fülle beide Passwort-Felder aus.';
      return;
    }

    const newPw = this.passwordForm.value.newPassword;
    const confirmPw = this.passwordForm.value.confirmPassword;

    if (newPw !== confirmPw) {
      this.passwordError = 'Die neuen Passwörter stimmen nicht überein.';
      return;
    }

    if (newPw.length < 6) {
      this.passwordError = 'Das Passwort muss mindestens 6 Zeichen lang sein.';
      return;
    }

    this.passwordLoading = true;
    this.passwordError = '';
    this.passwordSuccess = '';

    try {
      const { error } = await this.supabaseService.changePassword(newPw);
      if (error) throw error;

      this.passwordSuccess = 'Dein Passwort wurde erfolgreich geändert!';
      this.passwordForm.reset();
      setTimeout(() => (this.passwordSuccess = ''), 4000);
    } catch (err: any) {
      this.passwordError = err?.message || 'Fehler beim Ändern des Passworts.';
    } finally {
      this.passwordLoading = false;
    }
  }

  private createReadablePassword(): string {
    const words = [
      'stern', 'tannen', 'kerze', 'schnee', 'engel',
      'winter', 'glanz', 'wunder', 'komet', 'punsch'
    ];
    const word = words[Math.floor(Math.random() * words.length)];
    const num = Math.floor(100 + Math.random() * 900);
    return `${word}-${num}!`;
  }

  generateRandomPassword(): void {
    this.inviteForm.patchValue({
      tempPassword: this.createReadablePassword()
    });
  }

  generateResetPassword(): void {
    this.resetNewPassword = this.createReadablePassword();
  }

  async onCreateInvite(): Promise<void> {
    if (this.inviteForm.invalid) {
      this.inviteError = 'Bitte alle Felder für die Einladung vollständig ausfüllen.';
      return;
    }

    this.inviteLoading = true;
    this.inviteError = '';
    this.inviteSuccess = '';
    this.lastInviteText = '';

    const { name, email, tempPassword, role } = this.inviteForm.value;

    try {
      const { error, inviteText } = await this.supabaseService.createFamilyMemberInvite(
        name,
        email,
        tempPassword,
        role
      );

      if (error) throw error;

      this.lastInviteText = inviteText;
      this.inviteSuccess = `Familienmitglied "${name}" wurde erfolgreich angelegt!`;
      this.familyMembers = await this.supabaseService.getAllProfiles();

      // Reset form and generate a new password for the next invite
      this.inviteForm.patchValue({ name: '', email: '', role: 'member' });
      this.generateRandomPassword();
    } catch (err: any) {
      this.inviteError = err?.message || 'Fehler beim Erstellen der Einladung.';
    } finally {
      this.inviteLoading = false;
    }
  }

  private async copyTextToClipboard(text: string): Promise<boolean> {
    if (!text) return false;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      return true;
    } catch (err) {
      console.error('Kopieren fehlgeschlagen:', err);
      return false;
    }
  }

  async copyInviteText(): Promise<void> {
    if (await this.copyTextToClipboard(this.lastInviteText)) {
      this.inviteCopied = true;
      setTimeout(() => (this.inviteCopied = false), 3500);
    }
  }

  openPasswordReset(member: Profile): void {
    if (this.currentUser?.role !== 'admin') return;
    this.resetTargetMember = member;
    this.resetNewPassword = this.createReadablePassword();
    this.resetError = '';
    this.resetSuccess = '';
    this.resetMessageText = '';
    this.resetCopied = false;
  }

  closePasswordReset(): void {
    this.resetTargetMember = null;
    this.resetNewPassword = '';
    this.resetError = '';
    this.resetSuccess = '';
    this.resetMessageText = '';
    this.resetCopied = false;
  }

  async onResetMemberPassword(): Promise<void> {
    if (this.currentUser?.role !== 'admin' || !this.resetTargetMember) return;

    const trimmedPassword = this.resetNewPassword.trim();
    if (trimmedPassword.length < 6) {
      this.resetError = 'Das Passwort muss mindestens 6 Zeichen lang sein.';
      return;
    }

    this.resetLoading = true;
    this.resetError = '';
    this.resetSuccess = '';
    this.resetMessageText = '';
    this.resetCopied = false;

    try {
      const { error, messageText } = await this.supabaseService.adminResetUserPassword(
        this.resetTargetMember.id,
        trimmedPassword,
        this.resetTargetMember.username,
        this.resetTargetMember.email
      );

      if (error) throw error;

      this.resetSuccess = `Neues Passwort für "${this.resetTargetMember.username}" wurde gesetzt!`;
      this.resetMessageText = messageText;
    } catch (err: any) {
      this.resetError = err?.message || 'Fehler beim Zurücksetzen des Passworts.';
    } finally {
      this.resetLoading = false;
    }
  }

  async copyResetText(): Promise<void> {
    if (await this.copyTextToClipboard(this.resetMessageText)) {
      this.resetCopied = true;
      setTimeout(() => (this.resetCopied = false), 3500);
    }
  }

  async onToggleMemberRole(member: Profile): Promise<void> {
    if (this.currentUser?.role !== 'admin' || member.id === this.currentUser.id) return;

    const nextRole: 'admin' | 'member' = member.role === 'admin' ? 'member' : 'admin';
    this.roleToggleLoadingId = member.id;
    this.adminActionError = '';
    this.adminActionSuccess = '';

    try {
      const { error } = await this.supabaseService.adminSetUserRole(member.id, nextRole);
      if (error) throw error;

      this.familyMembers = await this.supabaseService.getAllProfiles();
      this.adminActionSuccess = `${member.username} ist jetzt ${nextRole === 'admin' ? 'Admin' : 'Mitglied'}.`;
      setTimeout(() => (this.adminActionSuccess = ''), 4000);
    } catch (err: any) {
      this.adminActionError = err?.message || 'Fehler beim Ändern der Rolle.';
    } finally {
      this.roleToggleLoadingId = null;
    }
  }

  openDeleteModal(member: Profile): void {
    if (this.currentUser?.role !== 'admin' || member.id === this.currentUser.id) return;
    this.adminActionError = '';
    this.deleteTargetMember = member;
  }

  closeDeleteModal(): void {
    if (this.deleteLoading) return;
    this.deleteTargetMember = null;
  }

  async onConfirmDeleteMember(): Promise<void> {
    if (this.currentUser?.role !== 'admin' || !this.deleteTargetMember) return;

    const target = this.deleteTargetMember;
    this.deleteLoading = true;
    this.adminActionError = '';
    this.adminActionSuccess = '';

    try {
      const { error } = await this.supabaseService.adminDeleteUser(target.id);
      if (error) throw error;

      if (this.resetTargetMember?.id === target.id) {
        this.closePasswordReset();
      }
      this.deleteTargetMember = null;
      this.familyMembers = await this.supabaseService.getAllProfiles();
      this.adminActionSuccess = `Familienmitglied "${target.username}" wurde entfernt.`;
      setTimeout(() => (this.adminActionSuccess = ''), 4000);
    } catch (err: any) {
      this.adminActionError = err?.message || 'Fehler beim Löschen des Familienmitglieds.';
      this.deleteTargetMember = null;
    } finally {
      this.deleteLoading = false;
    }
  }

  togglePasswordSection(): void {
    this.showPasswordSection = !this.showPasswordSection;
  }

  toggleFamilySection(): void {
    this.showFamilySection = !this.showFamilySection;
  }

  formatBirthday(birthday?: string | null): string {
    if (!birthday) return '–';
    const parts = birthday.split('-');
    if (parts.length === 3) {
      const months = [
        'Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni',
        'Juli', 'Aug.', 'Sept.', 'Okt.', 'Nov.', 'Dez.'
      ];
      const day = parseInt(parts[2], 10);
      const month = parseInt(parts[1], 10) - 1;
      return `${day}. ${months[month] || ''}`;
    }
    return birthday;
  }
}
