import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError, throwError } from 'rxjs';
import { LoginRequest, LoginResponse, ModuloMenuDto } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'restaurante_ventas_token';
  private readonly USER_KEY  = 'restaurante_ventas_user';
  private readonly SUCURSAL_KEY = 'restaurante_ventas_sucursal_activa';

  currentUser = signal<LoginResponse | null>(this.cargarUsuario());
  isLoggedIn  = computed(() => !!this.currentUser());
  modulos     = computed(() => this.currentUser()?.modulos ?? []);
  rol         = computed(() => this.currentUser()?.rol ?? '');
  sistema     = computed(() => this.currentUser()?.sistema ?? 'VENTAS');

  /** Sucursal fija del usuario (empleado con sucursal asignada) — null si es admin/multi-sucursal */
  sucursalFija = computed(() => this.currentUser()?.sucursalId ?? null);
  /** Sucursal con la que se opera: siempre la fija si existe; si no, la elegida manualmente */
  sucursalActiva = signal<number | null>(this.resolverSucursalActivaInicial());

  constructor(private http: HttpClient, private router: Router) {}

  login(request: LoginRequest) {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, request)
      .pipe(
        tap(response => {
          if (response.sistema !== 'VENTAS' && response.sistema !== 'ADMIN') {
            throw new Error(
              `Acceso denegado. Este sistema es para el módulo de Ventas. Su sistema: ${response.sistema}`
            );
          }
          localStorage.setItem(this.TOKEN_KEY, response.token);
          localStorage.setItem(this.USER_KEY, JSON.stringify(response));
          this.currentUser.set(response);
          this.sucursalActiva.set(this.resolverSucursalActivaInicial());
        }),
        catchError(err => {
          this.limpiarSesion();
          return throwError(() => err);
        })
      );
  }

  logout(): void {
    this.http.post(`${environment.apiUrl}/auth/logout`, {}).subscribe({ error: () => {} });
    this.limpiarSesion();
    this.router.navigate(['/login']);
  }

  getToken(): string | null { return localStorage.getItem(this.TOKEN_KEY); }

  /** Solo aplica cuando el usuario no tiene sucursal fija (admin/multi-sucursal) */
  elegirSucursal(sucursalId: number): void {
    if (this.sucursalFija() != null) return;
    localStorage.setItem(this.SUCURSAL_KEY, String(sucursalId));
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
      .filter(m => (m.sistema === 'VENTAS' || m.sistema === 'ADMIN') && m.ruta && m.codigo !== 'MOD_VENTAS' && m.codigo !== 'MOD_ADMIN')
      .map(m => {
        let cleanRuta = m.ruta;
        if (cleanRuta.startsWith('/ventas/')) {
          cleanRuta = '/' + cleanRuta.substring(8);
        } else if (cleanRuta.startsWith('/admin/')) {
          cleanRuta = '/' + cleanRuta.substring(7);
        } else if (cleanRuta === '/ventas' || cleanRuta === '/admin') {
          cleanRuta = '/dashboard';
        }
        return { ...m, ruta: cleanRuta };
      })
      .sort((a, b) => a.orden - b.orden);
  }

  private limpiarSesion(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUser.set(null);
  }

  private cargarUsuario(): LoginResponse | null {
    try { return JSON.parse(localStorage.getItem(this.USER_KEY) ?? 'null'); }
    catch { return null; }
  }
}
