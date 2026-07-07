import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CartItem } from '../models/product.model';

export class StockInsuficienteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StockInsuficienteError';
  }
}

export interface CheckoutResponse {
  orderId: number;
  total: number;
}

export interface ProductoRequest {
  nombre: string;
  descripcion: string;
  precio: number;
  imageUrl: string;
  stock: number;
}

export interface ProductoResponse extends ProductoRequest {
  id: number;
}

export interface ProfileRequest {
  nombre?: string;
  telefono?: string;
  direccion?: string;
  distrito?: string;
}

export interface ProfileResponse {
  id: number;
  email: string;
  nombre: string | null;
  telefono: string | null;
  direccion: string | null;
  distrito: string | null;
  dni: string | null;
}

export interface PedidoItemResponse {
  productoId: number;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface PedidoResponse {
  id: number;
  estado: string;
  total: number;
  createdAt: string;
  direccionEnvio: string | null;
  nombreComprador: string | null;
  telefonoComprador: string | null;
  emailComprador: string | null;
  items: PedidoItemResponse[];
}

@Injectable({ providedIn: 'root' })
export class BackendService {
  constructor(private http: HttpClient) {}

  private getBaseUrl(): string {
    return (window as any).__env?.API_URL || '';
  }

  async warmUp(): Promise<void> {
    const base = this.getBaseUrl();
    if (!base) return;
    try {
      await fetch(`${base.replace(/\/+$/, '')}/api/health`, {
        method: 'GET',
        cache: 'no-store',
        credentials: 'omit',
      });
    } catch { /* silent */ }
  }

  async checkout(cart: CartItem[], direccionEnvio?: string): Promise<CheckoutResponse> {
    const body = {
      items: cart.filter((i) => i.id != null).map((i) => ({ productId: i.id!, quantity: i.quantity })),
      ...(direccionEnvio ? { direccionEnvio } : {}),
    };
    try {
      return await firstValueFrom(
        this.http.post<CheckoutResponse>(`${this.getBaseUrl()}/api/checkout`, body)
      );
    } catch (e) {
      if (e instanceof HttpErrorResponse && e.status === 400) {
        throw new StockInsuficienteError(e.error || 'Stock insuficiente.');
      }
      throw e;
    }
  }

  async createProducto(data: ProductoRequest): Promise<ProductoResponse> {
    return firstValueFrom(
      this.http.post<ProductoResponse>(`${this.getBaseUrl()}/api/productos`, data)
    );
  }

  async getPerfil(): Promise<ProfileResponse> {
    return firstValueFrom(
      this.http.get<ProfileResponse>(`${this.getBaseUrl()}/api/usuarios/perfil`)
    );
  }

  async updateProfile(data: ProfileRequest): Promise<ProfileResponse> {
    return firstValueFrom(
      this.http.put<ProfileResponse>(`${this.getBaseUrl()}/api/usuarios/perfil`, data)
    );
  }

  async getMisPedidos(): Promise<PedidoResponse[]> {
    return firstValueFrom(
      this.http.get<PedidoResponse[]>(`${this.getBaseUrl()}/api/pedidos/mis-pedidos`)
    );
  }

  async getAdminPedidos(): Promise<PedidoResponse[]> {
    return firstValueFrom(
      this.http.get<PedidoResponse[]>(`${this.getBaseUrl()}/api/pedidos/admin/todos`)
    );
  }

  async patchEstadoPedido(id: number, estado: string): Promise<PedidoResponse> {
    return firstValueFrom(
      this.http.patch<PedidoResponse>(`${this.getBaseUrl()}/api/pedidos/admin/${id}/estado`, { estado })
    );
  }

  async lookupDocument(doc: string): Promise<{ nombre: string }> {
    if (doc.length === 8) {
      const res = await firstValueFrom(
        this.http.get<{ nombreCompleto: string }>(`${this.getBaseUrl()}/api/consulta/dni/${doc}`)
      );
      return { nombre: res.nombreCompleto };
    }
    const res = await firstValueFrom(
      this.http.get<{ razonSocial: string }>(`${this.getBaseUrl()}/api/consulta/ruc/${doc}`)
    );
    return { nombre: res.razonSocial };
  }
}
