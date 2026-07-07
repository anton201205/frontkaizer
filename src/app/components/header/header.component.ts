import { Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent {
  private router = inject(Router);
  auth = inject(AuthService);
  cart = inject(CartService);

  searchQuery = '';

  readonly displayName = computed(() => {
    const nombre = this.auth.userNombre();
    if (nombre) {
      const first = nombre.split(' ')[0];
      return first.length > 14 ? first.slice(0, 13) + '…' : first;
    }
    const email = this.auth.userEmail();
    if (!email) return '';
    const local = email.split('@')[0];
    return local.length > 14 ? local.slice(0, 13) + '…' : local;
  });

  onSearchChange(value: string) {
    this.searchQuery = value;
    if (value) {
      void this.router.navigate(['/products'], { queryParams: { q: value }, replaceUrl: true });
    } else {
      void this.router.navigate(['/products'], { replaceUrl: true });
    }
  }

  handleLogout() {
    this.auth.logout();
    void this.router.navigate(['/'], { replaceUrl: true });
  }
}
