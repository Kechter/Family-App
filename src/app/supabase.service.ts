import { Injectable } from '@angular/core';
import {
  createClient,
  SupabaseClient,
  AuthChangeEvent,
  AuthSession,
  Session,
  User
} from '@supabase/supabase-js';
import { BehaviorSubject } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface Profile {
  id: string;
  email: string;
  username: string;
  role: 'admin' | 'member';
  birthday?: string | null;
  avatar_color?: string;
  wishlist?: string;
  updated_at?: string;
  // Backward compatibility fields
  website?: string;
  avatar_url?: string;
}

export interface WichtelColor {
  name: string;
  hex: string;
}

export interface WichtelExclusion {
  userAId: string;
  userBId: string;
}

export interface WichtelRound {
  id: string;
  title: string;
  year: number;
  budget: string;
  event_date: string;
  status: 'open' | 'drawn' | 'archived';
  colors: WichtelColor[];
  exclusions: WichtelExclusion[];
  created_at?: string;
}

export interface WichtelParticipant {
  id: string;
  round_id: string;
  user_id: string;
  wishlist_note: string;
  assigned_partner_id?: string | null;
  assigned_color_name?: string | null;
  assigned_color_hex?: string | null;
  revealed: boolean;
  profile?: Profile;
}

export interface WichtelAssignmentView {
  participantId: string;
  roundId: string;
  roundTitle: string;
  budget: string;
  eventDate: string;
  giverId: string;
  partnerId: string;
  partnerName: string;
  partnerWishlist: string;
  partnerNote: string;
  colorName: string;
  colorHex: string;
  revealed: boolean;
}

export type RsvpStatus = 'yes' | 'maybe' | 'no';
export type EventCategory = 'christmas' | 'birthday' | 'gathering' | 'vacation' | 'other';

export interface FamilyEvent {
  id: string;
  title: string;
  description: string;
  event_date: string;
  event_time: string;
  location: string;
  category: EventCategory;
  created_by?: string | null;
  attendees: Record<string, RsvpStatus>;
  created_at?: string;
}

export const WICHTEL_COLORS: WichtelColor[] = [
  { name: 'Rot', hex: '#dc2626' },
  { name: 'Blau', hex: '#2563eb' },
  { name: 'Grün', hex: '#16a34a' },
  { name: 'Gelb', hex: '#eab308' },
  { name: 'Orange', hex: '#ea580c' },
  { name: 'Lila', hex: '#9333ea' },
  { name: 'Rosa', hex: '#ec4899' },
  { name: 'Türkis', hex: '#0d9488' },
  { name: 'Braun', hex: '#92400e' },
  { name: 'Schwarz', hex: '#18181b' },
  { name: 'Weiß', hex: '#f8fafc' },
  { name: 'Grau', hex: '#64748b' }
];

const DEMO_STORAGE_KEY = 'family_app_demo_v1';

interface DemoStorageState {
  profiles: Profile[];
  passwords: Record<string, string>;
  currentUserId: string | null;
  rounds: WichtelRound[];
  participants: WichtelParticipant[];
  events: FamilyEvent[];
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient | null = null;
  _session: AuthSession | null = null;

  readonly isDemoMode: boolean;
  readonly currentUser$ = new BehaviorSubject<Profile | null>(null);

  get demoMode(): boolean {
    return this.isDemoMode;
  }

  constructor() {
    const isConfigured = Boolean(
      environment.supabaseUrl &&
      typeof environment.supabaseUrl === 'string' &&
      environment.supabaseUrl.startsWith('http') &&
      environment.supabaseKey
    );

    this.isDemoMode = !isConfigured;

    if (isConfigured) {
      this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
      this.supabase.auth.onAuthStateChange((_event, session) => {
        this._session = session;
        if (session?.user) {
          this.getCurrentProfile();
        } else {
          this.currentUser$.next(null);
        }
      });
    } else {
      this.ensureDemoSeed();
    }

    this.initSession();
  }

  get session() {
    if (this.supabase) {
      this.supabase.auth.getSession().then(({ data }) => {
        this._session = data.session;
      });
    }
    return this._session;
  }

  // ---------------------------------------------------------------------------
  // Demo Storage Helpers
  // ---------------------------------------------------------------------------
  private getDemoState(): DemoStorageState {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(DEMO_STORAGE_KEY) : null;
    if (raw) {
      try {
        return JSON.parse(raw) as DemoStorageState;
      } catch (err) {
        console.warn('Failed to parse demo state from localStorage, reseeding:', err);
      }
    }
    return this.ensureDemoSeed();
  }

