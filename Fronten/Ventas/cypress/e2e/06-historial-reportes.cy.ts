// Chapter 6 — Historial de ventas y Reportes
// Logs in as admin, views the sales history for "Este mes" (the default
// range), applies the "Vigentes" status filter, then opens Reportes and
// switches between real report tabs.
describe('06 - Historial de ventas y Reportes', () => {
  beforeEach(() => {
    cy.login('admin', 'admin123');
  });

  it('views historial de ventas and applies a filter', () => {
    cy.visit('/historial-ventas');
    cy.contains('h1', 'Historial de ventas').should('be.visible');

    cy.get('[data-cy="btn-buscar-historial"]').click();
    cy.contains('Total recaudado', { timeout: 15000 }).should('be.visible');

    // Live filter: search by the "cajero1" cajero (chapter 2 registered a
    // real sale as that user). Typed character-by-character (cy.type
    // default) — the filtered table is a computed() driven by the busqueda
    // signal, so it narrows down live with no extra click needed.
    cy.get('input[placeholder="Buscar por cliente, cajero..."]').type('cajero1', { delay: 60 });
    cy.contains('td.font-mono.text-sm', 'cajero1', { timeout: 10000 }).should('be.visible');
    cy.get('input[placeholder="Buscar por cliente, cajero..."]').clear();

    cy.contains('button', 'Vigentes').click();
    cy.contains('button', 'Anuladas').should('be.visible');
  });

  it('views the reportes screen and its real tabs', () => {
    cy.visit('/reportes');
    cy.contains('h1', 'Reportes', { timeout: 10000 }).should('exist');

    cy.contains('button', 'Calendario', { timeout: 15000 }).should('be.visible');
    cy.contains('button', 'Ventas').click();
    cy.contains('button', 'Consultar', { timeout: 10000 }).should('be.visible');

    cy.contains('button', 'Productos').click();
    cy.contains('button', 'Consultar').should('be.visible');
  });
});
