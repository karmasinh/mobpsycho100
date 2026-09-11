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
    orden: 0, padreId: null, sistema: 'COCINA', activo: true, ...over,
  });

  const usuario = (over: Partial<LoginResponse>): LoginResponse => ({
    token: 't', tipo: 'Bearer', usuarioId: 1, username: 'u', rol: 'COCINERO',
    sistema: 'COCINA', sucursalId: null, sucursalNombre: null, modulos: [], ...over,
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
      service.currentUser.set(usuario({ modulos: [modulo({ codigo: 'MOD_PRODUCCION' })] }));
      expect(service.tieneModulo('MOD_PRODUCCION')).toBeTrue();
    });

    it('devuelve false si el usuario no tiene el módulo', () => {
      service.currentUser.set(usuario({ modulos: [modulo({ codigo: 'MOD_PRODUCCION' })] }));
      expect(service.tieneModulo('MOD_KARDEX')).toBeFalse();
    });

    it('devuelve false sin sesión iniciada', () => {
      service.currentUser.set(null);
      expect(service.tieneModulo('MOD_PRODUCCION')).toBeFalse();
    });
  });

  describe('getMenuTree', () => {
    it('limpia el prefijo /cocina/ de la ruta', () => {
      service.currentUser.set(usuario({ modulos: [modulo({ codigo: 'MOD_PRODUCCION', ruta: '/cocina/produccion', orden: 1 })] }));
      expect(service.getMenuTree()[0].ruta).toBe('/produccion');
    });

    it('limpia el prefijo /admin/ de la ruta', () => {
      service.currentUser.set(usuario({
        modulos: [modulo({ codigo: 'MOD_USUARIOS', sistema: 'ADMIN', ruta: '/admin/usuarios', orden: 1 })],
      }));
      expect(service.getMenuTree()[0].ruta).toBe('/usuarios');
    });

    it('excluye MOD_COCINA y MOD_ADMIN (nodos raíz sin pantalla propia)', () => {
      service.currentUser.set(usuario({
        modulos: [
          modulo({ codigo: 'MOD_COCINA', ruta: '/cocina', orden: 0 }),
          modulo({ codigo: 'MOD_PRODUCCION', ruta: '/cocina/produccion', orden: 1 }),
        ],
      }));
      const codigos = service.getMenuTree().map(m => m.codigo);
      expect(codigos).not.toContain('MOD_COCINA');
      expect(codigos).toContain('MOD_PRODUCCION');
    });

    it('excluye módulos de otro sistema (ej. VENTAS)', () => {
      service.currentUser.set(usuario({
        modulos: [
          modulo({ codigo: 'MOD_PRODUCCION', ruta: '/cocina/produccion', sistema: 'COCINA', orden: 1 }),
          modulo({ codigo: 'MOD_CAJA', ruta: '/ventas/caja', sistema: 'VENTAS', orden: 2 }),
        ],
      }));
      expect(service.getMenuTree().map(m => m.codigo)).toEqual(['MOD_PRODUCCION']);
    });

    it('ordena por el campo orden', () => {
      service.currentUser.set(usuario({
        modulos: [
          modulo({ codigo: 'MOD_KARDEX', ruta: '/cocina/kardex', orden: 12 }),
          modulo({ codigo: 'MOD_PRODUCCION', ruta: '/cocina/produccion', orden: 3 }),
        ],
      }));
      expect(service.getMenuTree().map(m => m.codigo)).toEqual(['MOD_PRODUCCION', 'MOD_KARDEX']);
    });
  });

  describe('getSubModulos', () => {
    it('filtra por padreId y ordena por orden', () => {
      service.currentUser.set(usuario({
        modulos: [
          modulo({ codigo: 'MOD_B', padreId: 5, orden: 2 }),
          modulo({ codigo: 'MOD_A', padreId: 5, orden: 1 }),
          modulo({ codigo: 'MOD_OTRO_PADRE', padreId: 9, orden: 1 }),
        ],
      }));
      expect(service.getSubModulos(5).map(m => m.codigo)).toEqual(['MOD_A', 'MOD_B']);
    });
  });

  describe('isLoggedIn / rol / sucursalFija', () => {
    it('isLoggedIn es false sin usuario', () => {
      service.currentUser.set(null);
      expect(service.isLoggedIn()).toBeFalse();
    });

    it('isLoggedIn es true con usuario, y expone rol y sucursal fija', () => {
      service.currentUser.set(usuario({ rol: 'ALMACENERO', sucursalId: 2 }));
      expect(service.isLoggedIn()).toBeTrue();
      expect(service.rol()).toBe('ALMACENERO');
      expect(service.sucursalFija()).toBe(2);
    });
  });
});
