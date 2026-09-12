// Chapter 2 — Caja: nueva venta
// Logs in as the seeded CAJERO (cajero1 / Cajero123!, DataInitializer.java,
// sucursal "Casa Matriz") and builds a real order in /caja using real platos
// from the live menu (GET /api/platos), including "Saice" — one of the
// traditional Tarija dishes seeded in this database — then pays in cash.
describe('02 - Caja: nueva venta', () => {
  beforeEach(() => {
    cy.login('cajero1', 'Cajero123!');
    cy.ensureTurnoAbierto();
    cy.visit('/caja');
    cy.contains('h1', 'Caja').should('be.visible');
  });

  it('builds an order with real platos (incl. traditional Bolivian snacks) and cobra en efectivo', () => {
    // Wait for the menu grid to finish loading.
    cy.get('[data-cy="caja-busqueda"]', { timeout: 15000 }).should('be.visible');

    // NOTE: platos of tipo SOPA/SEGUNDO/ESPECIAL (e.g. "Saice", "Chancao de
    // pollo") can only be sold against today's real Producción del día plan
    // for this sucursal (VentaServiceImpl -> ProduccionService.decrementarStock()),
    // and this dev database's daily production/stock for Casa Matriz gets
    // exhausted by repeated automated runs with no way to top it up from the
    // Ventas frontend (that's Cocina's screen). So this tutorial spec — like
    // every other caja spec here — deliberately sticks to tipos that never
    // gate on Producción del día (ENTRADA/EMPANADA/BEBIDA), verified against
    // VentaServiceImpl's decrementarStock() branch (only SOPA/SEGUNDO/
    // ESPECIAL/ALMUERZO call it) and GET /api/platos for real prices.

    // Plato 1: Empanada salteña (PLA-SALTENA, ENTRADA, Bs 8.00)
    cy.get('[data-cy="caja-busqueda"]').clear().type('salteña', { delay: 60 });
    cy.contains('button.card', 'Empanada salteña', { timeout: 10000 }).click();

    // Plato 2: Tamal de cerdo (PLA-TAMAL, ENTRADA, Bs 10.00)
    cy.get('[data-cy="caja-busqueda"]').clear().type('Tamal', { delay: 60 });
    cy.contains('button.card', 'Tamal de cerdo', { timeout: 10000 }).click();

    // Plato 3: Refresco de mocochinchi (PLA-BEB-REFRESCO, Bs 6.00)
    cy.get('[data-cy="caja-busqueda"]').clear().type('mocochinchi', { delay: 60 });
    cy.contains('button.card', 'Refresco de mocochinchi', { timeout: 10000 }).click();

    // Carrito shows the 3 items.
    cy.contains('Empanada salteña').should('be.visible');
    cy.contains('Tamal de cerdo').should('be.visible');
    cy.contains('Refresco de mocochinchi').should('be.visible');

    // Total = 8 + 10 + 6 = Bs 24.00
    cy.get('[data-cy="btn-cobrar"]').should('contain.text', '24.00');

    // Efectivo is the default forma de pago; pay with Bs 30.
    // Typed character-by-character (cy.type default) so the "Vuelto" preview
    // below — a computed() derived from the montoRecibido signal — is shown
    // updating live, with no extra click needed to force a recompute.
    cy.get('input[type="number"]').first().clear().type('30', { delay: 60 });

    // Live vuelto preview (Bs 30 - Bs 24 = Bs 6.00) appears as soon as typing
    // stops, purely from the reactive computed() — before "Cobrar" is clicked.
    cy.contains('Vuelto: Bs 6.00', { timeout: 10000 }).should('be.visible');

    cy.get('[data-cy="btn-cobrar"]').click();

    cy.get('[data-cy="modal-venta-exitosa"]', { timeout: 15000 }).should('be.visible');
    cy.wait(700);
    cy.contains('¡Venta registrada!').should('be.visible');
    cy.contains('Total: Bs 24.00').should('be.visible');
    cy.contains('Vuelto: Bs 6.00').should('be.visible');

    cy.wait(500);
    cy.get('[data-cy="btn-nueva-venta"]').click();
    cy.get('[data-cy="modal-venta-exitosa"]').should('not.exist');
  });
});
