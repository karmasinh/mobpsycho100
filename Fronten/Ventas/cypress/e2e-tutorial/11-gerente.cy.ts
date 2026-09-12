// Chapter 11 — Rol GERENTE_SUCURSAL
// Logs in as the seeded GERENTE_SUCURSAL (gerente1 / Gerente123!, DataInitializer.java,
// fixed sucursal "Casa Matriz", sucursalId 1) and tours the screens whose behaviour
// changes for a sucursal-scoped role: dashboard BI, historial-ventas (anulación =
// solicitud, not direct anular — AuthService.rol() !== 'ADMIN'), reportes (no
// "Sucursales" comparativo tab and no sucursal filter — RN-A-014, seccionesVisibles()
// and the `auth.sucursalFija() == null` guard in reportes.component.ts), aprobaciones
// (own solicitudes only, no Aprobar/Rechazar — AprobacionesComponent.esAdmin()), and
// cierre-caja (movement reversal is "Solicitar reversión", not the ADMIN "Revertir" —
// cierre-caja.component.ts abrirSolicitarReversion() vs abrirRevertir(), and no
// "Administrar movimientos (ADMIN)" panel).
describe('11 - Rol GERENTE_SUCURSAL', () => {
  beforeEach(() => {
    cy.login('gerente1', 'Gerente123!');
  });

  it('dashboard shows sucursal-scoped BI, not the ADMIN cross-sucursal comparativo', () => {
    cy.visit('/dashboard');
    cy.contains('h1', 'Dashboard').should('be.visible');

    // GERENTE_SUCURSAL block (dashboard.component.ts esGerente()): tendencia de su
    // propia sucursal + top productos — no selector de sucursal, siempre la fija.
    cy.contains('Tendencia de ventas (7 días)', { timeout: 15000 }).should('be.visible');
    cy.contains('Top productos de la semana').should('be.visible');

    // ADMIN-only block (esAdmin()): comparativo entre sucursales + alertas del sistema.
    // A GERENTE_SUCURSAL never sees these, since the backend only returns global
    // cross-sucursal data to ADMIN (RN-A-014).
    cy.contains('Ventas por sucursal (últimos 7 días)').should('not.exist');
    cy.contains('Alertas recientes').should('not.exist');
  });

  it('historial-ventas: anular queda como solicitud pendiente, no anulación directa', () => {
    cy.visit('/historial-ventas');
    cy.contains('h1', 'Historial de ventas').should('be.visible');

    cy.get('[data-cy="btn-buscar-historial"]').click();
    cy.contains('Total recaudado', { timeout: 15000 }).should('be.visible');

    // HistorialVentasComponent.puedeAnular() is true for GERENTE_SUCURSAL, but
    // esAdmin() is false — so the button's title is "Solicitar anulación" (not
    // "Anular venta") and confirmarAnular() calls solicitudService.solicitar()
    // instead of ventaService.anular().
    cy.get('button[title="Solicitar anulación"]', { timeout: 10000 }).first().click();
    cy.wait(600);
    cy.contains('Solicitar anulación de venta').should('be.visible');
    cy.contains('La anulación queda pendiente hasta que un administrador la apruebe.').should('be.visible');

    cy.get('textarea').type('Cliente se arrepintió del pedido — solicito revisión', { delay: 60 });
    cy.wait(500);
    cy.contains('button', 'Enviar solicitud').click();

    cy.wait(700);
    cy.contains('Solicitud enviada — pendiente de aprobación de un administrador').should('be.visible');
  });

  it('reportes: sin el tab de comparativo entre sucursales ni el filtro de sucursal', () => {
    cy.visit('/reportes');
    cy.contains('h1', 'Reportes', { timeout: 10000 }).should('exist');
    cy.contains('button', 'Calendario', { timeout: 15000 }).should('be.visible');

    // ReportesComponent.seccionesVisibles(): el tab "Sucursales" (comparativo global,
    // RN-A-014) solo se agrega cuando auth.rol() === 'ADMIN'.
    cy.contains('button', 'Sucursales').should('not.exist');

    // El <select> de filtro de sucursal solo aparece cuando auth.sucursalFija() es
    // null (usuarios multi-sucursal); gerente1 tiene sucursal fija (Casa Matriz).
    cy.contains('Todas las sucursales').should('not.exist');

    cy.contains('button', 'Ventas').click();
    cy.contains('button', 'Consultar', { timeout: 10000 }).should('be.visible');
  });

  it('aprobaciones: ve solo sus propias solicitudes, sin poder aprobar ni rechazar', () => {
    cy.visit('/aprobaciones');
    cy.contains('h1', 'Aprobaciones').should('be.visible');

    // AprobacionesComponent.esAdmin() es false para GERENTE_SUCURSAL: el subtítulo,
    // la fuente de datos (listarMias() en vez de listarPendientes()) y las columnas
    // cambian — sin "Sucursal"/"Solicitante" y sin acciones de Aprobar/Rechazar.
    cy.contains('Tus solicitudes de anulación de venta y reversión de caja', { timeout: 10000 }).should('be.visible');

    cy.get('body').then($body => {
      if ($body.find('table').length) {
        cy.contains('th', 'Solicitante').should('not.exist');
        cy.contains('th', 'Sucursal').should('not.exist');
      }
    });
    cy.contains('button', 'Aprobar').should('not.exist');
    cy.contains('button', 'Rechazar').should('not.exist');
  });

  it('cierre-caja: solo puede solicitar la reversión de un movimiento, no revertirlo directo', () => {
    cy.ensureTurnoAbierto();
    cy.visit('/cierre-caja');
    cy.contains('h1', 'Cierre de caja').should('be.visible');
    cy.contains('Turno abierto', { timeout: 15000 }).should('be.visible');

    // No existe el panel de administración de turnos ajenos — es exclusivo de ADMIN.
    cy.contains('Administrar movimientos (ADMIN)').should('not.exist');

    cy.get('[data-cy="input-mov-monto"]').type('20', { delay: 60 });
    cy.get('[data-cy="input-mov-motivo"]').type('Compra de hielo para el turno', { delay: 60 });
    cy.wait(500);
    cy.get('[data-cy="btn-registrar-movimiento"]').click();

    cy.contains('Compra de hielo para el turno', { timeout: 10000 }).should('be.visible');
    cy.wait(600);

    // CierreCajaComponent: quien no es ADMIN solo ve "Solicitar reversión"
    // (abrirSolicitarReversion), nunca el botón "Revertir" directo de ADMIN.
    cy.contains('button', 'Revertir').should('not.exist');
    cy.contains('button', 'Solicitar reversión').first().click();
    cy.wait(600);
    cy.contains('Solicitar reversión de movimiento').should('be.visible');
    cy.contains('Queda pendiente hasta que un administrador la apruebe.').should('be.visible');

    cy.get('input[placeholder="Ej: registrado por error"]').type('Monto registrado por error', { delay: 60 });
    cy.wait(500);
    cy.contains('button', 'Enviar solicitud').click();

    cy.wait(700);
    cy.contains('Solicitud enviada — pendiente de aprobación de un administrador').should('be.visible');
  });
});
