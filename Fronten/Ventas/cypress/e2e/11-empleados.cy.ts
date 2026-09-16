// Chapter 11 — Empleados: filtro por turno
// Logs in as admin and filters the empleados list by turno ("Tarde"),
// confirming every visible row actually has that turno — regression test
// for AUD-A-039 (filtroTurno era una propiedad plana, no una signal; el
// computed() nunca se re-evaluaba al cambiar el select).
describe('11 - Empleados: filtro por turno', () => {
  beforeEach(() => {
    cy.login('admin', 'admin123');
    cy.visit('/empleados');
    cy.contains('h1', 'Empleados').should('be.visible');
  });

  it('filtra la lista por turno y muestra solo empleados de ese turno', () => {
    cy.get('table tbody tr', { timeout: 15000 }).should('have.length.greaterThan', 0);

    cy.get('select').contains('option', 'Todos los turnos').parent('select').as('filtroTurno');
    cy.get('@filtroTurno').select('TARDE');
    cy.wait(500);

    cy.get('table tbody tr', { timeout: 10000 }).should('have.length.greaterThan', 0);
    cy.get('table tbody tr').each($row => {
      cy.wrap($row).should('contain.text', 'Tarde');
    });

    // Volver a "Todos los turnos" restaura la lista completa.
    cy.get('@filtroTurno').select('');
    cy.wait(500);
    cy.get('table tbody tr').should('have.length.greaterThan', 0);
  });
});
