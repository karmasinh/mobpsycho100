import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError, throwError } from 'rxjs';
import { Preferences } from '@capacitor/preferences';
import { LoginRequest, LoginResponse, ModuloMenuDto } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly TOKEN_KEY = 'restaurante_token';
  private readonly USER_KEY  = 'restaurante_user';
  private readonly SUCURSAL_KEY = 'restaurante_cocina_sucursal_activa';

  /** Cache en memoria del token para lectura síncrona (ej. interceptor HTTP). */
  private tokenCache: string | null = localStorage.getItem(this.TOKEN_KEY);

  // Signals reactivos
  currentUser  = signal<LoginResponse | null>(this.cargarUsuario());
  isLoggedIn   = computed(() => !!this.currentUser());
  modulos      = computed(() => this.currentUser()?.modulos ?? []);
  rol          = computed(() => this.currentUser()?.rol ?? '');
  sistema      = computed(() => this.currentUser()?.sistema ?? 'COCINA');

  /** Sucursal fija del usuario (empleado con sucursal asignada) — null si es admin/multi-sucursal */
  sucursalFija = computed(() => this.currentUser()?.sucursalId ?? null);
  /** Sucursal con la que se opera: siempre la fija si existe; si no, la elegida manualmente */
  sucursalActiva = signal<number | null>(this.resolverSucursalActivaInicial());

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // localStorage es la fuente rápida y síncrona al arrancar (funciona igual en web).
    // Preferences es la fuente robusta en nativo (Capacitor) — si difiere (ej. localStorage
    // fue purgado por el sistema operativo en iOS), se rehidrata la sesión de forma async.
    this.hidratarDesdePreferences();
  }

  login(request: LoginRequest) {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, request)
      .pipe(
        tap(response => {
          // Verificar que el usuario pertenece al sistema COCINA o es ADMIN
          if (response.sistema !== 'COCINA' && response.sistema !== 'ADMIN') {
            throw new Error(
              `Acceso denegado. Este sistema es para el módulo de Cocina. Su sistema asignado: ${response.sistema}`
            );
          }
          this.guardarSesion(response);
          this.sucursalActiva.set(this.resolverSucursalActivaInicial());
        }),
        catchError(err => {
          this.limpiarSesion();
          return throwError(() => err);
        })
      );
  }

  logout(): void {
    const token = this.getToken();
    if (token) {
      this.http.post(`${environment.apiUrl}/auth/logout`, {}).subscribe({
        error: () => {} // silencioso
      });
    }
    this.limpiarSesion();
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this.tokenCache;
  }

  /** Solo aplica cuando el usuario no tiene sucursal fija (admin/multi-sucursal) */
  elegirSucursal(sucursalId: number): void {
    if (this.sucursalFija() != null) return;
    localStorage.setItem(this.SUCURSAL_KEY, String(sucursalId));
    Preferences.set({ key: this.SUCURSAL_KEY, value: String(sucursalId) });
    this.sucursalActiva.set(sucursalId);
  }

  private resolverSucursalActivaInicial(): number | null {
    const fija = this.currentUser()?.sucursalId ?? null;
    if (fija != null) return fija;
    const guardada = localStorage.getItem(this.SUCURSAL_KEY);
    return guardada ? Number(guardada) : null;
  }

  tieneModulo(codigo: string): boolean {
    return this.modulos().some(m => m.codigo === codigo);
  }

  getMenuTree(): ModuloMenuDto[] {
    const todos = this.modulos();
    return todos
      .filter(m => (m.sistema === 'COCINA' || m.sistema === 'ADMIN') && m.ruta && m.codigo !== 'MOD_COCINA' && m.codigo !== 'MOD_ADMIN')
      .map(m => {
        let cleanRuta = m.ruta;
        if (cleanRuta.startsWith('/cocina/')) {
          cleanRuta = '/' + cleanRuta.substring(8);
        } else if (cleanRuta.startsWith('/admin/')) {
          cleanRuta = '/' + cleanRuta.substring(7);
        } else if (cleanRuta === '/cocina' || cleanRuta === '/admin') {
          cleanRuta = '/dashboard';
        }
        return { ...m, ruta: cleanRuta };
      })
      .sort((a, b) => a.orden - b.orden);
  }

  getSubModulos(padreId: number): ModuloMenuDto[] {
    return this.modulos()
      .filter(m => m.padreId === padreId)
      .sort((a, b) => a.orden - b.orden);
  }

  private guardarSesion(response: LoginResponse): void {
    this.tokenCache = response.token;
    localStorage.setItem(this.TOKEN_KEY, response.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(response));
    Preferences.set({ key: this.TOKEN_KEY, value: response.token });
    Preferences.set({ key: this.USER_KEY, value: JSON.stringify(response) });
    this.currentUser.set(response);
  }

  private limpiarSesion(): void {
    this.tokenCache = null;
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    Preferences.remove({ key: this.TOKEN_KEY });
    Preferences.remove({ key: this.USER_KEY });
    this.currentUser.set(null);
  }

  private cargarUsuario(): LoginResponse | null {
    try {
      const raw = localStorage.getItem(this.USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  /** Rehidrata sesión/token/sucursal desde Preferences si difieren de lo que ya cargó localStorage. */
  private async hidratarDesdePreferences(): Promise<void> {
    const [{ value: token }, { value: userRaw }, { value: sucursalRaw }] = await Promise.all([
      Preferences.get({ key: this.TOKEN_KEY }),
      Preferences.get({ key: this.USER_KEY }),
      Preferences.get({ key: this.SUCURSAL_KEY }),
    ]);

    if (token && !this.tokenCache) {
      this.tokenCache = token;
      localStorage.setItem(this.TOKEN_KEY, token);
    }
    if (userRaw && !this.currentUser()) {
      try {
        const user: LoginResponse = JSON.parse(userRaw);
        localStorage.setItem(this.USER_KEY, userRaw);
        this.currentUser.set(user);
        this.sucursalActiva.set(this.resolverSucursalActivaInicial());
      } catch { /* dato corrupto, se ignora */ }
    }
    if (sucursalRaw && this.sucursalActiva() == null && this.sucursalFija() == null) {
      localStorage.setItem(this.SUCURSAL_KEY, sucursalRaw);
      this.sucursalActiva.set(Number(sucursalRaw));
    }
  }
}
