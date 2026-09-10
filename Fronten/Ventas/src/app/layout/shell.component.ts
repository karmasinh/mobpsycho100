import { Component, signal, computed, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, RouterOutlet, ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { LucideDynamicIcon } from '@lucide/angular';
import { AuthService } from '../core/services/auth.service';
import { ThemeService } from '../core/services/theme.service';
import { AlertaService, SucursalService, EmpresaService } from '../core/services/api.service';
import { ToastContainerComponent } from '../shared/components/toast-container.component';
import { EmpresaOnboardingComponent } from '../shared/components/empresa-onboarding.component';
import { Sucursal } from '../core/models';
import { ICONOS_DISPONIBLES } from '../core/icons/app-icons.provider';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, RouterModule, ToastContainerComponent, EmpresaOnboardingComponent, LucideDynamicIcon],
  template: `
    @if (mostrarOnboarding()) {
      <app-empresa-onboarding (completado)="mostrarOnboarding.set(false)" />
    }
    <div class="app-shell">

      <!-- OVERLAY -->
      <div class="sidebar-overlay"
           [class.visible]="sidebarOpen()"
           (click)="closeSidebar()">
      </div>

      <!-- SIDEBAR -->
      <aside class="app-sidebar ent-sidebar" [class.open]="sidebarOpen()">

        <!-- Logo + botón cerrar -->
        <div class="relative flex flex-col items-center px-4 pt-6 pb-4 flex-shrink-0"
             style="border-bottom:1px solid rgb(var(--sb-border))">
          <!-- Botón cerrar (móvil) — esquina superior derecha -->
          <button class="lg:hidden absolute top-3 right-3 p-1.5 rounded-lg"
                  (click)="closeSidebar()"
                  aria-label="Cerrar menú"
                  style="color:rgb(var(--sb-text)/0.4)">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>

          <!-- Logo SVG inline — usa currentColor para respetar el tema -->
          <div style="color:rgb(var(--sb-accent))">
            <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" fill="none"
                 style="width:72px;height:72px">
              <circle cx="40" cy="40" r="36" stroke="currentColor" stroke-width="2"/>
              <circle cx="40" cy="40" r="28" stroke="currentColor" stroke-width="0.75" opacity="0.4"/>
              <ellipse cx="33" cy="11" rx="2.2" ry="4" fill="currentColor" opacity="0.7"
                       transform="rotate(-18 33 11)"/>
              <ellipse cx="40" cy="9"  rx="2.2" ry="4.5" fill="currentColor" opacity="0.85"/>
              <ellipse cx="47" cy="11" rx="2.2" ry="4" fill="currentColor" opacity="0.7"
                       transform="rotate(18 47 11)"/>
              <line x1="40" y1="14" x2="40" y2="21" stroke="currentColor" stroke-width="1.2"
                    stroke-linecap="round"/>
              <text x="40" y="57" text-anchor="middle"
                    font-family="Georgia,'Times New Roman',serif"
                    font-size="30" font-weight="700" fill="currentColor">E</text>
            </svg>
          </div>

          <!-- Texto debajo del logo -->
          <div class="text-center mt-2">
            <p class="font-bold tracking-widest leading-tight"
               style="color:rgb(var(--sb-text));font-size:0.85rem;letter-spacing:0.12em">
              LA ENTRERRIANA
            </p>
            <p style="font-size:8px;color:rgb(var(--sb-accent)/0.7);letter-spacing:0.25em;margin-top:2px">
              — VENTAS —
            </p>
          </div>
        </div>

        <!-- Nav -->
        <nav class="flex-1 p-3 space-y-0.5 overflow-y-auto" style="padding-top:0.5rem">
          <p style="font-size:9px;font-weight:700;letter-spacing:0.2em;
                    padding:0.5rem 0.75rem;color:rgb(var(--sb-text)/0.28);text-transform:uppercase">
            Menú
          </p>
          @for (item of menuItems(); track item.id) {
            <a [routerLink]="item.ruta"
               routerLinkActive="active"
               class="nav-item"
               (click)="closeSidebar()">
              <svg [lucideIcon]="iconoSeguro(item.icono)" class="w-[18px] h-[18px] flex-shrink-0" [strokeWidth]="1.75"></svg>
              <span class="flex-1 truncate">{{ item.nombre }}</span>
            </a>
          }
        </nav>

        <!-- Selector de tema — botón toggle con dropdown -->
        <div class="p-3 flex-shrink-0"
             style="border-top:1px solid rgb(var(--sb-border))">
          <p style="font-size:9px;font-weight:700;letter-spacing:0.15em;margin-bottom:0.5rem;
                    color:rgb(var(--sb-text)/0.28);text-transform:uppercase">
            Apariencia
          </p>

          <button class="ent-theme-toggle"
                  [class.open]="themeSelectorOpen()"
                  (click)="toggleThemeSelector()">
            <span>{{ currentThemeInfo().emoji }} {{ currentThemeInfo().nombre }}</span>
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
                 [style.transform]="themeSelectorOpen() ? 'rotate(180deg)' : 'rotate(0deg)'"
                 style="transition:transform 0.2s">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>

          @if (themeSelectorOpen()) {
            <div class="mt-1 space-y-0.5">
              @for (theme of themeService.THEMES; track theme.id) {
                <button class="ent-theme-option"
                        [class.active]="themeService.currentTheme() === theme.id"
                        (click)="themeService.setTheme(theme.id); themeSelectorOpen.set(false)">
                  <span>{{ theme.emoji }}</span>
                  <span class="flex-1">{{ theme.nombre }}</span>
                  @if (themeService.currentTheme() === theme.id) {
                    <span class="ent-check">✓</span>
                  }
                </button>
              }
            </div>
          }
        </div>

        <!-- Usuario -->
        <div class="p-3 flex-shrink-0"
             style="border-top:1px solid rgb(var(--sb-border))">
          <div class="flex items-center gap-2 p-2 rounded-xl"
               style="background:rgb(var(--sb-bg-hover))">
            <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                 style="background:rgb(var(--sb-accent)/0.2);color:rgb(var(--sb-accent))">
              {{ userInitial() }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-semibold truncate" style="color:rgb(var(--sb-text))">
                {{ auth.currentUser()?.username }}
              </p>
              <p style="font-size:10px;color:rgb(var(--sb-text)/0.38)" class="truncate">
                {{ auth.rol() }}
              </p>
            </div>
            <button (click)="auth.logout()"
                    class="p-1.5 rounded-lg flex-shrink-0"
                    title="Cerrar sesión"
                    style="color:rgba(239,68,68,0.75)">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <!-- MAIN -->
      <div class="app-main">

        <!-- Topbar -->
        <header class="app-topbar">
          <div class="flex items-center gap-3">
            <button class="btn-menu-toggle"
                    (click)="toggleSidebar()"
                    aria-label="Abrir menú">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>

            <!-- Logo mobile -->
            <div class="flex items-center gap-2 lg:hidden">
              <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" fill="none"
                   style="width:28px;height:28px">
                <circle cx="40" cy="40" r="36" stroke="rgb(var(--color-primary))" stroke-width="2.5"/>
                <text x="40" y="56" text-anchor="middle"
                      font-family="Georgia,serif" font-size="32" font-weight="700"
                      fill="rgb(var(--color-primary))">E</text>
              </svg>
              <span class="font-bold text-sm"
                    style="color:rgb(var(--color-on-surface));letter-spacing:0.05em">
                La Entrerriana
              </span>
            </div>

            <div class="hidden md:flex flex-col gap-0.5">
              <p class="font-bold text-sm" style="color:rgb(var(--color-on-surface))">
                {{ saludo() }}, {{ primerNombre() }}
              </p>
              <!-- Breadcrumb -->
              @if (breadcrumbTitulo()) {
                <nav aria-label="Ruta de navegación"
                     class="flex items-center gap-1 text-xs font-semibold">
                  <span style="color:rgb(var(--color-on-surface)/0.35)">Inicio</span>
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"
                       style="color:rgb(var(--color-on-surface)/0.25)">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 18l6-6-6-6"/>
                  </svg>
                  <span style="color:rgb(var(--color-primary))">{{ breadcrumbTitulo() }}</span>
                </nav>
              } @else {
                <p class="text-xs" style="color:rgb(var(--color-on-surface)/0.4)">{{ fechaHoy() }}</p>
              }
            </div>
          </div>

          <div class="flex items-center gap-2">
            @if (auth.sucursalFija() != null) {
              <span class="hidden md:inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl"
                    style="background:rgb(var(--color-surface-2));color:rgb(var(--color-on-surface)/0.7)">
                🏪 {{ auth.currentUser()?.sucursalNombre }}
              </span>
            } @else {
              <select [ngModel]="auth.sucursalActiva()" (ngModelChange)="onCambioSucursal($event)"
                      class="input text-xs py-1.5 hidden md:block" style="width:auto">
                <option [ngValue]="null" disabled>🏪 Sucursal...</option>
                @for (s of sucursales(); track s.id) {
                  <option [ngValue]="s.id">{{ s.nombre }}</option>
                }
              </select>
            }

            @if (auth.tieneModulo('MOD_CAJA')) {
              <a [routerLink]="['/caja']" class="btn-primary text-xs py-2 gap-1.5">
                <span>💳</span>
                <span class="hidden sm:inline">Nueva venta</span>
              </a>
              <a [routerLink]="['/cierre-caja']" class="btn-secondary text-xs py-2 gap-1.5">
                <span>🔒</span>
                <span class="hidden sm:inline">Cierre de caja</span>
              </a>
            }

            <button [routerLink]="['/alertas']"
                    class="relative p-2 rounded-xl transition-all"
                    style="color:rgb(var(--color-on-surface)/0.5);background:rgb(var(--color-surface-2))">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round"
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
              </svg>
              @if (alertCount() > 0) {
                <span class="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold
                             flex items-center justify-center"
                      style="background:rgb(var(--color-danger));color:white">
                  {{ alertCount() > 9 ? '9+' : alertCount() }}
                </span>
              }
            </button>

            <div class="hidden md:flex items-center gap-2"
                 style="color:rgb(var(--color-on-surface)/0.6)">
              <span class="text-sm">Hola, {{ primerNombre() }}</span>
              <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                   style="background:rgb(var(--color-primary)/0.15);color:rgb(var(--color-primary))">
                {{ userInitial() }}
              </div>
            </div>

            <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm md:hidden"
                 style="background:rgb(var(--color-primary)/0.15);color:rgb(var(--color-primary))">
              {{ userInitial() }}
            </div>
          </div>
        </header>

        <!-- Página -->
        <main class="main-content">
          <router-outlet />
        </main>
      </div>
    </div>

    <!-- TOAST GLOBAL -->
    <app-toast-container />

    <!-- BOTTOM NAV -->
    <nav class="bottom-nav">
      @for (item of bottomNavItems(); track item.id) {
        <a [routerLink]="item.ruta" routerLinkActive="active" class="bottom-nav-item">
          <svg [lucideIcon]="iconoSeguro(item.icono)" class="bottom-nav-icon" [strokeWidth]="1.75"></svg>
          <span>{{ item.nombre | slice:0:8 }}</span>
        </a>
      }
    </nav>
  `,
})
export class ShellComponent implements OnInit {
  alertCount        = signal(0);
  sidebarOpen       = signal(false);
  themeSelectorOpen = signal(false);
  sucursales        = signal<Sucursal[]>([]);
  mostrarOnboarding = signal(false);

