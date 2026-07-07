import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { BackendService } from '../../services/backend.service';
import { FormsModule } from '@angular/forms';

const SHIPPING_COSTS: Record<string, number> = {
  'Lima': 0, 'Arequipa': 15, 'Trujillo': 15, 'Chiclayo': 15,
  'Piura': 20, 'Huancayo': 20, 'Cusco': 20, 'Iquitos': 25, 'Otra ciudad': 20,
};

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.css',
})
export class CartComponent implements OnInit {
  cartService = inject(CartService);
  auth        = inject(AuthService);
  private router  = inject(Router);
  private backend = inject(BackendService);

  readonly cities = Object.keys(SHIPPING_COSTS);

  city      = signal('Lima');
  direccion = signal('');
  editingAddress = signal(false);
  profileLoaded  = signal(false);
  addressError   = signal(false);

  readonly subtotal    = computed(() => this.cartService.cart().reduce((acc, i) => acc + i.price * i.quantity, 0));
  readonly igv         = computed(() => this.subtotal() * 0.18);
  readonly shippingCost = computed(() => SHIPPING_COSTS[this.city()] ?? 20);
  readonly grandTotal  = computed(() => this.subtotal() + this.igv() + this.shippingCost());
  readonly hasAddress  = computed(() => this.direccion().trim().length > 0);

  ngOnInit() {
    if (this.auth.isAuthenticated()) this.loadPerfil();
  }

  private async loadPerfil() {
    try {
      const p = await this.backend.getPerfil();
      if (p.direccion) this.direccion.set(p.direccion);
      if (p.ciudad && SHIPPING_COSTS[p.ciudad] !== undefined) this.city.set(p.ciudad);
      this.profileLoaded.set(true);
    } catch { this.profileLoaded.set(true); }
  }

  setCity(val: string) { this.city.set(val); }
  setDireccion(val: string) { this.direccion.set(val); this.addressError.set(false); }
  toggleEdit() { this.editingAddress.set(!this.editingAddress()); }

  updateQty(id: number, qty: number) { this.cartService.updateQuantity(id, qty); }
  removeAt(i: number) { this.cartService.removeAt(i); }

  goToCheckout() {
    if (!this.auth.isAuthenticated()) {
      void this.router.navigate(['/login'], { state: { from: '/cart' } });
      return;
    }
    if (!this.hasAddress()) {
      this.addressError.set(true);
      this.editingAddress.set(true);
      return;
    }
    void this.router.navigate(['/checkout'], {
      state: {
        subtotal: this.subtotal(), igv: this.igv(),
        shippingCost: this.shippingCost(), grandTotal: this.grandTotal(),
        city: this.city(), direccion: this.direccion(),
      },
    });
  }
}
