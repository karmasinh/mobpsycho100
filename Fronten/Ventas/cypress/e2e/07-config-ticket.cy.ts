// Chapter 7 — Ticket de venta: configurar y ver la vista previa
// Logs in as admin, updates the razón social printed on the sales ticket and
// verifies the live preview panel (right side of /config-ticket) reflects it.
describe('07 - Configuración de ticket', () => {
  beforeEach(() => {
    cy.login('admin', 'admin123');
    cy.visit('/config-ticket');
    cy.contains('h1', 'Ticket de venta').should('be.visible');
  });

  it('updates razón social and sees it in the live preview', () => {
    const razonSocial = `La Entrerriana Cypress ${Date.now()}`;

    cy.get('[data-cy="input-ticket-razon-social"]', { timeout: 15000 })
      .should('be.visible')
      .clear()
      .type(razonSocial, { delay: 60 });

    // Vista previa panel updates live as you type — no save needed to see it.
    cy.contains('Vista previa').should('be.visible');
    cy.contains(razonSocial).should('be.visible');

    cy.get('[data-cy="btn-guardar-ticket"]').click();
    cy.wait(700);
    cy.contains('Vista previa').should('be.visible');
    cy.contains(razonSocial).should('be.visible');
  });
});
