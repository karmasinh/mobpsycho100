import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { LoginResponse, ModuloMenuDto } from '../models';

describe('AuthService', () => {
  let service: AuthService;

  const modulo = (over: Partial<ModuloMenuDto>): ModuloMenuDto => ({
    id: 1, codigo: 'MOD_X', nombre: 'X', icono: 'tabler:x', ruta: '/x',
    orden: 0, padreId: null, sistema: 'VENTAS', activo: true, ...over,
  });

  const usuario = (over: Partial<LoginResponse>): LoginResponse => ({
    token: 't', tipo: 'Bearer', usuarioId: 1, username: 'u', rol: 'CAJERO',
    sistema: 'VENTAS', sucursalId: null, sucursalNombre: null, modulos: [], ...over,
  });

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
      ],
    });
    service = TestBed.inject(AuthService);
  });

  afterEach(() => localStorage.clear());

  describe('tieneModulo', () => {
    it('devuelve true si el usuario tiene el módulo asignado', () => {
      service.currentUser.set(usuario({ modulos: [modulo({ codigo: 'MOD_CAJA' })] }));
      expect(service.tieneModulo('MOD_CAJA')).toBeTrue();
    });

    it('devuelve false si el usuario no tiene el módulo', () => {
      service.currentUser.set(usuario({ modulos: [modulo({ codigo: 'MOD_CAJA' })] }));
      expect(service.tieneModulo('MOD_REPORTES')).toBeFalse();
    });

    it('devuelve false sin sesión iniciada', () => {
      service.currentUser.set(null);
      expect(service.tieneModulo('MOD_CAJA')).toBeFalse();
    });
  });

  describe('getMenuTree', () => {
    it('limpia el prefijo /ventas/ de la ruta', () => {
      service.currentUser.set(usuario({ modulos: [modulo({ codigo: 'MOD_CAJA', ruta: '/ventas/caja', orden: 1 })] }));
      expect(service.getMenuTree()[0].ruta).toBe('/caja');
    });

    it('limpia el prefijo /admin/ de la ruta', () => {
      service.currentUser.set(usuario({
        modulos: [modulo({ codigo: 'MOD_EMPLEADOS', sistema: 'ADMIN', ruta: '/admin/empleados', orden: 1 })],
      }));
      expect(service.getMenuTree()[0].ruta).toBe('/empleados');
    });

    it('excluye MOD_VENTAS y MOD_ADMIN (nodos raíz sin pantalla propia)', () => {
      service.currentUser.set(usuario({
        modulos: [
          modulo({ codigo: 'MOD_VENTAS', ruta: '/ventas', orden: 0 }),
          modulo({ codigo: 'MOD_CAJA', ruta: '/ventas/caja', orden: 1 }),
        ],
      }));
      const codigos = service.getMenuTree().map(m => m.codigo);
      expect(codigos).not.toContain('MOD_VENTAS');
      expect(codigos).toContain('MOD_CAJA');
    });

    it('excluye módulos de otro sistema (ej. COCINA)', () => {
      service.currentUser.set(usuario({
        modulos: [
          modulo({ codigo: 'MOD_CAJA', ruta: '/ventas/caja', sistema: 'VENTAS', orden: 1 }),
          modulo({ codigo: 'MOD_RECETAS', ruta: '/cocina/recetas', sistema: 'COCINA', orden: 2 }),
        ],
      }));
      expect(service.getMenuTree().map(m => m.codigo)).toEqual(['MOD_CAJA']);
    });

    it('ordena por el campo orden', () => {
      service.currentUser.set(usuario({
        modulos: [
          modulo({ codigo: 'MOD_REPORTES', ruta: '/ventas/reportes', orden: 21 }),
          modulo({ codigo: 'MOD_CAJA', ruta: '/ventas/caja', orden: 11 }),
        ],
      }));
      expect(service.getMenuTree().map(m => m.codigo)).toEqual(['MOD_CAJA', 'MOD_REPORTES']);
    });
  });

  describe('isLoggedIn / rol / sucursalFija', () => {
    it('isLoggedIn es false sin usuario', () => {
      service.currentUser.set(null);
      expect(service.isLoggedIn()).toBeFalse();
    });

    it('isLoggedIn es true con usuario, y expone rol y sucursal fija', () => {
      service.currentUser.set(usuario({ rol: 'CAJERO', sucursalId: 1 }));
      expect(service.isLoggedIn()).toBeTrue();
      expect(service.rol()).toBe('CAJERO');
      expect(service.sucursalFija()).toBe(1);
    });

    it('sucursalFija es null para un admin multi-sucursal', () => {
      service.currentUser.set(usuario({ rol: 'ADMIN', sucursalId: null }));
      expect(service.sucursalFija()).toBeNull();
    });
  });
});
