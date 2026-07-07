import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent {
  private router = inject(Router);
  private auth = inject(AuthService);

  nombre = '';
  apellidos = '';
  email = '';
  password = '';
  error = signal<string | null>(null);
  submitting = signal(false);
  errors = signal<Record<string, boolean>>({});

  async onSubmit() {
    const e: Record<string, boolean> = {};
    e['nombre'] = !this.nombre.trim();
    e['apellidos'] = !this.apellidos.trim();
    e['email'] = !this.email;
    e['password'] = this.password.length < 8;
    this.errors.set(e);
    if (Object.values(e).some(v => v)) return;

    this.error.set(null);
    this.submitting.set(true);
    try {
      await this.auth.register(this.nombre, this.apellidos, this.email, this.password);
      void this.router.navigate(['/'], { replaceUrl: true });
    } catch {
      this.error.set('No se pudo registrar el usuario');
    } finally {
      this.submitting.set(false);
    }
  }
}
