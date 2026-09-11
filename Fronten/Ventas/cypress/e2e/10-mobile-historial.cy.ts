// Chapter 10 — Historial de ventas en viewport móvil
// Same real /historial-ventas flow as chapter 6, rendered at a mobile
// viewport (390x844) to show the responsive table/stat-card layout on a phone.
describe('10 - Historial de ventas (mobile)', () => {
  beforeEach(() => {
    cy.viewport(390, 844);
    cy.login('admin', 'admin123');
    cy.visit('/historial-ventas');
    cy.contains('h1', 'Historial de ventas').should('be.visible');
  });

  it('searches the sales history and views a real venta detail on mobile', () => {
    cy.get('[data-cy="btn-buscar-historial"]').click();
    cy.contains('Total recaudado', { timeout: 15000 }).should('be.visible');

    cy.get('table tbody tr').first().within(() => {
      cy.get('button[title="Ver detalle"]').click();
    });
    cy.wait(600);

    cy.contains('Venta #', { timeout: 10000 }).should('be.visible');
    cy.contains('Total cobrado').should('be.visible');
    cy.wait(500);
  });
});
