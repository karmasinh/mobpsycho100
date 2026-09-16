import { Component, Input, CUSTOM_ELEMENTS_SCHEMA, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UnidadesConversionService } from '../../core/utils/unidades-conversion';

/**
 * Botón "Convertir" por fila (DEC-L-005, Parte 5): abre un popover pequeño con
 * las unidades de la misma categoría que `unidadOrigen` y recalcula
 * `cantidad` en la unidad elegida. Solo cambia lo que se MUESTRA en la fila —
 * nunca el dato guardado en el backend.
 */
@Component({
  selector: 'app-convertir-unidad-popover',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="relative inline-flex items-center gap-1.5">
      @if (valorMostrado(); as vm) {
        <span class="text-xs font-mono font-semibold" style="color:rgb(var(--color-primary))">
          {{ vm.valor }} {{ vm.unidad }}
        </span>
      }
      <button (click)="toggle()" type="button"
              class="text-xs py-1 px-2 rounded-lg border border-border bg-surface hover:border-primary/50 text-on-surface/75 inline-flex items-center gap-1"
              title="Ver en otras unidades">
        <iconify-icon icon="tabler:arrows-exchange" width="14" height="14" style="color:currentColor"></iconify-icon>
        Convertir
      </button>

      @if (abierto()) {
        <div class="fixed inset-0 z-40" (click)="cerrar()"></div>
        <div class="absolute right-0 z-50 mt-1 w-56 rounded-xl shadow-lg border p-2 space-y-1"
             style="background:rgb(var(--color-surface));border-color:rgb(var(--color-border))"
             (click)="$event.stopPropagation()">
          @if (!codigoOrigen()) {
            <p class="text-xs p-1.5" style="color:rgb(var(--color-on-surface)/0.5)">
              Unidad "{{ unidadOrigen }}" no reconocida para convertir.
            </p>
          } @else if (equivalentes().length === 0) {
            <p class="text-xs p-1.5" style="color:rgb(var(--color-on-surface)/0.5)">
              Sin otras unidades en esta categoría.
            </p>
          } @else {
            @for (eq of equivalentes(); track eq.codigo) {
              <button (click)="elegir(eq.codigo)" type="button"
                      class="w-full text-left text-xs py-1.5 px-2 rounded-lg flex items-center justify-between"
                      [class.font-semibold]="seleccionCodigo() === eq.codigo"
                      style="color:rgb(var(--color-on-surface))"
                      [style.background]="seleccionCodigo() === eq.codigo ? 'rgb(var(--color-surface-2))' : 'transparent'">
                <span>{{ eq.nombre }} ({{ eq.codigo }})</span>
                <span class="font-mono">{{ eq.valor }}</span>
              </button>
            }
          }
          @if (seleccionCodigo()) {
            <div class="pt-1 mt-1 border-t text-xs" style="border-color:rgb(var(--color-border))">
              <button (click)="limpiar()" type="button"
                      class="w-full text-left py-1.5 px-2 rounded-lg"
                      style="color:rgb(var(--color-on-surface)/0.5)">
                Volver a {{ cantidad }} {{ unidadOrigen }}
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ConvertirUnidadPopoverComponent {
  @Input({ required: true }) cantidad = 0;
  @Input({ required: true }) unidadOrigen = '';

  abierto = signal(false);
  seleccionCodigo = signal<string | null>(null);

  /** Cantidad + unidad a mostrar en la fila (vista alternativa, sin tocar el dato real). */
  valorMostrado = computed(() => {
    const sel = this.seleccionCodigo();
    if (!sel) return null;
    const origen = this.codigoOrigen();
    if (!origen) return null;
    const valor = this.conversion.convertir(this.cantidad, origen, sel);
    if (valor == null) return null;
    return { valor: this.conversion.redondear(valor), unidad: sel };
  });

  constructor(private conversion: UnidadesConversionService) {}

  codigoOrigen(): string | null {
    // Acepta tanto un código ya canónico ("kg") como texto libre ("Kilogramos").
    return this.conversion.unidad(this.unidadOrigen)
      ? this.unidadOrigen
      : this.conversion.normalizar(this.unidadOrigen);
  }

  equivalentes() {
    const origen = this.codigoOrigen();
    if (!origen) return [];
    const bolivia = new Set(this.conversion.unidadesPorDefectoBolivia());
    return [...this.conversion.equivalentes(this.cantidad, origen)]
      .sort((a, b) => Number(bolivia.has(b.codigo)) - Number(bolivia.has(a.codigo)));
  }

  toggle(): void {
    this.abierto.update(v => !v);
  }

  elegir(codigo: string): void {
    this.seleccionCodigo.set(codigo);
  }

  limpiar(): void {
    this.seleccionCodigo.set(null);
  }

  cerrar(): void {
    this.abierto.set(false);
  }
}
