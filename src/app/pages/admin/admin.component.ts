import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../services/product.service';
import { BackendService, PedidoResponse, ProductoRequest } from '../../services/backend.service';

const EMPTY: ProductoRequest = { nombre: '', descripcion: '', precio: 0, imageUrl: '', stock: 0 };
const ESTADOS = ['CREADO', 'PROCESANDO', 'ENVIADO', 'ENTREGADO', 'CANCELADO'];
const STATUS_LABEL: Record<string, string> = {
  CREADO: 'Creado', PROCESANDO: 'Procesando', ENVIADO: 'Enviado', ENTREGADO: 'Entregado', CANCELADO: 'Cancelado',
};

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css',
})
export class AdminComponent implements OnInit {
  productService = inject(ProductService);
  private backend = inject(BackendService);

  readonly fallback = '/images/multiples-opciones-celulares-gama-media.jpg';
  readonly estados = ESTADOS;
  readonly statusLabel = STATUS_LABEL;

  // Tabs
  tab = signal<'catalog' | 'orders'>('catalog');

  // Catalog
  form: ProductoRequest = { ...EMPTY };
  errors = signal<Partial<Record<keyof ProductoRequest, string>>>({});
  saving = signal(false);
  successMsg = signal<string | null>(null);
  skeletons = Array.from({ length: 5 });

  // Orders
  orders = signal<PedidoResponse[]>([]);
  ordersLoading = signal(false);
  ordersError = signal<string | null>(null);
  filterEstado = signal<string>('TODOS');
  expanded = signal(new Set<number>());
  updatingId = signal<number | null>(null);
  orderSkeletons = Array.from({ length: 6 });

  ngOnInit() {
    this.loadOrders();
  }

  async loadOrders() {
    this.ordersLoading.set(true);
    this.ordersError.set(null);
    try {
      this.orders.set(await this.backend.getAdminPedidos());
    } catch (e) {
      this.ordersError.set(e instanceof Error ? e.message : 'Error al cargar pedidos');
    } finally {
      this.ordersLoading.set(false);
    }
  }

  filteredOrders() {
    const f = this.filterEstado();
    return f === 'TODOS' ? this.orders() : this.orders().filter(o => o.estado === f);
  }

  toggleExpand(id: number) {
    this.expanded.update(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async changeEstado(order: PedidoResponse, nuevoEstado: string) {
    if (nuevoEstado === order.estado) return;
    this.updatingId.set(order.id);
    try {
      const updated = await this.backend.patchEstadoPedido(order.id, nuevoEstado);
      this.orders.update(prev => prev.map(o => o.id === updated.id ? updated : o));
    } catch {
      alert('No se pudo actualizar el estado');
    } finally {
      this.updatingId.set(null);
    }
  }

  fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('es-PE', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  padOrder(id: number) { return String(id).padStart(6, '0'); }

  countByEstado(e: string) { return this.orders().filter(o => o.estado === e).length; }

  // Catalog
  validate(): Partial<Record<keyof ProductoRequest, string>> {
    const e: Partial<Record<keyof ProductoRequest, string>> = {};
    if (!this.form.nombre.trim())      e.nombre      = 'El nombre es obligatorio';
    if (!this.form.descripcion.trim()) e.descripcion = 'La descripción es obligatoria';
    if (this.form.precio <= 0)         e.precio      = 'El precio debe ser mayor a 0';
    if (!this.form.imageUrl.trim())    e.imageUrl    = 'La URL de imagen es obligatoria';
    if (this.form.stock < 0)           e.stock       = 'El stock no puede ser negativo';
    return e;
  }

  async handleSubmit() {
    const errs = this.validate();
    if (Object.keys(errs).length > 0) { this.errors.set(errs); return; }
    this.errors.set({});
    this.saving.set(true);
    try {
      const created = await this.backend.createProducto(this.form);
      this.successMsg.set(`Producto "${created.nombre}" creado con ID #${created.id}`);
      this.form = { ...EMPTY };
      setTimeout(() => this.successMsg.set(null), 4000);
      await this.productService.refetch();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al crear el producto');
    } finally {
      this.saving.set(false);
    }
  }

  imgError(e: Event) {
    const img = e.target as HTMLImageElement;
    img.src = this.fallback;
    img.onerror = null;
  }
}
