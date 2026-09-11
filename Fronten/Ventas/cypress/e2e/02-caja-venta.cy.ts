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

  it('builds an order with real platos (incl. a traditional Tarija dish) and cobra en efectivo', () => {
    // Wait for the menu grid to finish loading.
    cy.get('[data-cy="caja-busqueda"]', { timeout: 15000 }).should('be.visible');

    // Plato 1: Saice — traditional Tarija dish (PLA-SAICE, Bs 25.00)
    cy.get('[data-cy="caja-busqueda"]').clear().type('Saice', { delay: 60 });
    cy.contains('button.card', 'Saice', { timeout: 10000 }).click();

    // Plato 2: Chancao de pollo — traditional Tarija dish (PLA-CHANCAO, Bs 24.00)
    cy.get('[data-cy="caja-busqueda"]').clear().type('Chancao', { delay: 60 });
    cy.contains('button.card', 'Chancao de pollo', { timeout: 10000 }).click();

    // Plato 3: Refresco de mocochinchi (PLA-BEB-REFRESCO, Bs 6.00)
    cy.get('[data-cy="caja-busqueda"]').clear().type('mocochinchi', { delay: 60 });
    cy.contains('button.card', 'Refresco de mocochinchi', { timeout: 10000 }).click();

    // Carrito shows the 3 items.
    cy.contains('Saice').should('be.visible');
    cy.contains('Chancao de pollo').should('be.visible');
    cy.contains('Refresco de mocochinchi').should('be.visible');

    // Total = 25 + 24 + 6 = Bs 55.00
    cy.get('[data-cy="btn-cobrar"]').should('contain.text', '55.00');

    // Efectivo is the default forma de pago; pay with Bs 60.
    // Typed character-by-character (cy.type default) so the "Vuelto" preview
    // below — a computed() derived from the montoRecibido signal — is shown
    // updating live, with no extra click needed to force a recompute.
    cy.get('input[type="number"]').first().clear().type('60', { delay: 60 });

    // Live vuelto preview (Bs 60 - Bs 55 = Bs 5.00) appears as soon as typing
    // stops, purely from the reactive computed() — before "Cobrar" is clicked.
    cy.contains('Vuelto: Bs 5.00', { timeout: 10000 }).should('be.visible');

    cy.get('[data-cy="btn-cobrar"]').click();

    cy.get('[data-cy="modal-venta-exitosa"]', { timeout: 15000 }).should('be.visible');
    cy.wait(700);
    cy.contains('¡Venta registrada!').should('be.visible');
    cy.contains('Total: Bs 55.00').should('be.visible');
    cy.contains('Vuelto: Bs 5.00').should('be.visible');

    cy.wait(500);
    cy.get('[data-cy="btn-nueva-venta"]').click();
    cy.get('[data-cy="modal-venta-exitosa"]').should('not.exist');
  });
});
