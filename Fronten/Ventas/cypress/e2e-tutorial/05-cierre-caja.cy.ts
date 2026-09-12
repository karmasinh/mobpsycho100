// Chapter 5 — Cierre de caja: abrir turno, movimiento, cerrar turno
// Logs in as the seeded CAJERO (cajero1 / Cajero123!) and drives the real
// /cierre-caja flow: open a shift (if not already open), register a cash
// movement, then close the shift and verify the real closing breakdown.
describe('05 - Cierre de caja', () => {
  beforeEach(() => {
    cy.login('cajero1', 'Cajero123!');
    cy.visit('/cierre-caja');
    cy.contains('h1', 'Cierre de caja').should('be.visible');
  });

  it('opens the turno if needed, registers a movement, and closes it', () => {
    cy.get('body').then($body => {
      if ($body.find('[data-cy="btn-abrir-turno"]').length) {
        cy.get('[data-cy="input-monto-inicial"]').type('100', { delay: 60 });
        cy.get('[data-cy="btn-abrir-turno"]').click();
      }
    });

    cy.contains('Turno abierto', { timeout: 15000 }).should('be.visible');
    cy.wait(700);

    cy.get('[data-cy="input-mov-monto"]').type('20', { delay: 60 });
    cy.get('[data-cy="input-mov-motivo"]').type('Compra de insumos menores (Cypress)', { delay: 60 });
    cy.get('[data-cy="btn-registrar-movimiento"]').click();
    cy.contains('Compra de insumos menores (Cypress)', { timeout: 10000 }).should('be.visible');
    cy.wait(700);

    cy.get('[data-cy="input-monto-final"]').type('80', { delay: 60 });
    cy.get('[data-cy="btn-cerrar-turno"]').click();

    cy.contains('Turno cerrado', { timeout: 15000 }).should('be.visible');
    cy.wait(700);
    cy.contains('Efectivo declarado').should('be.visible');
    cy.contains('Diferencia').should('be.visible');
    cy.wait(500);
    cy.get('[data-cy="btn-entendido-cierre"]').click();
    cy.contains('Turno cerrado').should('not.exist');
    cy.contains('Abrir turno de caja').should('be.visible');
  });
});
