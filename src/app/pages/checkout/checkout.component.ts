import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { BackendService, StockInsuficienteError } from '../../services/backend.service';
import { CartItem } from '../../models/product.model';

type CheckoutState = { subtotal: number; igv: number; shippingCost: number; grandTotal: number; city: string; direccion: string; };

const CARD_RE   = /^\d{16}$/;
const EXPIRY_RE = /^(0[1-9]|1[0-2])\/\d{2}$/;
const CVV_RE    = /^\d{3}$/;

function fmtExpiry(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.css',
})
export class CheckoutComponent implements OnInit {
  router = inject(Router);
  cartService = inject(CartService);
  private auth = inject(AuthService);
  private backend = inject(BackendService);

  s: CheckoutState = { subtotal: 0, igv: 0, shippingCost: 0, grandTotal: 0, city: 'Lima', direccion: '' };
  editingAddress = signal(false);

  method = signal<'card' | 'qr'>('card');
  loading = signal(false);
  errors = signal<Record<string, string>>({});

  cardNumber = ''; cardName = ''; expiry = ''; cvv = ''; opNumber = '';

  ngOnInit() {
    const state = history.state as CheckoutState | null;
    if (state?.grandTotal) this.s = state;
    if (!this.auth.isAuthenticated()) void this.router.navigate(['/login'], { replaceUrl: true });
    else if (this.cartService.cart().length === 0) void this.router.navigate(['/cart'], { replaceUrl: true });
  }

  setMethod(m: 'card' | 'qr') { this.method.set(m); }

  onExpiryInput(e: Event) { this.expiry = fmtExpiry((e.target as HTMLInputElement).value); }
  onCardNumberInput(e: Event) { this.cardNumber = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 16); }
  onCvvInput(e: Event) { this.cvv = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 3); }
  onOpInput(e: Event) { this.opNumber = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 12); }

  validate(): Record<string, string> {
    if (this.method() === 'card') {
      const e: Record<string, string> = {};
      if (!CARD_RE.test(this.cardNumber))   e['cardNumber'] = 'Debe tener 16 dígitos';
      if (!this.cardName.trim())            e['cardName']   = 'Ingresa el nombre del titular';
      if (!EXPIRY_RE.test(this.expiry))     e['expiry']     = 'Formato MM/AA';
      if (!CVV_RE.test(this.cvv))           e['cvv']        = 'CVV de 3 dígitos';
      return e;
    }
    if (!/^\d{6,12}$/.test(this.opNumber.trim())) return { opNumber: 'Número de operación de 6 a 12 dígitos' };
    return {};
  }

  async handleSubmit() {
    const errs = this.validate();
    if (Object.keys(errs).length > 0) { this.errors.set(errs); return; }
    this.errors.set({});
    this.loading.set(true);
    try {
      const snapshot: CartItem[] = [...this.cartService.cart()];
      const direccionEnvio = this.s.direccion ? `${this.s.direccion}, ${this.s.city}` : this.s.city;
      const res = await this.backend.checkout(this.cartService.cart(), direccionEnvio);
      this.cartService.clearCart();
      void this.router.navigate(['/order-confirmation'], {
        replaceUrl: true,
        state: {
          orderId: res.orderId, subtotal: this.s.subtotal, igv: this.s.igv,
          shippingCost: this.s.shippingCost, grandTotal: this.s.grandTotal, city: this.s.city,
          direccion: this.s.direccion,
          items: snapshot, paymentMethod: this.method() === 'card' ? 'Tarjeta de crédito/débito' : 'Yape / Plin',
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error inesperado.';
      alert(e instanceof StockInsuficienteError ? `Advertencia: ${msg}` : `Error: ${msg}`);
    } finally {
      this.loading.set(false);
    }
  }
}
