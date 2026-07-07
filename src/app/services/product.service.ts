import { Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Product } from '../models/product.model';

interface ProductoRow {
  id: number;
  nombre: string;
  precio: number;
  stock: number;
  image_url: string;
  descripcion: string;
  updated_at?: string;
}

function mapRowToProduct(p: ProductoRow): Product {
  return {
    id: p.id,
    name: p.nombre,
    price: p.precio,
    imageUrl: p.image_url ?? '',
    category: 'General',
    description: p.descripcion,
    stock: p.stock,
  };
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private _products = signal<Product[]>([]);
  private _loading = signal(true);
  private _error = signal<string | null>(null);

  readonly products = this._products.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  constructor(private supabase: SupabaseService) {
    this.fetchAndSubscribe();
  }

  async refetch(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    const { data, error } = await this.supabase.client
      .from('productos')
      .select('id,nombre,precio,stock,image_url,descripcion,updated_at')
      .order('nombre', { ascending: true });

    if (error) {
      this._error.set(error.message);
      this._products.set([]);
    } else {
      this._products.set(((data ?? []) as ProductoRow[]).map(mapRowToProduct));
    }
    this._loading.set(false);
  }

  private fetchAndSubscribe(): void {
    void this.refetch();

    this.supabase.client
      .channel('realtime-productos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, (payload) => {
        const event = payload.eventType;
        const newRow = payload.new as Partial<ProductoRow>;
        const oldRow = payload.old as Partial<ProductoRow>;

        this._products.update((prev) => {
          if (event === 'INSERT') {
            if (newRow.id == null) return prev;
            return [mapRowToProduct(newRow as ProductoRow), ...prev];
          }
          if (event === 'UPDATE') {
            if (newRow.id == null) return prev;
            return prev.map((p) =>
              p.id !== newRow.id ? p : {
                ...p,
                name: newRow.nombre ?? p.name,
                price: newRow.precio ?? p.price,
                imageUrl: newRow.image_url ?? p.imageUrl,
                description: newRow.descripcion ?? p.description,
                stock: newRow.stock ?? p.stock,
              }
            );
          }
          if (event === 'DELETE') {
            if (oldRow.id == null) return prev;
            return prev.filter((p) => p.id !== oldRow.id);
          }
          return prev;
        });
      })
      .subscribe();
  }

  async getById(id: number): Promise<Product | undefined> {
    const { data, error } = await this.supabase.client
      .from('productos')
      .select('id,nombre,precio,stock,image_url,descripcion')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return undefined;
    return mapRowToProduct(data as ProductoRow);
  }
}
