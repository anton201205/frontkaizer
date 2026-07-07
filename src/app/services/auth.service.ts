import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

interface LoginResponse {
  token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY  = 'token';
  private readonly NOMBRE_KEY = 'user_nombre';

  private _token     = signal<string | null>(null);
  private _userEmail = signal<string | null>(null);
  private _userRole  = signal<string | null>(null);
  private _userNombre = signal<string | null>(null);

  readonly token     = this._token.asReadonly();
  readonly userEmail = this._userEmail.asReadonly();
  readonly userNombre = this._userNombre.asReadonly();
  readonly isAuthenticated = computed(() => Boolean(this._token()));
  readonly isAdmin = computed(() => this._userRole() === 'ADMIN');

  constructor(private http: HttpClient) {
    const stored = localStorage.getItem(this.TOKEN_KEY);
    if (stored) this.applyToken(stored);
    const nombre = localStorage.getItem(this.NOMBRE_KEY);
    if (nombre) this._userNombre.set(nombre);
  }

  setNombre(nombre: string): void {
    localStorage.setItem(this.NOMBRE_KEY, nombre);
    this._userNombre.set(nombre);
  }

  private getBaseUrl(): string {
    return (window as any).__env?.API_URL || '';
  }

  private parseToken(t: string): { email: string | null; role: string | null; nombre: string | null } {
    try {
      const payload = t.split('.')[1];
      if (!payload) return { email: null, role: null, nombre: null };
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
      const data = JSON.parse(atob(padded)) as { sub?: string; role?: string; nombre?: string };
      return { email: data.sub ?? null, role: data.role ?? null, nombre: data.nombre ?? null };
    } catch {
      return { email: null, role: null, nombre: null };
    }
  }

  private applyToken(t: string): void {
    const { email, role, nombre } = this.parseToken(t);
    this._token.set(t);
    this._userEmail.set(email);
    this._userRole.set(role);
    if (nombre) {
      this._userNombre.set(nombre);
      localStorage.setItem(this.NOMBRE_KEY, nombre);
    }
  }

  async login(email: string, password: string): Promise<void> {
    const res = await firstValueFrom(
      this.http.post<LoginResponse>(`${this.getBaseUrl()}/api/auth/login`, { email, password })
    );
    localStorage.setItem(this.TOKEN_KEY, res.token);
    this.applyToken(res.token);
  }

  async register(nombre: string, apellidos: string, email: string, password: string): Promise<void> {
    const res = await firstValueFrom(
      this.http.post<LoginResponse>(`${this.getBaseUrl()}/api/auth/register`, { nombre, apellidos, email, password })
    );
    localStorage.setItem(this.TOKEN_KEY, res.token);
    this.applyToken(res.token);
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.NOMBRE_KEY);
    localStorage.removeItem('kaizer_profile');
    this._token.set(null);
    this._userEmail.set(null);
    this._userRole.set(null);
    this._userNombre.set(null);
  }
}
