// Chapter 12 — Rol VENDEDOR
// Logs in as the seeded VENDEDOR (vendedor2 / Vendedor123!, DatosPruebaRunner.java,
// sucursal "Sucursal Sur") and walks a realistic operational flow: dashboard, a real
// sale in /caja (using "Licuado de papaya" and "Agua mineral" — real platos from
// GET /api/platos whose tipos never gate on today's Producción del día plan,
// so the sale stays reliable across repeated runs), the real 403 a VENDEDOR
// hits on historial-ventas (its backend listing endpoint doesn't grant that
// role access), and /pedidos (PedidosComponent has no role-gating in its
// template: any logged-in user
// who can reach the route can mark a LISTO pedido as entregado or cancel a PENDIENTE
// one — see marcarEntregado()/confirmarCancelar() in pedidos.component.ts).
describe('12 - Rol VENDEDOR', () => {
  beforeEach(() => {
    cy.login('vendedor2', 'Vendedor123!');
  });

  it('dashboard: sin secciones de BI (esas son solo para ADMIN/GERENTE_SUCURSAL)', () => {
    cy.visit('/dashboard');
    cy.contains('h1', 'Dashboard').should('be.visible');
    cy.contains('Ventas del día', { timeout: 15000 }).should('be.visible');

    // dashboard.component.ts: los bloques de BI están detrás de esAdmin()/esGerente();
    // un VENDEDOR no cumple ninguna, así que ninguno de los dos aparece.
    cy.contains('Ventas por sucursal (últimos 7 días)').should('not.exist');
    cy.contains('Tendencia de ventas (7 días)').should('not.exist');
  });

  it('caja: registra una venta real con platos tradicionales bolivianos y cobra en efectivo', () => {
    cy.ensureTurnoAbierto();
    cy.visit('/caja');
    cy.contains('h1', 'Caja').should('be.visible');
    cy.get('[data-cy="caja-busqueda"]', { timeout: 15000 }).should('be.visible');

    // NOTE: "Doradillo tarijeño" (SEGUNDO) isn't in Sucursal Sur's real
    // Producción del día plan for today (verified via GET /api/produccion/hoy
    // ?sucursalId=2) and there is no way to add a plato to an already-created
    // day's plan from the Ventas frontend — only Cocina plans production, and
    // VentaServiceImpl.decrementarStock() only allows selling SOPA/SEGUNDO/
    // ESPECIAL/ALMUERZO platos that are actually on that plan. So this spec
    // uses two platos whose tipos never gate on Producción del día, which
    // keeps it reliable across repeated runs regardless of the day's plan.
    // Licuado de papaya (PLA-LIC-PAPAYA, tipo LICUADO, Bs 8.00).
    cy.get('[data-cy="caja-busqueda"]').clear().type('Licuado de papaya', { delay: 60 });
    cy.contains('button.card', 'Licuado de papaya', { timeout: 10000 }).click();

    // Agua mineral (PLA-BEB-AGUA, tipo BEBIDA, Bs 6.00).
    cy.get('[data-cy="caja-busqueda"]').clear().type('Agua mineral', { delay: 60 });
    cy.contains('button.card', 'Agua mineral', { timeout: 10000 }).click();

    cy.contains('Licuado de papaya').should('be.visible');
    cy.contains('Agua mineral').should('be.visible');

    // Total = 8 + 6 = Bs 14.00
    cy.get('[data-cy="btn-cobrar"]').should('contain.text', '14.00');

    cy.get('input[type="number"]').first().clear().type('20', { delay: 60 });
    cy.contains('Vuelto: Bs 6.00', { timeout: 10000 }).should('be.visible');

    cy.get('[data-cy="btn-cobrar"]').click();

    cy.get('[data-cy="modal-venta-exitosa"]', { timeout: 15000 }).should('be.visible');
    cy.wait(700);
    cy.contains('¡Venta registrada!').should('be.visible');
    cy.contains('Total: Bs 14.00').should('be.visible');
    cy.contains('Vuelto: Bs 6.00').should('be.visible');

    cy.wait(500);
    cy.get('[data-cy="btn-nueva-venta"]').click();
    cy.get('[data-cy="modal-venta-exitosa"]').should('not.exist');
  });

  it('historial-ventas: el rol VENDEDOR no tiene permiso real para listar el historial', () => {
    // The sidebar shows the "Historial de ventas" link (its menu módulo is
    // granted to VENDEDOR), but the actual listing endpoint is more
    // restrictive: VentaController's GET /ventas is @PreAuthorize
    // "hasAnyRole('CAJERO','ADMIN','GERENTE_SUCURSAL') or MOD_REPORTES" —
    // VENDEDOR is not in that role list and vendedor2 has no MOD_REPORTES
    // permiso (confirmed via a real login response), so the backend call
    // returns 403 even though the route itself renders. buscar()'s error
    // branch (historial-ventas.component.ts) catches that and shows a toast
    // instead of the stats — this test documents that real gap rather than
    // assuming VENDEDOR mirrors CAJERO's access.
    cy.visit('/historial-ventas');
    cy.contains('h1', 'Historial de ventas').should('be.visible');

    cy.get('[data-cy="btn-buscar-historial"]').click();
    cy.contains('No se pudo cargar el historial de ventas', { timeout: 15000 }).should('be.visible');
    cy.contains('Total recaudado').should('not.exist');
  });

  it('pedidos: revisa la vista de pedidos y sus contadores por estado', () => {
    cy.visit('/pedidos');
    cy.contains('h1', 'Pedidos').should('be.visible');

    // PedidosComponent carga los 5 estados por separado y arma las vistas
    // (Activos/Completados/Todos) — sin gating de rol en el template.
    cy.contains('button', 'Activos', { timeout: 15000 }).should('be.visible');
    cy.contains('button', 'Completados').should('be.visible');
    cy.contains('button', 'Todos').click();
    cy.wait(600);

    cy.get('body').then($body => {
      if ($body.find('[title="Ver detalle"]').length) {
        cy.get('[title="Ver detalle"]').first().click();
        cy.wait(600);
        cy.contains('Pedido #').should('be.visible');
        cy.wait(500);
        cy.contains('button', 'Cerrar').click();
      }
    });
  });
});
