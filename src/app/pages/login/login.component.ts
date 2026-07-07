import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { BackendService } from '../../services/backend.service';

type Tab = 'login' | 'register';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private router  = inject(Router);
  private auth    = inject(AuthService);
  private backend = inject(BackendService);

  tab = signal<Tab>('login');

  // Login fields
  loginEmail    = '';
  loginPassword = '';

  // Register fields
  regNombre   = '';
  regEmail    = '';
  regPassword = '';

  // State
  error      = signal<string | null>(null);
  submitting = signal(false);
  errors     = signal<Record<string, string>>({});

  setTab(t: Tab) {
    this.tab.set(t);
    this.error.set(null);
    this.errors.set({});
    this.regNombre = '';
  }

  async onLogin() {
    const e: Record<string, string> = {};
    if (!this.loginEmail)              e['email']    = 'Email requerido';
    if (this.loginPassword.length < 8) e['password'] = 'Mínimo 8 caracteres';
    if (Object.keys(e).length) { this.errors.set(e); return; }

    this.errors.set({});
    this.error.set(null);
    this.submitting.set(true);
    try {
      await this.auth.login(this.loginEmail, this.loginPassword);
      void this.router.navigate(['/'], { replaceUrl: true });
    } catch {
      this.error.set('Email o contraseña incorrectos');
    } finally {
      this.submitting.set(false);
    }
  }

  async onRegister() {
    const e: Record<string, string> = {};
    if (!this.regNombre.trim())      e['nombre']    = 'Nombre requerido';
    if (!this.regEmail)              e['email']     = 'Email requerido';
    if (this.regPassword.length < 8) e['password']  = 'Mínimo 8 caracteres';
    if (Object.keys(e).length) { this.errors.set(e); return; }

    this.errors.set({});
    this.error.set(null);
    this.submitting.set(true);
    try {
      await this.auth.register(this.regNombre, this.regEmail, this.regPassword);
      this.auth.setNombre(this.regNombre.trim());
      void this.router.navigate(['/'], { replaceUrl: true });
    } catch {
      this.error.set('No se pudo crear la cuenta. Intenta con otro email.');
    } finally {
      this.submitting.set(false);
    }
  }
}