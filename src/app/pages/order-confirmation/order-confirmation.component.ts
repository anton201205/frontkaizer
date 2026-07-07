import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CartItem } from '../../models/product.model';

type ConfirmationState = {
  orderId: number; subtotal: number; igv: number;
  shippingCost: number; grandTotal: number; city: string; direccion?: string;
  items: CartItem[]; paymentMethod: string;
};

@Component({
  selector: 'app-order-confirmation',
  standalone: true,
  imports: [],
  templateUrl: './order-confirmation.component.html',
  styleUrl: './order-confirmation.component.css',
})
export class OrderConfirmationComponent implements OnInit {
  private router = inject(Router);

  state: ConfirmationState | null = null;
  issuedAt = '';

  ngOnInit() {
    const s = history.state as ConfirmationState | null;
    if (!s?.orderId) { void this.router.navigate(['/products'], { replaceUrl: true }); return; }
    this.state = s;
    this.issuedAt = new Date().toLocaleString('es-PE', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  goShopping() { void this.router.navigate(['/products']); }
  print() { window.print(); }

  padId(id: number) { return String(id).padStart(8, '0'); }
}
