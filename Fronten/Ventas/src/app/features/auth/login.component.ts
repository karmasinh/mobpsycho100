import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="ent-login">

      <!-- ── PANEL IZQUIERDO — identidad de marca ─────────────── -->
      <div class="ent-panel-left">
        <div class="ent-panel-left-texture"></div>
        <div class="ent-panel-left-glow"></div>

        <div class="ent-panel-left-content">
          <!-- Branding -->
          <div>
            <p class="ent-bienvenido">BIENVENIDO A</p>
            <h1 class="ent-nombre-restaurante">LA<br>ENTRERRIANA</h1>
            <div class="ent-ornament-line"></div>
            <p class="ent-tagline">Comida que une, sabores que quedan.</p>
          </div>

          <!-- Features -->
          <div class="ent-features-grid">
            @for (f of features; track f.label) {
              <div class="ent-feature-item">
                <span class="ent-feature-icon">{{ f.icon }}</span>
                <p class="ent-feature-label">{{ f.label }}</p>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- ── PANEL DERECHO — formulario ───────────────────────── -->
      <div class="ent-panel-right">

        <!-- Logo -->
        <div class="ent-logo-area">
          <svg class="ent-logo-svg" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" fill="none">
            <circle cx="40" cy="40" r="36" stroke="currentColor" stroke-width="2"/>
            <circle cx="40" cy="40" r="28" stroke="currentColor" stroke-width="0.75" opacity="0.4"/>
            <ellipse cx="33" cy="11" rx="2.5" ry="4.5" fill="currentColor" opacity="0.7"
                     transform="rotate(-18 33 11)"/>
            <ellipse cx="40" cy="9"  rx="2.5" ry="5"   fill="currentColor" opacity="0.85"/>
            <ellipse cx="47" cy="11" rx="2.5" ry="4.5" fill="currentColor" opacity="0.7"
                     transform="rotate(18 47 11)"/>
            <line x1="40" y1="14" x2="40" y2="22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <text x="40" y="58" text-anchor="middle"
                  font-family="Georgia,'Times New Roman',serif"
                  font-size="32" font-weight="700" fill="currentColor">E</text>
          </svg>
          <p class="ent-logo-nombre">LA ENTRERRIANA</p>
          <p class="ent-logo-sub">— RESTAURANTE —</p>
        </div>

        <!-- Formulario -->
        <div class="ent-form-container">
          <h2 class="ent-form-title">Iniciar sesión</h2>
          <div class="ent-form-ornament"></div>
          <p class="ent-form-subtitle">
            Bienvenido de vuelta,<br>
            ingresa tus credenciales para continuar.
          </p>

          <!-- Alerta bloqueado -->
          @if (bloqueado()) {
            <div class="ent-alert-blocked">
              <span>🔒</span>
              <div>
                <p class="ent-alert-title">Cuenta bloqueada</p>
                <p class="ent-alert-sub">Contacta al administrador para desbloquear.</p>
              </div>
            </div>
          }

          <!-- Form -->
          <form (ngSubmit)="onLogin()" style="margin-bottom: 0;">

            <div class="ent-field">
              <div class="ent-input-wrapper">
                <svg class="ent-input-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
                <input [(ngModel)]="form.username" name="username"
                       type="text" class="ent-input" placeholder="Usuario"
                       autocomplete="username" autocapitalize="off" autocorrect="off" required>
              </div>
            </div>

            <div class="ent-field">
              <div class="ent-input-wrapper">
                <svg class="ent-input-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round"
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
                <input [(ngModel)]="form.password" name="password"
                       [type]="showPwd() ? 'text' : 'password'"
                       class="ent-input" placeholder="Contraseña"
                       autocomplete="current-password" required>
                <button type="button" class="ent-eye-btn"
                        (click)="showPwd.set(!showPwd())"
                        [attr.aria-label]="showPwd() ? 'Ocultar contraseña' : 'Mostrar contraseña'">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    @if (showPwd()) {
                      <path stroke-linecap="round" stroke-linejoin="round"
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                    } @else {
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path stroke-linecap="round" stroke-linejoin="round"
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    }
                  </svg>
                </button>
              </div>
            </div>

            @if (error()) {
              <div class="ent-error">
                <span>⚠️</span> {{ error() }}
              </div>
            }

            <button type="submit" [disabled]="loading()" class="ent-submit-btn">
              @if (loading()) {
                <span class="ent-spinner"></span>
                Ingresando...
              } @else {
                <svg style="width:1.1rem;height:1.1rem;margin-right:0.5rem;flex-shrink:0"
                     fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round"
                        d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
                </svg>
                Iniciar sesión
              }
            </button>
          </form>

          <!-- Divider -->
          <div class="ent-divider-decor">
            <div class="ent-divider-line"></div>
            <span class="ent-divider-icon">✕</span>
            <div class="ent-divider-line"></div>
          </div>

          <!-- Frase -->
          <p class="ent-quote">Sabor casero, tradición entrerriana.</p>

          <!-- Selector de tema -->
          <div class="ent-themes-section">
            <p class="ent-themes-label">Apariencia</p>
            <div class="ent-themes-grid">
              @for (theme of themeService.THEMES; track theme.id) {
                <button (click)="themeService.setTheme(theme.id)"
                        [title]="theme.descripcion"
                        class="ent-theme-btn"
                        [class.ent-theme-active]="themeService.currentTheme() === theme.id">
                  <span>{{ theme.emoji }}</span>
                  <span>{{ theme.nombre }}</span>
                </button>
              }
            </div>
          </div>

          <!-- Switch sistema -->
          <a [href]="cocinaUrl" class="ent-switch-link">
            <svg style="width:0.9rem;height:0.9rem;flex-shrink:0"
                 fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4"/>
            </svg>
            Ir al Sistema de Cocina
          </a>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  form      = { username: '', password: '' };
  loading   = signal(false);
  error     = signal('');
  showPwd   = signal(false);
  bloqueado = signal(false);
  cocinaUrl = (environment as any).cocinaUrl ?? 'http://localhost:4201';

  features = [
    { icon: '🔥', label: 'PARRILLA DE CALIDAD'  },
    { icon: '🌿', label: 'INGREDIENTES FRESCOS'  },
    { icon: '❤️', label: 'HECHO CON PASIÓN'      },
  ];

  constructor(
    private auth: AuthService,
    public themeService: ThemeService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    this.bloqueado.set(route.snapshot.queryParamMap.get('bloqueado') === 'true');
  }

  onLogin(): void {
    if (!this.form.username || !this.form.password) {
      this.error.set('Complete todos los campos.');
      return;
    }
    this.loading.set(true);
    this.error.set('');

    this.auth.login(this.form).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: err => {
        this.loading.set(false);
        this.error.set(err?.error?.mensaje ?? err?.message ?? 'Error al iniciar sesión');
        if (err?.status === 423) this.bloqueado.set(true);
      },
    });
  }
}
