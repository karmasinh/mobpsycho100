import { DashboardComponent } from './dashboard.component';
import { Merma } from '../../core/services/api.service';

/**
 * Se instancia la clase directamente (sin TestBed) porque lo que se prueba es
 * la lógica de negocio pura: el `computed()` de mermas y las funciones de
 * gating por rol del dashboard BI (cuarto bloque). `ngOnInit` (que dispara las
 * llamadas HTTP) no se invoca.
 */
describe('DashboardComponent — BI por rol', () => {
  const construir = (rol: string) =>
    new DashboardComponent(
      {} as never, {} as never, {} as never, {} as never, {} as never,
      { rol: () => rol, sucursalActiva: () => 1 } as never,
    );

  const merma = (over: Partial<Merma>): Merma => ({
    id: 1, insumoId: 1, insumoNombre: 'Arroz', insumoUnidad: 'kg', fecha: '2026-09-01',
    hora: '10:00', cantidad: 2, causa: 'Vencido', observaciones: '', valorEconomico: 0,
    usuario: null, ...over,
  });

  describe('valorTotalMermas', () => {
    it('suma el valor económico de todas las mermas del mes', () => {
      const component = construir('ALMACENERO');
      component.mermasMes.set([merma({ valorEconomico: 15.5 }), merma({ valorEconomico: 9.25 })]);
      expect(component.valorTotalMermas()).toBeCloseTo(24.75);
    });

    it('es 0 sin mermas registradas', () => {
      const component = construir('ALMACENERO');
      component.mermasMes.set([]);
      expect(component.valorTotalMermas()).toBe(0);
    });
  });

  describe('esAlmacenero / esInventario — gating por rol del dashboard BI', () => {
    it('ALMACENERO: esAlmacenero true, esInventario true (ve mermas, no producción)', () => {
      const component = construir('ALMACENERO');
      expect(component.esAlmacenero()).toBeTrue();
      expect(component.esInventario()).toBeTrue();
    });

    it('COCINERO: ni almacenero ni sección de inventario (ve solo producción)', () => {
      const component = construir('COCINERO');
      expect(component.esAlmacenero()).toBeFalse();
      expect(component.esInventario()).toBeFalse();
    });

    it('JEFE_COCINA y ADMIN ven ambas secciones (producción + mermas)', () => {
      for (const rol of ['JEFE_COCINA', 'ADMIN']) {
        const component = construir(rol);
        expect(component.esAlmacenero()).withContext(rol).toBeFalse();
        expect(component.esInventario()).withContext(rol).toBeTrue();
      }
    });
  });

  describe('getTipoAlertaIcono', () => {
    const component = construir('ADMIN');

    it('alertas de vencimiento usan el ícono de calendario', () => {
      expect(component.getTipoAlertaIcono('VENCIMIENTO_PROXIMO')).toBe('tabler:calendar-check');
    });

    it('alertas de stock usan el ícono de paquete', () => {
      expect(component.getTipoAlertaIcono('STOCK_BAJO')).toBe('tabler:package');
    });

    it('cualquier otro tipo cae al ícono genérico de campana', () => {
      expect(component.getTipoAlertaIcono('SOLICITUD_APROBACION')).toBe('tabler:bell');
    });
  });
});
