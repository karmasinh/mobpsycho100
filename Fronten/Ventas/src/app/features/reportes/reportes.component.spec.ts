import { ReportesComponent } from './reportes.component';
import { Venta, CobroMensual, RentabilidadPlato, VentaPorSucursal } from '../../core/models';

/**
 * Se instancia la clase directamente (sin TestBed) porque lo que se prueba es
 * la matemática de negocio de los `computed()` de agregación — no el template
 * ni el ciclo de vida de Angular. `ngOnInit` (que dispara las llamadas HTTP) no
 * se invoca; las dependencias inyectadas no se usan por los computed bajo prueba.
 */
describe('ReportesComponent — agregaciones de negocio', () => {
  let component: ReportesComponent;

  const venta = (over: Partial<Venta>): Venta => ({
    id: 1, pedido: {} as never, totalCobrado: 0, montoRecibido: 0, vuelto: 0,
    formaPago: 'EFECTIVO', anulada: false, creadoEn: '2026-09-01T10:00:00', ...over,
  });

  const cobro = (over: Partial<CobroMensual>): CobroMensual => ({
    id: 1, pensionadoId: 1, pensionadoNombre: 'Ana', pensionadoApellido: 'Gómez',
    mes: 9, anio: 2026, montoBase: 100, saldoAnterior: 0, totalCobrado: 100,
    montoPagado: 0, saldoRestante: 100, diasAsistidos: 20, pagado: false,
    fechaPago: null, formaPago: null, creadoEn: '2026-09-01T10:00:00', ...over,
  });

  beforeEach(() => {
    component = new ReportesComponent({} as never, {} as never, {} as never, {} as never, {} as never);
  });

  describe('Calendario del mes', () => {
    it('totalMes suma totalCobrado de todas las ventas del mes', () => {
      component.ventasMes.set([venta({ totalCobrado: 50 }), venta({ totalCobrado: 30 })]);
      expect(component.totalMes()).toBe(80);
      expect(component.cantidadMes()).toBe(2);
    });

    it('promedioDia divide el total entre los días distintos con venta, no entre la cantidad de ventas', () => {
      component.ventasMes.set([
        venta({ totalCobrado: 30, creadoEn: '2026-09-01T09:00:00' }),
        venta({ totalCobrado: 30, creadoEn: '2026-09-01T18:00:00' }), // mismo día
        venta({ totalCobrado: 40, creadoEn: '2026-09-02T09:00:00' }),
      ]);
      // total 100 / 2 días distintos (1 y 2), no /3 ventas
      expect(component.promedioDia()).toBe(50);
    });

    it('promedioDia es 0 sin ventas (no divide por cero)', () => {
      component.ventasMes.set([]);
      expect(component.promedioDia()).toBe(0);
    });
  });

  describe('Ventas por rango', () => {
    it('ventasDiarias agrupa por fecha (yyyy-MM-dd) y ordena cronológicamente', () => {
      component.ventasRango.set([
        venta({ totalCobrado: 10, creadoEn: '2026-09-02T08:00:00' }),
        venta({ totalCobrado: 20, creadoEn: '2026-09-01T08:00:00' }),
        venta({ totalCobrado: 5, creadoEn: '2026-09-01T20:00:00' }),
      ]);
      const dias = component.ventasDiarias();
      expect(dias.map(d => d.fecha)).toEqual(['2026-09-01', '2026-09-02']);
      expect(dias[0].total).toBe(25);
      expect(dias[0].cantidad).toBe(2);
    });

    it('maxDiario nunca es 0 aunque no haya ventas (evita división por cero en las barras)', () => {
      component.ventasRango.set([]);
      expect(component.maxDiario()).toBe(1);
    });

    it('totalRango y cantidadRango reflejan el set completo, no solo un día', () => {
      component.ventasRango.set([venta({ totalCobrado: 10 }), venta({ totalCobrado: 15 })]);
      expect(component.totalRango()).toBe(25);
      expect(component.cantidadRango()).toBe(2);
    });
  });

  describe('Cobros de pensionados', () => {
    it('separa pagados de pendientes y suma cada bolsa por separado', () => {
      component.cobros.set([
        cobro({ pagado: true, montoPagado: 100, totalCobrado: 100 }),
        cobro({ pagado: false, saldoRestante: 60, totalCobrado: 100 }),
      ]);
      expect(component.cobrosPagados()).toBe(1);
      expect(component.cobrosPendientesCount()).toBe(1);
      expect(component.totalPagado()).toBe(100);
      expect(component.totalPendiente()).toBe(60);
      expect(component.totalCobros()).toBe(200);
    });

    it('pctPagados es 0 sin cobros (evita división por cero)', () => {
      component.cobros.set([]);
      expect(component.pctPagados()).toBe(0);
    });

    it('pctPagados calcula el porcentaje real sobre el total de cobros', () => {
      component.cobros.set([
        cobro({ pagado: true }),
        cobro({ pagado: true }),
        cobro({ pagado: false }),
        cobro({ pagado: false }),
      ]);
      expect(component.pctPagados()).toBe(50);
    });
  });

  describe('Reporte de pensionados', () => {
    it('totalCobrosPens y totalDiasAsistidos suman sobre todo el set', () => {
      component.cobrosPens.set([
        cobro({ totalCobrado: 100, diasAsistidos: 18 }),
        cobro({ totalCobrado: 150, diasAsistidos: 20 }),
      ]);
      expect(component.totalCobrosPens()).toBe(250);
      expect(component.totalDiasAsistidos()).toBe(38);
    });
  });

  describe('Rentabilidad por plato', () => {
    const plato = (over: Partial<RentabilidadPlato>): RentabilidadPlato => ({
      platoId: 1, platoNombre: 'Milanesa', cantidadVendida: 10, totalIngresos: 500,
      costoUnitarioEstimado: 20, costoTotalEstimado: 200, margenTotal: 300, margenPct: 60, ...over,
    });

    it('suma ingresos, costo y margen de todos los platos del período', () => {
      component.rentabilidad.set([
        plato({ totalIngresos: 500, costoTotalEstimado: 200, margenTotal: 300 }),
        plato({ totalIngresos: 300, costoTotalEstimado: 100, margenTotal: 200 }),
      ]);
      expect(component.totalIngresosRent()).toBe(800);
      expect(component.totalCostoRent()).toBe(300);
      expect(component.totalMargenRent()).toBe(500);
    });
  });

  describe('Comparativo por sucursal', () => {
    it('maxComparativo nunca es 0 aunque no haya datos (evita división por cero en la barra)', () => {
      component.comparativo.set([]);
      expect(component.maxComparativo()).toBe(1);
    });

    it('maxComparativo toma el total más alto entre sucursales', () => {
      const suc = (over: Partial<VentaPorSucursal>): VentaPorSucursal =>
        ({ sucursalId: 1, sucursalNombre: 'Casa Matriz', total: 0, cantidad: 0, ...over });
      component.comparativo.set([suc({ total: 300 }), suc({ sucursalId: 2, total: 900 })]);
      expect(component.maxComparativo()).toBe(900);
    });
  });
});
