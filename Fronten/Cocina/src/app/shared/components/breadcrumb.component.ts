import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    @if (titulo()) {
      <nav aria-label="Ruta de navegación"
           class="flex items-center gap-1.5 text-xs font-semibold">
        <a routerLink="/dashboard"
           class="transition-colors"
           style="color:rgb(var(--color-on-surface)/0.4)"
           aria-label="Inicio">
          Inicio
        </a>
        <svg class="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor"
             stroke-width="2.5" viewBox="0 0 24 24"
             style="color:rgb(var(--color-on-surface)/0.3)">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 18l6-6-6-6"/>
        </svg>
        <span style="color:rgb(var(--color-on-surface)/0.75)">{{ titulo() }}</span>
      </nav>
    }
  `,
})
export class BreadcrumbComponent {
  titulo = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      startWith(null),
      map(() => {
        let route = this.activatedRoute.firstChild;
        while (route?.firstChild) route = route.firstChild;
        return (route?.snapshot.data?.['title'] as string) ?? '';
      }),
    ),
    { initialValue: '' },
  );

  constructor(private router: Router, private activatedRoute: ActivatedRoute) {}
}
