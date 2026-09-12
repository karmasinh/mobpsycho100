// Chapter 8 — Facturación: configurar datos fiscales y emitir una factura
// Logs in as admin, saves the fiscal configuration on /facturacion, generates
// the demo CUIS/CUFD codes, then goes to /historial-ventas and emits a
// factura for an existing (real) venta — this system never contacts the SIN
// for real, so the factura is expected to land in PENDIENTE state.
describe('08 - Facturación', () => {
  beforeEach(() => {
    cy.login('admin', 'admin123');
  });

  it('saves fiscal configuration and generates demo CUIS/CUFD', () => {
    cy.visit('/facturacion');
    cy.contains('h1', 'Facturación electrónica').should('be.visible');
    cy.contains('Conexión SIN: no configurada').should('be.visible');

    cy.get('[data-cy="input-facturacion-razon-social"]', { timeout: 15000 })
      .should('be.visible')
      .clear()
      .type('La Entrerriana', { delay: 60 });
    cy.get('[data-cy="btn-guardar-facturacion"]').click();
    cy.contains('Datos fiscales').should('be.visible');
    cy.wait(700);

    cy.get('[data-cy="btn-generar-cuis"]').click();
    cy.contains('CUIS de prueba generado', { timeout: 15000 }).should('be.visible');
    cy.wait(700);

    cy.get('[data-cy="btn-renovar-cufd"]').click();
    cy.contains('CUFD de prueba generado', { timeout: 15000 }).should('be.visible');
    cy.wait(700);
  });

  it('emits a factura for an existing venta from historial de ventas', () => {
    cy.visit('/historial-ventas');
    cy.contains('h1', 'Historial de ventas').should('be.visible');
    cy.get('[data-cy="btn-buscar-historial"]').click();

    cy.get('[data-cy="btn-abrir-facturar"]', { timeout: 15000 }).first().click();
    cy.wait(600);
    cy.contains('Emitir factura — venta #').should('be.visible');

    cy.get('[data-cy="input-factura-nit"]').type('0', { delay: 60 });
    cy.get('[data-cy="input-factura-razon-social"]').type('Consumidor final Cypress', { delay: 60 });
    cy.wait(500);
    cy.get('[data-cy="btn-confirmar-facturar"]').click();

    cy.contains('Emitir factura — venta #', { timeout: 15000 }).should('not.exist');
  });
});