  private saveDemoState(state: DemoStorageState): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
    }
  }

  private ensureDemoSeed(): DemoStorageState {
    const defaultProfiles: Profile[] = [
      {
        id: 'demo-user-1',
        email: 'jonathan@familie.de',
        username: 'Jonathan',
        role: 'admin',
        birthday: '1995-04-12',
        avatar_color: '#dc2626',
        wishlist: 'Bücher über Astrophysik, Espressobohnen, Wollsocken',
        updated_at: new Date().toISOString()
      },
      {
        id: 'demo-user-2',
        email: 'mama@familie.de',
        username: 'Mama',
        role: 'member',
        birthday: '1968-08-20',
        avatar_color: '#db2777',
        wishlist: 'Wollschal in Beerentönen, Gartensamen, Duftkerze Vanille',
        updated_at: new Date().toISOString()
      },
      {
        id: 'demo-user-3',
        email: 'papa@familie.de',
        username: 'Papa',
        role: 'member',
        birthday: '1965-11-28',
        avatar_color: '#15803d',
        wishlist: 'Gute Grillzange, Wandersocken, Kreuzworträtsel-Buch',
        updated_at: new Date().toISOString()
      },
      {
        id: 'demo-user-4',
        email: 'anna@familie.de',
        username: 'Anna',
        role: 'member',
        birthday: '1998-02-14',
        avatar_color: '#7c3aed',
        wishlist: 'Gutschein für Kunstbedarf, Teetassen, Skizzenbuch',
        updated_at: new Date().toISOString()
      },
      {
        id: 'demo-user-5',
        email: 'lukas@familie.de',
        username: 'Lukas',
        role: 'member',
        birthday: '2001-09-05',
        avatar_color: '#2563eb',
        wishlist: 'Gesellschaftsspiel "Cascadia", Kopfhörer-Hülle, Kletterkreide',
        updated_at: new Date().toISOString()
      }
    ];

    const defaultPasswords: Record<string, string> = {
      'demo-user-1': 'familie2026',
      'demo-user-2': 'familie2026',
      'demo-user-3': 'familie2026',
      'demo-user-4': 'familie2026',
      'demo-user-5': 'familie2026'
    };

    const defaultRound: WichtelRound = {
      id: 'demo-round-2026',
      title: 'Weihnachten 2026',
      year: 2026,
      budget: '',
      event_date: '2026-12-24',
      status: 'open',
      colors: [...WICHTEL_COLORS],
      exclusions: [{ userAId: 'demo-user-2', userBId: 'demo-user-3' }],
      created_at: new Date().toISOString()
    };

    const defaultParticipants: WichtelParticipant[] = [
      {
        id: 'part-1',
        round_id: 'demo-round-2026',
        user_id: 'demo-user-1',
        wishlist_note: 'Etwas Schönes für den Schreibtisch oder gemütliche Leseabende',
        assigned_partner_id: null,
        assigned_color_name: null,
        assigned_color_hex: null,
        revealed: false
      },
      {
        id: 'part-2',
        round_id: 'demo-round-2026',
        user_id: 'demo-user-2',
        wishlist_note: 'Liebend gern Selbstgemachtes oder etwas für den Garten',
        assigned_partner_id: null,
        assigned_color_name: null,
        assigned_color_hex: null,
        revealed: false
      },
      {
        id: 'part-3',
        round_id: 'demo-round-2026',
        user_id: 'demo-user-3',
        wishlist_note: 'Scharfe Chilisaucen oder Zubehör zum Heimwerken',
        assigned_partner_id: null,
        assigned_color_name: null,
        assigned_color_hex: null,
        revealed: false
      },
      {
        id: 'part-4',
        round_id: 'demo-round-2026',
        user_id: 'demo-user-4',
        wishlist_note: 'Kuschelsocken, feiner Kräutertee oder Kerzen',
        assigned_partner_id: null,
        assigned_color_name: null,
        assigned_color_hex: null,
        revealed: false
      },
      {
        id: 'part-5',
        round_id: 'demo-round-2026',
        user_id: 'demo-user-5',
        wishlist_note: 'Snacks aus aller Welt oder ein kniffliges Kartenspiel',
        assigned_partner_id: null,
        assigned_color_name: null,
        assigned_color_hex: null,
        revealed: false
      }
    ];

    const defaultEvents: FamilyEvent[] = [
      {
        id: 'demo-event-1',
        title: 'Heiligabend bei Oma & Opa',
        description: 'Gemeinsames Festessen und Bescherung',
        event_date: '2026-12-24',
        event_time: '17:00',
        location: 'Bei Oma & Opa',
        category: 'christmas',
        created_by: 'demo-user-1',
        attendees: {
          'demo-user-1': 'yes',
          'demo-user-2': 'yes',
          'demo-user-3': 'yes',
          'demo-user-4': 'yes',
          'demo-user-5': 'yes'
        },
        created_at: new Date().toISOString()
      },
      {
        id: 'demo-event-2',
        title: 'Großes Familien-Wichteln',
        description: 'Auspacken der Wichtel-Geschenke nach Farbcode!',
        event_date: '2026-12-24',
        event_time: '20:00',
        location: 'Wohnzimmer',
        category: 'christmas',
        created_by: 'demo-user-1',
        attendees: {
          'demo-user-1': 'yes',
          'demo-user-2': 'yes',
          'demo-user-3': 'yes',
          'demo-user-4': 'yes',
          'demo-user-5': 'yes'
        },
        created_at: new Date().toISOString()
      },
      {
        id: 'demo-event-3',
        title: 'Papas Geburtstag',
        description: 'Kaffeetrinken & Kuchen im Esszimmer',
        event_date: '2026-11-28',
        event_time: '15:00',
        location: 'Zu Hause',
        category: 'birthday',
        created_by: 'demo-user-2',
        attendees: {
          'demo-user-1': 'yes',
          'demo-user-2': 'yes',
          'demo-user-3': 'yes',
          'demo-user-4': 'maybe',
          'demo-user-5': 'yes'
        },
        created_at: new Date().toISOString()
      },
      {
        id: 'demo-event-4',
        title: 'Winterspaziergang & Glühwein',
        description: 'Schöner Rundweg im Wald mit Thermoskanne und Lebkuchen',
        event_date: '2026-12-06',
        event_time: '14:30',
        location: 'Stadtwald Parkplatz',
        category: 'gathering',
        created_by: 'demo-user-3',
        attendees: {
          'demo-user-1': 'yes',
          'demo-user-2': 'yes',
          'demo-user-3': 'yes'
        },
        created_at: new Date().toISOString()
      }
    ];

    const state: DemoStorageState = {
      profiles: defaultProfiles,
      passwords: defaultPasswords,
      currentUserId: 'demo-user-1',
      rounds: [defaultRound],
      participants: defaultParticipants,
      events: defaultEvents
    };

    this.saveDemoState(state);
    return state;
  }

  // ---------------------------------------------------------------------------
  // Auth & Profile Methods
  // ---------------------------------------------------------------------------

  async initSession(): Promise<Profile | null> {
    if (this.isDemoMode) {
      const state = this.getDemoState();
      const current = state.currentUserId
        ? state.profiles.find((p) => p.id === state.currentUserId) || null
        : null;
      this.currentUser$.next(current);
      return current;
    }

    try {
      const { data, error } = await this.supabase!.auth.getSession();
      if (error || !data.session?.user) {
        this._session = null;
        this.currentUser$.next(null);
        return null;
      }
      this._session = data.session;
      return await this.getCurrentProfile();
    } catch {
      this.currentUser$.next(null);
      return null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    if (this.isDemoMode) {
      return this.currentUser$.value !== null;
    }
    if (this.currentUser$.value) {
      return true;
    }
    const { data } = await this.supabase!.auth.getSession();
    if (!data.session?.user) {
      return false;
    }
    await this.getCurrentProfile();
    return true;
  }

  async signIn(email: string, password: string): Promise<{ data: any; error: any }> {
    const cleanEmail = email.trim();
    if (this.isDemoMode) {
      const state = this.getDemoState();
      const profile = state.profiles.find(
        (p) => p.email.toLowerCase() === cleanEmail.toLowerCase()
      );
      if (!profile) {
        return {
          data: null,
          error: new Error('Kein Benutzer mit dieser E-Mail-Adresse gefunden.')
        };
      }
      const userPw = state.passwords[profile.id] || 'familie2026';
      if (password !== userPw && password !== 'familie2026') {
        return {
          data: null,
          error: new Error('Ungültiges Passwort. (Demo-Passwort: familie2026)')
        };
      }
      state.currentUserId = profile.id;
      this.saveDemoState(state);
      this.currentUser$.next(profile);
      return { data: { user: profile, session: { user: profile } }, error: null };
    }

    const res = await this.supabase!.auth.signInWithPassword({
      email: cleanEmail,
      password
    });
    if (!res.error && res.data.user) {
      this._session = res.data.session;
      await this.getCurrentProfile();
    }
    return res;
  }

  async demoSignIn(profileId: string): Promise<Profile | null> {
    if (!this.isDemoMode) {
      throw new Error('demoSignIn ist nur im Demo-Modus verfügbar.');
    }
    const state = this.getDemoState();
    const profile = state.profiles.find((p) => p.id === profileId) || null;
    if (profile) {
      state.currentUserId = profile.id;
      this.saveDemoState(state);
      this.currentUser$.next(profile);
    }
    return profile;
  }

  async signUp(
    email: string,
    password: string,
    username?: string
  ): Promise<{ data: any; error: any }> {
    const cleanEmail = email.trim();
    const displayName = username?.trim() || cleanEmail.split('@')[0] || 'Familienmitglied';

    if (this.isDemoMode) {
      const state = this.getDemoState();
      const exists = state.profiles.some(
        (p) => p.email.toLowerCase() === cleanEmail.toLowerCase()
      );
      if (exists) {
        return {
          data: null,
          error: new Error('Ein Benutzer mit dieser E-Mail existiert bereits.')
        };
      }
      const newProfile: Profile = {
        id: 'demo-user-' + Date.now(),
        email: cleanEmail,
        username: displayName,
        role: state.profiles.length === 0 ? 'admin' : 'member',
        birthday: null,
        avatar_color: '#9E2A2B',
        wishlist: '',
        updated_at: new Date().toISOString()
      };
      state.profiles.push(newProfile);
      state.passwords[newProfile.id] = password;
      state.currentUserId = newProfile.id;

      // Automatically add new participant to the active open wichtel round if not already present
      const openRound = state.rounds.find((r) => r.status === 'open');
      if (openRound) {
        const alreadyParticipant = state.participants.some(
          (p) => p.round_id === openRound.id && p.user_id === newProfile.id
        );
        if (!alreadyParticipant) {
          state.participants.push({
            id: 'part-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
            round_id: openRound.id,
            user_id: newProfile.id,
            wishlist_note: '',
            assigned_partner_id: null,
            assigned_color_name: null,
            assigned_color_hex: null,
            revealed: false
          });
        }
      }

      this.saveDemoState(state);
      this.currentUser$.next(newProfile);
      return { data: { user: newProfile, session: { user: newProfile } }, error: null };
    }

    const res = await this.supabase!.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: { username: displayName }
      }
    });
    if (!res.error && res.data.session) {
      this._session = res.data.session;
      await this.getCurrentProfile();
    }
    return res;
  }

  async signOut(): Promise<{ error: any }> {
    if (this.isDemoMode) {
      const state = this.getDemoState();
      state.currentUserId = null;
      this.saveDemoState(state);
      this.currentUser$.next(null);
      return { error: null };
    }
    this.currentUser$.next(null);
    this._session = null;
    return this.supabase!.auth.signOut();
  }

  async changePassword(newPassword: string): Promise<{ data?: any; error: any }> {
    if (this.isDemoMode) {
      const current = this.currentUser$.value;
      if (!current) {
        return { error: new Error('Nicht angemeldet.') };
      }
      const state = this.getDemoState();
      state.passwords[current.id] = newPassword;
      this.saveDemoState(state);
      return { data: { user: current }, error: null };
    }
    return this.supabase!.auth.updateUser({ password: newPassword });
  }

  async getCurrentProfile(): Promise<Profile | null> {
    if (this.isDemoMode) {
      const state = this.getDemoState();
      const profile = state.currentUserId
        ? state.profiles.find((p) => p.id === state.currentUserId) || null
        : null;
      this.currentUser$.next(profile);
      return profile;
    }

    const {
      data: { user }
    } = await this.supabase!.auth.getUser();
    if (!user) {
      this.currentUser$.next(null);
      return null;
    }

    const { data, error } = await this.supabase!
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error || !data) {
      const fallback: Profile = {
        id: user.id,
        email: user.email || '',
        username:
          (user.user_metadata?.['username'] as string) ||
          (user.email ? user.email.split('@')[0] : 'Benutzer'),
        role:
          (user.user_metadata?.['role'] as 'admin' | 'member') || 'member',
        birthday: null,
        avatar_color: '#dc2626',
        wishlist: '',
        updated_at: new Date().toISOString()
      };
      this.currentUser$.next(fallback);
      return fallback;
    }

    const profile = data as Profile;
    this.currentUser$.next(profile);
    return profile;
  }

  async getAllProfiles(): Promise<Profile[]> {
    if (this.isDemoMode) {
      const state = this.getDemoState();
      return [...state.profiles].sort((a, b) => a.username.localeCompare(b.username));
    }
    const { data, error } = await this.supabase!
      .from('profiles')
      .select('*')
      .order('username', { ascending: true });
    if (error) {
      console.error('Error loading profiles:', error);
      return [];
    }
    return (data || []) as Profile[];
  }

  async updateProfile(
    profile: Partial<Profile> & { id: string }
  ): Promise<{ data?: any; error: any }> {
    if (this.isDemoMode) {
      const state = this.getDemoState();
      const index = state.profiles.findIndex((p) => p.id === profile.id);
      if (index === -1) {
        return { error: new Error('Profil nicht gefunden.') };
      }
      const updated: Profile = {
        ...state.profiles[index],
        ...profile,
        updated_at: new Date().toISOString()
      };
      state.profiles[index] = updated;
      this.saveDemoState(state);
      if (state.currentUserId === updated.id) {
        this.currentUser$.next(updated);
      }
      return { data: updated, error: null };
    }

    const payload = {
      ...profile,
      updated_at: new Date().toISOString()
    };
    const { data, error } = await this.supabase!
      .from('profiles')
      .update(payload)
      .eq('id', profile.id)
      .select()
      .single();

    if (!error && data) {
      if (this.currentUser$.value?.id === profile.id) {
        this.currentUser$.next(data as Profile);
      }
    }
    return { data, error };
  }

  async createFamilyMemberInvite(
    name: string,
    email: string,
    tempPassword: string,
    role: 'admin' | 'member' = 'member'
  ): Promise<{ error: any; inviteText: string }> {
    const appUrl =
      typeof window !== 'undefined' && window.location
        ? `${window.location.origin}${window.location.pathname}`
        : 'https://deine-familien-app.de';

    const cleanEmail = email.trim();
    const cleanName = name.trim();

    const inviteText =
`Hallo ${cleanName}! 🎄✨
Du bist herzlich zu unserer Familien-App eingeladen!

Hier kannst du dich einloggen:
🔗 ${appUrl}

Deine Zugangsdaten:
✉️ E-Mail: ${cleanEmail}
🔑 Start-Passwort: ${tempPassword}

Bitte ändere dein Passwort nach dem ersten Login unter "Profil & Familie".
Viel Spaß beim Wichteln und Planen unserer Familientreffen! 🎁`;

    if (this.isDemoMode) {
      const state = this.getDemoState();
      const exists = state.profiles.some(
        (p) => p.email.toLowerCase() === cleanEmail.toLowerCase()
      );
      if (exists) {
        return {
          error: new Error('Ein Benutzer mit dieser E-Mail existiert bereits.'),
          inviteText: ''
        };
      }
      const newProfile: Profile = {
        id: 'demo-user-' + Date.now(),
        email: cleanEmail,
        username: cleanName,
        role,
        birthday: null,
        avatar_color: '#b91c1c',
        wishlist: '',
        updated_at: new Date().toISOString()
      };
      state.profiles.push(newProfile);
      state.passwords[newProfile.id] = tempPassword;
      this.saveDemoState(state);
      return { error: null, inviteText };
    }

    try {
      const adminClient = createClient(environment.supabaseUrl, environment.supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
      const { data, error } = await adminClient.auth.signUp({
        email: cleanEmail,
        password: tempPassword,
        options: {
          data: {
            username: cleanName
          }
        }
      });
      if (error) {
        return { error, inviteText: '' };
      }
      if (role === 'admin' && data?.user?.id) {
        await this.adminSetUserRole(data.user.id, 'admin');
      }
      return { error: null, inviteText };
    } catch (err) {
      return { error: err, inviteText: '' };
    }
  }

  async adminResetUserPassword(
    targetUserId: string,
    newPassword: string,
    memberName: string,
    memberEmail: string
  ): Promise<{ error: any; messageText: string }> {
    const appUrl =
      typeof window !== 'undefined' && window.location
        ? `${window.location.origin}${window.location.pathname}`
        : 'https://deine-familien-app.de';

    const cleanName = memberName.trim();
    const cleanEmail = memberEmail.trim();

    const messageText =
`Hallo ${cleanName}! 🔑
Dein Passwort für die Familien-App wurde zurückgesetzt.

Hier kannst du dich einloggen:
🔗 ${appUrl}

Deine Zugangsdaten:
✉️ E-Mail: ${cleanEmail}
🔑 Neues Passwort: ${newPassword}

Du kannst dein Passwort danach jederzeit unter "Profil & Familie" wieder ändern.`;

    if (this.isDemoMode) {
      const state = this.getDemoState();
      state.passwords[targetUserId] = newPassword;
      this.saveDemoState(state);
      return { error: null, messageText };
    }

    try {
      await this.supabase!.auth.getSession();
      const { data, error } = await this.supabase!.functions.invoke('admin-user-actions', {
        body: { action: 'reset-password', targetUserId, newPassword }
      });
      if (error || data?.error) {
        return {
          error: new Error(data?.error || error?.message || 'Fehler beim Zurücksetzen.'),
          messageText: ''
        };
      }
      return { error: null, messageText };
    } catch (err: any) {
      return {
        error: new Error(err?.message || 'Fehler beim Zurücksetzen.'),
        messageText: ''
      };
    }
  }

  async adminSetUserRole(
    targetUserId: string,
    role: 'admin' | 'member'
  ): Promise<{ error: any }> {
    if (this.isDemoMode) {
      const state = this.getDemoState();
      const profile = state.profiles.find((p) => p.id === targetUserId);
      if (!profile) {
        return { error: new Error('Benutzer nicht gefunden.') };
      }
      profile.role = role;
      profile.updated_at = new Date().toISOString();
      this.saveDemoState(state);
      if (state.currentUserId === profile.id) {
        this.currentUser$.next({ ...profile });
      }
      return { error: null };
    }

    try {
      await this.supabase!.auth.getSession();
      const { data, error } = await this.supabase!.functions.invoke('admin-user-actions', {
        body: { action: 'toggle-role', targetUserId, role }
      });
      if (error || data?.error) {
        return {
          error: new Error(data?.error || error?.message || 'Fehler beim Ändern der Rolle.')
        };
      }
      return { error: null };
    } catch (err: any) {
      return { error: new Error(err?.message || 'Fehler beim Ändern der Rolle.') };
    }
  }

  async adminDeleteUser(targetUserId: string): Promise<{ error: any }> {
    if (this.isDemoMode) {
      const state = this.getDemoState();
      state.profiles = state.profiles.filter((p) => p.id !== targetUserId);
      state.participants = state.participants.filter((p) => p.user_id !== targetUserId);
      delete state.passwords[targetUserId];
      this.saveDemoState(state);
      return { error: null };
    }

    try {
      await this.supabase!.auth.getSession();
      const { data, error } = await this.supabase!.functions.invoke('admin-user-actions', {
        body: { action: 'delete-user', targetUserId }
      });
      if (error || data?.error) {
        return {
          error: new Error(data?.error || error?.message || 'Fehler beim Löschen des Benutzers.')
        };
      }
      return { error: null };
    } catch (err: any) {
      return { error: new Error(err?.message || 'Fehler beim Löschen des Benutzers.') };
    }
  }

  // ---------------------------------------------------------------------------
  // Wichtel-Randomizer Methods
  // ---------------------------------------------------------------------------

  async getActiveWichtelRound(): Promise<{
    round: WichtelRound | null;
    participants: WichtelParticipant[];
  }> {
    if (this.isDemoMode) {
      const state = this.getDemoState();
      const round = state.rounds.length > 0 ? state.rounds[0] : null;
      if (!round) {
        return { round: null, participants: [] };
      }
      const participants = state.participants
        .filter((p) => p.round_id === round.id)
        .map((p) => ({
          ...p,
          profile: state.profiles.find((prof) => prof.id === p.user_id)
        }));
      return { round, participants };
    }

    const { data: rounds, error: rError } = await this.supabase!
      .from('wichtel_rounds')
      .select('*')
      .order('year', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1);

    if (rError || !rounds || rounds.length === 0) {
      return { round: null, participants: [] };
    }
    const round = rounds[0] as WichtelRound;

    const { data: participantsData, error: pError } = await this.supabase!
      .from('wichtel_participants')
      .select('*, profile:profiles!wichtel_participants_user_id_fkey(*)')
      .eq('round_id', round.id);

    if (pError || !participantsData) {
      if (pError) {
        console.error('Error loading wichtel participants:', pError);
      }
      return { round, participants: [] };
    }

    const participants: WichtelParticipant[] = participantsData.map((item: any) => ({
      id: item.id,
      round_id: item.round_id,
      user_id: item.user_id,
      wishlist_note: item.wishlist_note || '',
      assigned_partner_id: item.assigned_partner_id || null,
      assigned_color_name: item.assigned_color_name || null,
      assigned_color_hex: item.assigned_color_hex || null,
      revealed: Boolean(item.revealed),
      profile: item.profile as Profile | undefined
    }));

    return { round, participants };
  }

  async createOrUpdateWichtelRound(
    payload: Partial<WichtelRound> & { id?: string }
  ): Promise<{ round: WichtelRound | null; error: any }> {
    if (this.isDemoMode) {
      const state = this.getDemoState();
      if (payload.id) {
        const idx = state.rounds.findIndex((r) => r.id === payload.id);
        if (idx !== -1) {
          const updated: WichtelRound = {
            ...state.rounds[idx],
            ...payload
          } as WichtelRound;
          state.rounds[idx] = updated;
          this.saveDemoState(state);
          return { round: updated, error: null };
        }
      }
      const newRound: WichtelRound = {
        id: payload.id || 'demo-round-' + Date.now(),
        title: payload.title || 'Wichtelrunde ' + (payload.year || new Date().getFullYear()),
        year: payload.year || new Date().getFullYear(),
        budget: payload.budget || '',
        event_date: payload.event_date || `${payload.year || new Date().getFullYear()}-12-24`,
        status: payload.status || 'open',
        colors: payload.colors || [...WICHTEL_COLORS],
        exclusions: payload.exclusions || [],
        created_at: new Date().toISOString()
      };
      state.rounds.unshift(newRound);
      this.saveDemoState(state);
      return { round: newRound, error: null };
    }

    if (payload.id) {
      const { data, error } = await this.supabase!
        .from('wichtel_rounds')
        .update(payload)
        .eq('id', payload.id)
        .select()
        .single();
      return { round: data as WichtelRound | null, error };
    } else {
      const toInsert = {
        title: payload.title || 'Wichtelrunde',
        year: payload.year || new Date().getFullYear(),
        budget: payload.budget || '',
        event_date: payload.event_date || `${payload.year || new Date().getFullYear()}-12-24`,
        status: payload.status || 'open',
        colors: payload.colors || WICHTEL_COLORS,
        exclusions: payload.exclusions || []
      };
      const { data, error } = await this.supabase!
        .from('wichtel_rounds')
        .insert(toInsert)
        .select()
        .single();
      return { round: data as WichtelRound | null, error };
    }
  }

  async setRoundParticipants(roundId: string, userIds: string[]): Promise<{ error: any }> {
    if (this.isDemoMode) {
      const state = this.getDemoState();
      const existing = state.participants.filter((p) => p.round_id === roundId);
      const remaining = existing.filter((p) => userIds.includes(p.user_id));
      const remainingUserIds = new Set(remaining.map((p) => p.user_id));

      const newParticipants: WichtelParticipant[] = userIds
        .filter((uid) => !remainingUserIds.has(uid))
        .map((uid) => ({
          id: 'part-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
          round_id: roundId,
          user_id: uid,
          wishlist_note: '',
          assigned_partner_id: null,
          assigned_color_name: null,
          assigned_color_hex: null,
          revealed: false
        }));

      state.participants = [
        ...state.participants.filter((p) => p.round_id !== roundId),
        ...remaining,
        ...newParticipants
      ];
      this.saveDemoState(state);
      return { error: null };
    }

    const { data: current, error: getErr } = await this.supabase!
      .from('wichtel_participants')
      .select('id, user_id')
      .eq('round_id', roundId);
    if (getErr) return { error: getErr };

    const currentList = current || [];
    const currentMap = new Map(currentList.map((item) => [item.user_id, item.id]));
    const targetSet = new Set(userIds);

    const toDeleteIds = currentList
      .filter((item) => !targetSet.has(item.user_id))
      .map((item) => item.id);

    if (toDeleteIds.length > 0) {
      const { error: delErr } = await this.supabase!
        .from('wichtel_participants')
        .delete()
        .in('id', toDeleteIds);
      if (delErr) return { error: delErr };
    }

    const toInsert = userIds
      .filter((uid) => !currentMap.has(uid))
      .map((uid) => ({
        round_id: roundId,
        user_id: uid,
        wishlist_note: '',
        revealed: false
      }));

    if (toInsert.length > 0) {
      const { error: insErr } = await this.supabase!
        .from('wichtel_participants')
        .insert(toInsert);
      if (insErr) return { error: insErr };
    }

    return { error: null };
  }

  async updateMyWishlist(roundId: string, note: string): Promise<{ error: any }> {
    const currentUser = this.currentUser$.value;
    if (!currentUser) {
      return { error: new Error('Nicht angemeldet.') };
    }

    if (this.isDemoMode) {
      const state = this.getDemoState();
      const participant = state.participants.find(
        (p) => p.round_id === roundId && p.user_id === currentUser.id
      );
      if (participant) {
        participant.wishlist_note = note;
      }
      const prof = state.profiles.find((p) => p.id === currentUser.id);
      if (prof) {
        prof.wishlist = note;
        this.currentUser$.next({ ...prof });
      }
      this.saveDemoState(state);
      return { error: null };
    }

    const { error } = await this.supabase!
      .from('wichtel_participants')
      .update({ wishlist_note: note })
      .match({ round_id: roundId, user_id: currentUser.id });

    await this.updateProfile({ id: currentUser.id, wishlist: note });
    return { error };
  }

  async drawWichtelRound(roundId: string): Promise<{ error: any }> {
    const active = await this.getActiveWichtelRound();
    if (!active.round || active.round.id !== roundId) {
      return { error: new Error('Wichtelrunde nicht gefunden.') };
    }

    const round = active.round;
    const participants = active.participants;

    if (participants.length < 2) {
      throw new Error('Zum Wichteln werden mindestens 2 Teilnehmer benötigt.');
    }

    const givers = participants.map((p) => p.user_id);
    const exclusions = round.exclusions || [];

    const isExcluded = (giver: string, receiver: string): boolean => {
      if (giver === receiver) return true;
      return exclusions.some(
        (e) =>
          (e.userAId === giver && e.userBId === receiver) ||
          (e.userAId === receiver && e.userBId === giver)
      );
    };

    // Derangement search with up to 500 randomized attempts
    let solution: string[] | null = null;
    for (let attempt = 0; attempt < 500; attempt++) {
      const receivers = [...givers];
      for (let i = receivers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = receivers[i];
        receivers[i] = receivers[j];
        receivers[j] = temp;
      }

      let valid = true;
      for (let i = 0; i < givers.length; i++) {
        if (isExcluded(givers[i], receivers[i])) {
          valid = false;
          break;
        }
      }

      if (valid) {
        solution = receivers;
        break;
      }
    }

    // Fallback: randomized backtracking search if shuffle misses under strict exclusions
    if (!solution) {
      const solveBacktracking = (
        idx: number,
        assigned: Set<string>,
        current: string[]
      ): string[] | null => {
        if (idx === givers.length) {
          return current;
        }
        const giver = givers[idx];
        const candidates = givers.filter((r) => !assigned.has(r) && !isExcluded(giver, r));
        candidates.sort(() => Math.random() - 0.5);

        for (const candidate of candidates) {
          assigned.add(candidate);
          current.push(candidate);
          const res = solveBacktracking(idx + 1, assigned, current);
          if (res) return res;
          current.pop();
          assigned.delete(candidate);
        }
        return null;
      };

      solution = solveBacktracking(0, new Set<string>(), []);
    }

    if (!solution) {
      throw new Error(
        'Keine gültige Wichtel-Auslosung möglich. Die Ausschlussregeln sind zu streng oder es gibt zu wenige Teilnehmer.'
      );
    }

    // Shuffle active colors pool & cycle cleanly
    const colorPool =
      round.colors && round.colors.length > 0 ? round.colors : WICHTEL_COLORS;
    const shuffledColors = [...colorPool].sort(() => Math.random() - 0.5);

    if (this.isDemoMode) {
      const state = this.getDemoState();
      for (let i = 0; i < participants.length; i++) {
        const pId = participants[i].id;
        const assignedPartner = solution[i];
        const assignedColor = shuffledColors[i % shuffledColors.length];

        const part = state.participants.find((p) => p.id === pId);
        if (part) {
          part.assigned_partner_id = assignedPartner;
          part.assigned_color_name = assignedColor.name;
          part.assigned_color_hex = assignedColor.hex;
          part.revealed = false;
        }
      }

      const r = state.rounds.find((rnd) => rnd.id === roundId);
      if (r) {
        r.status = 'drawn';
      }
      this.saveDemoState(state);
      return { error: null };
    }

    // Supabase persistence
    for (let i = 0; i < participants.length; i++) {
      const pId = participants[i].id;
      const assignedPartner = solution[i];
      const assignedColor = shuffledColors[i % shuffledColors.length];

      const { error: updErr } = await this.supabase!
        .from('wichtel_participants')
        .update({
          assigned_partner_id: assignedPartner,
          assigned_color_name: assignedColor.name,
          assigned_color_hex: assignedColor.hex,
          revealed: false
        })
        .eq('id', pId);

      if (updErr) return { error: updErr };
    }

    const { error: roundErr } = await this.supabase!
      .from('wichtel_rounds')
      .update({ status: 'drawn' })
      .eq('id', roundId);

    return { error: roundErr };
  }

  async resetWichtelRound(roundId: string): Promise<{ error: any }> {
    if (this.isDemoMode) {
      const state = this.getDemoState();
      state.participants
        .filter((p) => p.round_id === roundId)
        .forEach((p) => {
          p.assigned_partner_id = null;
          p.assigned_color_name = null;
          p.assigned_color_hex = null;
          p.revealed = false;
        });
      const r = state.rounds.find((rnd) => rnd.id === roundId);
      if (r) {
        r.status = 'open';
      }
      this.saveDemoState(state);
      return { error: null };
    }

    const { error: partErr } = await this.supabase!
      .from('wichtel_participants')
      .update({
        assigned_partner_id: null,
        assigned_color_name: null,
        assigned_color_hex: null,
        revealed: false
      })
      .eq('round_id', roundId);

    if (partErr) return { error: partErr };

    const { error: roundErr } = await this.supabase!
      .from('wichtel_rounds')
      .update({ status: 'open' })
      .eq('id', roundId);

    return { error: roundErr };
  }

  async getMyWichtelAssignment(roundId: string): Promise<WichtelAssignmentView | null> {
    const currentUser = this.currentUser$.value || (await this.getCurrentProfile());
    if (!currentUser) return null;

    const { round, participants } = await this.getActiveWichtelRound();
    if (!round || round.id !== roundId || round.status !== 'drawn') {
      return null;
    }

    const myPart = participants.find((p) => p.user_id === currentUser.id);
    if (!myPart || !myPart.assigned_partner_id) {
      return null;
    }

    const allProfiles = await this.getAllProfiles();
    const partnerProfile = allProfiles.find((p) => p.id === myPart.assigned_partner_id);
    const partnerPart = participants.find((p) => p.user_id === myPart.assigned_partner_id);

    return {
      participantId: myPart.id,
      roundId: round.id,
      roundTitle: round.title,
      budget: round.budget,
      eventDate: round.event_date,
      giverId: currentUser.id,
      partnerId: partnerProfile?.id || myPart.assigned_partner_id,
      partnerName: partnerProfile?.username || 'Familienmitglied',
      partnerWishlist: partnerProfile?.wishlist || '',
      partnerNote: partnerPart?.wishlist_note || '',
      colorName: myPart.assigned_color_name || '',
      colorHex: myPart.assigned_color_hex || '',
      revealed: Boolean(myPart.revealed)
    };
  }

  async markWichtelRevealed(participantId: string): Promise<{ error: any }> {
    if (this.isDemoMode) {
      const state = this.getDemoState();
      const p = state.participants.find((item) => item.id === participantId);
      if (p) {
        p.revealed = true;
        this.saveDemoState(state);
      }
      return { error: null };
    }

    const { error } = await this.supabase!.from('wichtel_participants')
      .update({ revealed: true })
      .eq('id', participantId);
    return { error };
  }

  // ---------------------------------------------------------------------------
  // Family Calendar Methods
  // ---------------------------------------------------------------------------

  async getEvents(): Promise<FamilyEvent[]> {
    if (this.isDemoMode) {
      const state = this.getDemoState();
      return [...state.events].sort((a, b) => a.event_date.localeCompare(b.event_date));
    }

    const { data, error } = await this.supabase!
      .from('family_events')
      .select('*')
      .order('event_date', { ascending: true });

    if (error) {
      console.error('Error fetching family events:', error);
      return [];
    }
    return (data || []) as FamilyEvent[];
  }

  async createEvent(
    event: Omit<FamilyEvent, 'id' | 'created_at' | 'attendees'>
  ): Promise<{ data: FamilyEvent | null; error: any }> {
    const currentUser = this.currentUser$.value || (await this.getCurrentProfile());
    const attendees: Record<string, RsvpStatus> = currentUser
      ? { [currentUser.id]: 'yes' }
      : {};

    if (this.isDemoMode) {
      const state = this.getDemoState();
      const newEvent: FamilyEvent = {
        id: 'demo-event-' + Date.now(),
        title: event.title,
        description: event.description || '',
        event_date: event.event_date,
        event_time: event.event_time || '',
        location: event.location || '',
        category: event.category || 'gathering',
        created_by: currentUser?.id || null,
        attendees,
        created_at: new Date().toISOString()
      };
      state.events.push(newEvent);
      this.saveDemoState(state);
      return { data: newEvent, error: null };
    }

    const payload = {
      title: event.title,
      description: event.description || '',
      event_date: event.event_date,
      event_time: event.event_time || '',
      location: event.location || '',
      category: event.category || 'gathering',
      created_by: currentUser?.id || null,
      attendees
    };

    const { data, error } = await this.supabase!
      .from('family_events')
      .insert(payload)
      .select()
      .single();

    return { data: data as FamilyEvent | null, error };
  }

  async deleteEvent(eventId: string): Promise<{ error: any }> {
    if (this.isDemoMode) {
      const state = this.getDemoState();
      state.events = state.events.filter((e) => e.id !== eventId);
      this.saveDemoState(state);
      return { error: null };
    }

    const { error } = await this.supabase!
      .from('family_events')
      .delete()
      .eq('id', eventId);
    return { error };
  }

  async toggleRsvp(eventId: string, status: RsvpStatus): Promise<{ error: any }> {
    const currentUser = this.currentUser$.value || (await this.getCurrentProfile());
    if (!currentUser) {
      return { error: new Error('Nicht angemeldet.') };
    }

    if (this.isDemoMode) {
      const state = this.getDemoState();
      const ev = state.events.find((e) => e.id === eventId);
      if (!ev) {
        return { error: new Error('Termin nicht gefunden.') };
      }
      ev.attendees = {
        ...(ev.attendees || {}),
        [currentUser.id]: status
      };
      this.saveDemoState(state);
      return { error: null };
    }

    const { data: ev, error: getErr } = await this.supabase!
      .from('family_events')
      .select('attendees')
      .eq('id', eventId)
      .single();

    if (getErr || !ev) {
      return { error: getErr || new Error('Termin nicht gefunden.') };
    }

    const attendees = {
      ...((ev.attendees as Record<string, RsvpStatus>) || {}),
      [currentUser.id]: status
    };

    const { error } = await this.supabase!
      .from('family_events')
      .update({ attendees })
      .eq('id', eventId);

    return { error };
  }

  // ---------------------------------------------------------------------------
  // Backward-compatibility Helpers
  // ---------------------------------------------------------------------------

  profile(user: User) {
    if (!this.supabase) {
      return Promise.resolve({
        data: this.currentUser$.value,
        error: null
      });
    }
    return this.supabase
      .from('profiles')
      .select('username, website, avatar_url')
      .eq('id', user.id)
      .single();
  }

  authChanges(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    if (this.supabase) {
      return this.supabase.auth.onAuthStateChange(callback);
    }
    return {
      data: {
        subscription: {
          unsubscribe: () => {}
        }
      }
    };
  }

  downLoadImage(path: string) {
    if (!this.supabase) {
      return Promise.resolve({ data: null, error: new Error('Demo mode') });
    }
    return this.supabase.storage.from('avatars').download(path);
  }

  uploadAvatar(filePath: string, file: File) {
    if (!this.supabase) {
      return Promise.resolve({ data: null, error: new Error('Demo mode') });
    }
    return this.supabase.storage.from('avatars').upload(filePath, file);
  }
}
