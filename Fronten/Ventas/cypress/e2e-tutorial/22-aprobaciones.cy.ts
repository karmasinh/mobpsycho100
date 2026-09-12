// Chapter 22 — Aprobaciones: solicitar y aprobar una anulación de venta
// aprobaciones.component.ts is a pure review/approve screen fed by requests
// created elsewhere — it has no "create solicitud" UI of its own. The real
// trigger lives in historial-ventas.component.ts: puedeAnular() lets CAJERO
// (has MOD_CAJA) open the "anular" modal on a non-anulada venta, but
// confirmarAnular() only calls VentaService.anular() directly when esAdmin();
// any other role calls SolicitudAprobacionService.solicitar('ANULACION_VENTA', ...)
// instead, leaving the venta untouched and creating a PENDIENTE solicitud.
// The admin then reviews and approves it from /aprobaciones (aprobar() calls
// SolicitudAprobacionController's approve endpoint, which applies the
// anulación server-side).
//
// Two logins in one spec: cy.session (via cy.login) switches cleanly between
// them per it(), same pattern as other e2e-tutorial specs.
describe('22 - Aprobaciones', () => {
  const motivo = `Cypress solicitud anulación ${Date.now()}`;

  it('cajero1 registers a venta and requests its anulación', () => {
    cy.login('cajero1', 'Cajero123!');
    cy.ensureTurnoAbierto();
    cy.visit('/caja');
    cy.contains('h1', 'Caja').should('be.visible');

    // Un solo plato real: Empanada de carne (PLA-EMP-CARNE, tipo EMPANADA,
    // Bs 6.00). A diferencia de un SEGUNDO (p. ej. "Saice"), este tipo nunca
    // depende del plan de Producción del día (VentaServiceImpl solo valida
    // eso para SOPA/SEGUNDO/ESPECIAL/ALMUERZO), así que la venta siempre se
    // puede registrar sin importar cuánta producción del día ya consumieron
    // otras specs.
    cy.get('[data-cy="caja-busqueda"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-cy="caja-busqueda"]').clear().type('Empanada de carne', { delay: 60 });
    cy.contains('button.card', 'Empanada de carne', { timeout: 10000 }).click();
    cy.get('[data-cy="btn-cobrar"]').should('contain.text', '6.00');

    cy.get('input[type="number"]').first().clear().type('6', { delay: 60 });
    cy.wait(500);
    cy.get('[data-cy="btn-cobrar"]').click();

    cy.get('[data-cy="modal-venta-exitosa"]', { timeout: 15000 }).should('be.visible');
    cy.wait(700);
    cy.get('[data-cy="btn-nueva-venta"]').click();
    cy.get('[data-cy="modal-venta-exitosa"]').should('not.exist');
    cy.wait(500);

    // La venta recién cobrada queda arriba de todo: historial-ventas ordena
    // por fecha desc por defecto (sortCol='fecha', sortDir='desc') y
    // ngOnInit() ya trae el mes actual (setEsteMes + buscar()) sin tocar nada.
    cy.visit('/historial-ventas');
    cy.contains('h1', 'Historial de ventas').should('be.visible');
    // Skeleton <tr> placeholders render while cargando() is true — wait for
    // those to be gone before trusting the row count.
    cy.get('table tbody .skeleton', { timeout: 15000 }).should('not.exist');
    cy.get('table tbody tr').should('have.length.greaterThan', 0);

    cy.get('input[placeholder="Buscar por cliente, cajero..."]').type('cajero1', { delay: 60 });
    cy.get('table tbody tr', { timeout: 10000 }).first()
      .find('[title="Solicitar anulación"]').click();
    cy.wait(600);
    cy.contains('Solicitar anulación de venta').should('be.visible');

    cy.get('textarea[placeholder="Describe el motivo de la anulación..."]')
      .type(motivo, { delay: 60 });
    cy.wait(500);
    cy.contains('button', 'Enviar solicitud').click();

    cy.contains('Solicitud enviada', { timeout: 10000 }).should('be.visible');
    cy.wait(700);

    // La propia vista de aprobaciones del cajero muestra su solicitud pendiente.
    cy.visit('/aprobaciones');
    cy.contains('h1', 'Aprobaciones').should('be.visible');
    cy.contains('td', motivo, { timeout: 15000 }).should('be.visible');
    cy.contains('Pendiente').should('be.visible');
  });

  it('admin reviews and approves the pending solicitud', () => {
    cy.login('admin', 'admin123');
    cy.visit('/aprobaciones');
    cy.contains('h1', 'Aprobaciones').should('be.visible');

    // Espera al contenido real: la solicitud creada por cajero1 en el test
    // anterior (misma corrida) debe aparecer en la lista de pendientes.
    cy.contains('td', motivo, { timeout: 15000 }).should('be.visible');
    cy.wait(600);

    cy.contains('tr', motivo).within(() => {
      cy.contains('button', 'Aprobar').click();
    });

    cy.contains(/aprobada/i, { timeout: 15000 }).should('be.visible');
    cy.wait(700);

    // aprobar() vuelve a cargar listarPendientes(): la solicitud ya resuelta
    // desaparece de la vista de pendientes del admin.
    cy.contains('td', motivo).should('not.exist');
  });
});
