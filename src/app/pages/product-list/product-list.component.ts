import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { ProductService } from '../../services/product.service';
import { CartService } from '../../services/cart.service';
import { Product } from '../../models/product.model';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.css',
})
export class ProductListComponent {
  productService = inject(ProductService);
  cartService = inject(CartService);
  private route = inject(ActivatedRoute);

  readonly fallbackImage = '/images/multiples-opciones-celulares-gama-media.jpg';

  selectedCategory = signal('Todos');
  maxPrice = signal(10000);
  sortBy = signal('default');
  onlyInStock = signal(false);

  private searchQuery = toSignal(
    this.route.queryParamMap.pipe(map(p => (p.get('q') ?? '').toLowerCase().trim())),
    { initialValue: '' }
  );

  readonly categories = computed(() => {
    const list = new Set<string>();
    this.productService.products().forEach(p => { if (p.category) list.add(p.category); });
    return ['Todos', ...Array.from(list)];
  });

  readonly outOfStock = computed(() => {
    const set = new Set<number>();
    this.productService.products().forEach(p => { if (p.id != null && (p.stock ?? 0) <= 0) set.add(p.id); });
    return set;
  });

  readonly processedProducts = computed(() => {
    const q = this.searchQuery();
    let result = this.productService.products().filter(p => {
      const matchesCategory = this.selectedCategory() === 'Todos' || p.category === this.selectedCategory();
      const matchesPrice = p.price <= this.maxPrice();
      const matchesStock = !this.onlyInStock() || (p.stock ?? 0) > 0;
      const matchesSearch = !q || (p.name ?? '').toLowerCase().includes(q);
      return matchesCategory && matchesPrice && matchesStock && matchesSearch;
    });

    if (this.sortBy() === 'low-to-high') result = [...result].sort((a, b) => a.price - b.price);
    else if (this.sortBy() === 'high-to-low') result = [...result].sort((a, b) => b.price - a.price);
    return result;
  });

  readonly skeletons = Array.from({ length: 9 });

  setCategory(cat: string) { this.selectedCategory.set(cat); }
  setMaxPrice(e: Event) { this.maxPrice.set(Number((e.target as HTMLInputElement).value)); }
  setSortBy(e: Event) { this.sortBy.set((e.target as HTMLSelectElement).value); }
  setOnlyInStock(e: Event) { this.onlyInStock.set((e.target as HTMLInputElement).checked); }

  addToCart(product: Product) { this.cartService.addToCart(product); }

  imgError(e: Event) {
    const img = e.target as HTMLImageElement;
    img.src = this.fallbackImage;
    img.onerror = null;
  }
}
