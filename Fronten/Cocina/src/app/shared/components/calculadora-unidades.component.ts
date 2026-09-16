import { Component, EventEmitter, Input, Output, CUSTOM_ELEMENTS_SCHEMA, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  UnidadesConversionService,
  CategoriaUnidad,
  EquivalenteUnidad,
} from '../../core/utils/unidades-conversion';

/**
 * Calculadora de unidades de medida (DEC-L-005) — modal de acceso rápido,
 * ver botón en `ShellComponent` (topbar). Puro cálculo de presentación en el
 * frontend, no llama al backend.
 */
@Component({
  selector: 'app-calculadora-unidades',
  standalone: true,
  imports: [CommonModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    @if (abierto) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
           (click)="cerrar()">
        <div class="card max-w-md w-full space-y-4 animate-fade-up" (click)="$event.stopPropagation()">

          <div class="flex items-center justify-between">
            <h3 class="font-display font-bold text-lg inline-flex items-center gap-1.5"
                style="color:rgb(var(--color-on-surface))">
              <iconify-icon icon="tabler:calculator" width="18" height="18" style="color:currentColor"></iconify-icon>
              Calculadora de unidades
            </h3>
            <button (click)="cerrar()" class="btn-ghost p-1">
              <iconify-icon icon="line-md:close" width="16" height="16" style="color:currentColor"></iconify-icon>
            </button>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="input-label">Cantidad</label>
              <input type="number" [(ngModel)]="cantidad" (ngModelChange)="recalcular()"
                     min="0" step="0.01" class="input text-sm">
            </div>
            <div>
              <label class="input-label">Unidad de origen</label>
              <select [(ngModel)]="origenCodigo" (ngModelChange)="recalcular()" class="input text-sm">
                @for (cat of categorias; track cat.id) {
                  <optgroup [label]="cat.nombre">
                    @for (u of unidadesOrdenadas(cat.id); track u.codigo) {
                      <option [value]="u.codigo">
                        {{ u.nombre }} ({{ u.codigo }}){{ u.porDefectoBolivia ? ' · Bolivia' : '' }}
                      </option>
                    }
                  </optgroup>
                }
              </select>
            </div>
          </div>

          <div>
            <p class="text-xs font-semibold uppercase tracking-wide mb-2"
               style="color:rgb(var(--color-on-surface)/0.5)">
              Equivalencias
            </p>
            @if (equivalentes.length === 0) {
              <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.4)">
                Sin otras unidades en esta categoría.
              </p>
            } @else {
              <div class="rounded-lg overflow-hidden border" style="border-color:rgb(var(--color-border))">
                <table class="w-full text-sm">
                  <tbody class="divide-y" style="border-color:rgb(var(--color-border))">
                    @for (eq of equivalentes; track eq.codigo) {
                      <tr>
                        <td class="py-2 px-3" style="color:rgb(var(--color-on-surface)/0.7)">
                          {{ eq.nombre }}
                          <span class="text-xs" style="color:rgb(var(--color-on-surface)/0.4)">({{ eq.codigo }})</span>
                        </td>
                        <td class="py-2 px-3 text-right font-mono font-semibold tabular-nums"
                            style="color:rgb(var(--color-on-surface))">
                          {{ eq.valor | number:'1.0-2' }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>

          <div class="flex justify-end pt-1">
            <button (click)="cerrar()" class="btn-secondary text-sm py-2 px-4">Cerrar</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class CalculadoraUnidadesComponent implements OnChanges {
  @Input() abierto = false;
  /** Código de unidad inicial sugerido al abrir (opcional, ej. la del insumo/ingrediente en curso). */
  @Input() unidadInicial: string | null = null;
  @Output() cerrado = new EventEmitter<void>();

  cantidad = 1;
  origenCodigo = 'g';
  equivalentes: EquivalenteUnidad[] = [];

  readonly categorias = this.conversion.categorias;

  constructor(private conversion: UnidadesConversionService) {
    this.recalcular();
  }

  ngOnChanges(): void {
    if (this.abierto) {
      if (this.unidadInicial && this.conversion.unidad(this.unidadInicial)) {
        this.origenCodigo = this.unidadInicial;
      }
      this.recalcular();
    }
  }

  /** Bolivia/métricas primero dentro de cada categoría, igual que pide el negocio. */
  unidadesOrdenadas(categoria: CategoriaUnidad) {
    return [...this.conversion.unidadesPorCategoria(categoria)]
      .sort((a, b) => Number(b.porDefectoBolivia) - Number(a.porDefectoBolivia));
  }

  recalcular(): void {
    this.equivalentes = this.conversion.equivalentes(this.cantidad || 0, this.origenCodigo);
  }

  cerrar(): void {
    this.cerrado.emit();
  }
}
