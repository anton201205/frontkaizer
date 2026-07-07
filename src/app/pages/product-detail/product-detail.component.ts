import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ProductService } from '../../services/product.service';
import { CartService } from '../../services/cart.service';
import { Product } from '../../models/product.model';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.css',
})
export class ProductDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private productService = inject(ProductService);
  private cartService = inject(CartService);

  readonly fallbackImage = '/images/multiples-opciones-celulares-gama-media.jpg';

  product = signal<Product | null>(null);
  loading = signal(true);
  notFound = signal(false);

  async ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id)) { this.notFound.set(true); this.loading.set(false); return; }
    try {
      const data = await this.productService.getById(id);
      if (!data) { this.notFound.set(true); } else { this.product.set(data); }
    } catch {
      this.notFound.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  addToCart() {
    const p = this.product();
    if (p) this.cartService.addToCart(p);
  }

  getIconForSpec(key: string): string {
    const k = key.toLowerCase();
    if (k.includes('procesador') || k.includes('cpu') || k.includes('chip')) return 'fi fi-rs-brain';
    if (k.includes('gráfic') || k.includes('gpu') || k.includes('rtx')) return 'fi fi-rs-gamepad';
    if (k.includes('pantalla') || k.includes('display')) return 'fi fi-rs-computer';
    if (k.includes('memoria') || k.includes('ram')) return 'fi fi-rs-charging-station';
    if (k.includes('almacenamiento') || k.includes('ssd') || k.includes('disco')) return 'fi fi-rs-database';
    if (k.includes('cámara') || k.includes('camara')) return 'fi fi-rs-camera';
    if (k.includes('batería') || k.includes('bateria')) return 'fi fi-rs-battery-full';
    if (k.includes('conectividad') || k.includes('wifi') || k.includes('bluetooth')) return 'fi fi-rs-wifi';
    if (k.includes('tamaño') || k.includes('peso')) return 'fi fi-rs-box';
    return 'fi fi-rs-settings';
  }

  specEntries(): [string, string][] {
    const specs = this.product()?.specifications;
    return specs ? Object.entries(specs) : [];
  }

  imgError(e: Event) {
    const img = e.target as HTMLImageElement;
    img.src = this.fallbackImage;
    img.onerror = null;
  }
}
