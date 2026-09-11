import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-sin-acceso',
  standalone: true,
  imports: [RouterModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
      <iconify-icon icon="tabler:lock" width="56" height="56" style="color:currentColor" class="mb-6 inline-block"></iconify-icon>
      <h1 class="font-display text-2xl font-bold mb-2"
          style="color: rgb(var(--color-on-surface))">
        Acceso denegado
      </h1>
      <p class="text-sm mb-6 max-w-sm"
         style="color: rgb(var(--color-on-surface)/0.5)">
        No tienes permiso para acceder a esta sección.
        Contacta al administrador si crees que es un error.
      </p>
      <a [routerLink]="['/dashboard']" class="btn-primary">
        ← Volver al dashboard
      </a>
    </div>
  `,
})
export class SinAccesoComponent {}
