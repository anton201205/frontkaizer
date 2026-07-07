import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { BackendService, PedidoResponse } from '../../services/backend.service';

const PROFILE_KEY = 'kaizer_profile';
const CITIES = ['Lima','Arequipa','Trujillo','Chiclayo','Piura','Huancayo','Cusco','Iquitos','Otra ciudad'];
const STATUS_LABEL: Record<string, string> = {
  CREADO: 'Creado', PROCESANDO: 'Procesando', ENVIADO: 'Enviado', ENTREGADO: 'Entregado', CANCELADO: 'Cancelado',
};
const STATUS_ICON: Record<string, string> = {
  CREADO: 'fi fi-rs-clock', PROCESANDO: 'fi fi-rs-refresh', ENVIADO: 'fi fi-rs-truck-side',
  ENTREGADO: 'fi fi-rs-check-circle', CANCELADO: 'fi fi-rs-cross-circle',
};

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfileComponent implements OnInit {
  auth = inject(AuthService);
  private backend = inject(BackendService);

  readonly cities = CITIES;
  readonly statusLabel = STATUS_LABEL;
  readonly statusIcon = STATUS_ICON;

  tab = signal<'profile' | 'orders'>('profile');

  form = this.loadForm();
  saving = signal(false);
  saveMsg = signal<string | null>(null);

  docVerifying = signal(false);
  docResult = signal<string | null>(null);

  orders = signal<PedidoResponse[]>([]);
  ordersLoading = signal(false);
  ordersError = signal<string | null>(null);
  expanded = signal(new Set<number>());

  private loadForm() {
    try {
      const s = localStorage.getItem(PROFILE_KEY);
      const base = s ? JSON.parse(s) : { nombre: '', telefono: '', direccion: '', distrito: 'Lima', docNumber: '' };
      if (!base.nombre) base.nombre = this.auth.userNombre() ?? '';
      return base;
    } catch { return { nombre: this.auth.userNombre() ?? '', telefono: '', direccion: '', distrito: 'Lima', docNumber: '' }; }
  }

  ngOnInit() { this.loadPerfil(); }

  private async loadPerfil() {
    try {
      const p = await this.backend.getPerfil();
      this.form.nombre    = p.nombre    ?? '';
      this.form.telefono  = p.telefono  ?? '';
      this.form.direccion = p.direccion ?? '';
      this.form.distrito  = p.distrito  ?? 'Lima';
      if (p.nombre) this.auth.setNombre(p.nombre);
    } catch { /* usa localStorage como fallback */ }
  }

  setTab(t: 'profile' | 'orders') {
    this.tab.set(t);
    if (t === 'orders' && this.orders().length === 0 && !this.ordersError()) this.loadOrders();
  }

  private async loadOrders() {
    this.ordersLoading.set(true);
    try {
      this.orders.set(await this.backend.getMisPedidos());
    } catch (e) {
      this.ordersError.set(e instanceof Error ? e.message : 'Error al cargar pedidos');
    } finally {
      this.ordersLoading.set(false);
    }
  }

  retryOrders() { this.ordersError.set(null); this.orders.set([]); this.loadOrders(); }

  async handleSave() {
    this.saving.set(true);
    try {
      await this.backend.updateProfile({
        nombre: this.form.nombre || undefined,
        telefono: this.form.telefono || undefined,
        direccion: this.form.direccion || undefined,
        distrito: this.form.distrito || undefined,
      });
      if (this.form.nombre) this.auth.setNombre(this.form.nombre);
      localStorage.setItem(PROFILE_KEY, JSON.stringify(this.form));
      this.saveMsg.set('Perfil actualizado correctamente');
      setTimeout(() => this.saveMsg.set(null), 3000);
    } catch (e) {
      this.saveMsg.set(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      this.saving.set(false);
    }
  }

  async handleVerifyDoc() {
    const doc = this.form.docNumber.replace(/\D/g, '').trim();
    if (doc.length !== 8 && doc.length !== 11) { alert('Ingresa 8 dígitos (DNI) o 11 dígitos (RUC)'); return; }
    this.docVerifying.set(true);
    this.docResult.set(null);
    try {
      const res = await this.backend.lookupDocument(doc);
      this.docResult.set(res.nombre);
    } catch {
      alert('Documento no encontrado o servicio no disponible');
    } finally {
      this.docVerifying.set(false);
    }
  }

  applyDocName() {
    if (this.docResult()) { this.form.nombre = this.docResult()!; this.docResult.set(null); }
  }

  toggleExpand(id: number) {
    this.expanded.update(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('es-PE', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  padOrder(id: number) { return String(id).padStart(6, '0'); }

  skeletons = Array.from({ length: 4 });
}