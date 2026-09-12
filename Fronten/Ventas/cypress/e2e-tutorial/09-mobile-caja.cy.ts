// Chapter 9 — Caja en viewport móvil
// Same real /caja flow as chapter 2, but rendered at a mobile viewport
// (390x844, iPhone 12/13-ish) to show the responsive layout on a phone.
describe('09 - Caja (mobile)', () => {
  beforeEach(() => {
    cy.viewport(390, 844);
    cy.login('cajero1', 'Cajero123!');
    cy.ensureTurnoAbierto();
    cy.visit('/caja');
    cy.contains('h1', 'Caja').should('be.visible');
  });

  it('adds a real plato to the cart and pays en efectivo on a mobile viewport', () => {
    cy.get('[data-cy="caja-busqueda"]', { timeout: 15000 }).should('be.visible');

    // Tucumana de pollo (PLA-TUC-POLLO, tipo TUCUMANA, Bs 7.00) — unlike a
    // SEGUNDO dish (e.g. the previously-used "Ranga ranga"), this tipo never
    // gates on today's real Producción del día plan (VentaServiceImpl only
    // checks that for SOPA/SEGUNDO/ESPECIAL/ALMUERZO), so it stays sellable
    // regardless of how much of the day's planned production other specs
    // have already consumed.
    cy.get('[data-cy="caja-busqueda"]').clear().type('Tucumana de pollo', { delay: 60 });
    cy.contains('button.card', 'Tucumana de pollo', { timeout: 10000 }).click();

    cy.contains('Tucumana de pollo').should('be.visible');
    cy.get('[data-cy="btn-cobrar"]').should('contain.text', '7.00');

    cy.get('input[type="number"]').first().clear().type('10', { delay: 60 });
    cy.get('[data-cy="btn-cobrar"]').click();

    cy.get('[data-cy="modal-venta-exitosa"]', { timeout: 15000 }).should('be.visible');
    cy.wait(700);
    cy.contains('¡Venta registrada!').should('be.visible');
    cy.wait(500);
    cy.get('[data-cy="btn-nueva-venta"]').click();
  });
});
