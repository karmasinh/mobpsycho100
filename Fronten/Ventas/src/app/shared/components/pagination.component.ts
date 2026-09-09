import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (total() > 0) {
      <div class="flex items-center justify-between gap-3 px-1 py-2 flex-wrap">

        <p class="text-xs font-medium" style="color:rgb(var(--color-on-surface)/0.5)">
          Mostrando
          <span class="font-semibold" style="color:rgb(var(--color-on-surface)/0.8)">
            {{ desde() }}–{{ hasta() }}
          </span>
          de
          <span class="font-semibold" style="color:rgb(var(--color-on-surface)/0.8)">
            {{ total() }}
          </span>
          registros
        </p>

        @if (totalPaginas() > 1) {
          <div class="flex items-center gap-1">

            <button (click)="ir(pagina() - 1)"
                    [disabled]="pagina() === 1"
                    class="btn-icon text-xs disabled:opacity-30"
                    aria-label="Página anterior">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>

            @for (p of paginas(); track p) {
              @if (p === -1) {
                <span class="px-1 text-xs select-none"
                      style="color:rgb(var(--color-on-surface)/0.3)">…</span>
              } @else {
                <button (click)="ir(p)"
                        class="w-8 h-8 rounded-lg text-xs font-semibold transition-all"
                        [attr.aria-current]="p === pagina() ? 'page' : null"
                        [style.background]="p === pagina()
                          ? 'rgb(var(--color-primary))'
                          : 'rgb(var(--color-surface-2))'"
                        [style.color]="p === pagina()
                          ? 'rgb(var(--color-on-primary))'
                          : 'rgb(var(--color-on-surface)/0.6)'">
                  {{ p }}
                </button>
              }
            }

            <button (click)="ir(pagina() + 1)"
                    [disabled]="pagina() === totalPaginas()"
                    class="btn-icon text-xs disabled:opacity-30"
                    aria-label="Página siguiente">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
              </svg>
            </button>

          </div>
        }
      </div>
    }
  `,
})
export class PaginationComponent {
  total      = input.required<number>();
  pageSize   = input<number>(10);
  pagina     = input.required<number>();
  pageChange = output<number>();

  totalPaginas = computed(() => Math.ceil(this.total() / this.pageSize()) || 1);
  desde = computed(() => this.total() === 0 ? 0 : (this.pagina() - 1) * this.pageSize() + 1);
  hasta = computed(() => Math.min(this.pagina() * this.pageSize(), this.total()));

  paginas = computed((): number[] => {
    const tp = this.totalPaginas();
    const ac = this.pagina();
    if (tp <= 7) return Array.from({ length: tp }, (_, i) => i + 1);
    const ps: number[] = [1];
    if (ac > 3) ps.push(-1);
    for (let p = Math.max(2, ac - 1); p <= Math.min(tp - 1, ac + 1); p++) ps.push(p);
    if (ac < tp - 2) ps.push(-1);
    ps.push(tp);
    return ps;
  });

  ir(p: number): void {
    if (p >= 1 && p <= this.totalPaginas() && p !== this.pagina()) {
      this.pageChange.emit(p);
    }
  }
}
