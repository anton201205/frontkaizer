import { Injectable, signal, computed } from '@angular/core';
import { Product, CartItem } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class CartService {
  private _cart = signal<CartItem[]>(this.loadCart());

  readonly cart = this._cart.asReadonly();
  readonly cartCount = computed(() =>
    this._cart().reduce((acc, item) => acc + item.quantity, 0)
  );

  private loadCart(): CartItem[] {
    try {
      const stored = localStorage.getItem('cart');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private saveCart(cart: CartItem[]): void {
    localStorage.setItem('cart', JSON.stringify(cart));
  }

  addToCart(product: Product): boolean {
    let blocked = false;
    this._cart.update((prev) => {
      const existing = prev.find((p) => p.id === product.id);
      if (existing) {
        const maxStock = product.stock ?? Infinity;
        if (existing.quantity >= maxStock) {
          blocked = true;
          return prev;
        }
        return prev.map((p) =>
          p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    this.saveCart(this._cart());
    return !blocked;
  }

  updateQuantity(id: number, quantity: number): string {
    if (quantity <= 0) {
      const item = this._cart().find((p) => p.id === id);
      this._cart.update((prev) => prev.filter((p) => p.id !== id));
      this.saveCart(this._cart());
      return item ? `${item.name} eliminado del carrito` : '';
    }
    this._cart.update((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const clamped = Math.min(quantity, p.stock ?? quantity);
        return { ...p, quantity: clamped };
      })
    );
    this.saveCart(this._cart());
    return 'Cantidad actualizada';
  }

  removeAt(index: number): CartItem | null {
    const item = this._cart()[index] ?? null;
    this._cart.update((prev) => prev.filter((_, i) => i !== index));
    this.saveCart(this._cart());
    return item;
  }

  clearCart(): void {
    this._cart.set([]);
    this.saveCart([]);
  }
}