  breadcrumbTitulo = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      startWith(null),
      map(() => {
        let route = this.activatedRoute.firstChild;
        while (route?.firstChild) route = route.firstChild;
        return (route?.snapshot?.data?.['title'] as string) ?? '';
      }),
    ),
    { initialValue: '' },
  );

  menuItems      = computed(() => this.auth.getMenuTree());
  bottomNavItems = computed(() => this.menuItems().slice(0, 5));

  userInitial = computed(() =>
    (this.auth.currentUser()?.username ?? '?').charAt(0).toUpperCase()
  );

  primerNombre = computed(() => {
    const u = this.auth.currentUser()?.username ?? '';
    return u.split('.')[0] ?? u;
  });

  currentThemeInfo = computed(() => {
    const id = this.themeService.currentTheme();
    return this.themeService.THEMES.find(t => t.id === id) ?? this.themeService.THEMES[0];
  });

  constructor(
    public auth: AuthService,
    public themeService: ThemeService,
    private alertaService: AlertaService,
    private sucursalService: SucursalService,
    private empresaService: EmpresaService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.cargarAlertas();
    setInterval(() => this.cargarAlertas(), 60_000);

    if (this.auth.rol() === 'ADMIN') {
      this.empresaService.obtener().subscribe({
        next: () => {},
        error: err => { if (err?.status === 404) this.mostrarOnboarding.set(true); },
      });
    }

    if (this.auth.sucursalFija() == null) {
      this.sucursalService.listar().subscribe({
        next: lista => {
          this.sucursales.set(lista);
          // Si no hay una sucursal elegida todavía, se preselecciona la primera
          // (caso típico: un solo local) — el selector queda visible para cambiarla.
          if (this.auth.sucursalActiva() == null && lista.length > 0) {
            this.auth.elegirSucursal(lista[0].id);
          }
        },
        error: () => {},
      });
    }
  }

  onCambioSucursal(sucursalId: number): void {
    this.auth.elegirSucursal(sucursalId);
  }

  toggleSidebar():      void { this.sidebarOpen.update(v => !v); }
  closeSidebar():       void { this.sidebarOpen.set(false); }
  toggleThemeSelector(): void { this.themeSelectorOpen.update(v => !v); }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeSidebar();
    this.themeSelectorOpen.set(false);
  }

  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth >= 1024) this.sidebarOpen.set(false);
  }

  saludo(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }

  fechaHoy(): string {
    return new Date().toLocaleDateString('es-BO', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
  }

  /**
   * Un módulo creado a mano desde "Módulos y Menús" puede traer un `icono` que no está
   * registrado en `provideAppIcons()` — `LucideDynamicIcon` lanza una excepción en ese caso,
   * así que se cae a un ícono neutro ("tag") en vez de romper el menú.
   */
  iconoSeguro(icono: string): string {
    return ICONOS_DISPONIBLES.has(icono) ? icono : 'tag';
  }

  private cargarAlertas(): void {
    this.alertaService.contarNoLeidas().subscribe({
      next: r => this.alertCount.set(r.total),
      error: () => {},
    });
  }
}
