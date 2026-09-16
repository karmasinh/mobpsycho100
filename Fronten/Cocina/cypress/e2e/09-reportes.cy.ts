// ═══════════════════════════════════════════════════════════════════════
// Capítulo 9 — Reportes de Cocina (stock, mermas, producción, comparativo)
//
// Inicia sesión como admin y recorre las 4 pestañas de /reportes con datos
// reales del backend, incluyendo el comparativo entre sucursales (solo
// ADMIN) y el botón de exportación a PDF. Selectores verificados contra
// features/reportes/reportes.component.ts.
// ═══════════════════════════════════════════════════════════════════════
describe('09 - Reportes de Cocina', () => {
  beforeEach(() => {
    cy.viewport(1366, 800);
    cy.login('admin', 'admin123');
    cy.visit('/reportes');
    cy.contains('h1', 'Reportes').should('be.visible');
  });

  it('muestra stock actual, mermas y avance de producción con datos reales', () => {
    cy.contains('button', 'Stock actual').click();
    cy.contains('Insumos activos', { timeout: 15000 }).should('be.visible');
    cy.contains('Valor total estimado').should('be.visible');
    cy.get('body').invoke('text').should((texto) => {
      expect(/\b(kg|litro|unidad)\b/i.test(texto), 'muestra al menos una unidad real de insumo').to.be.true;
    });

    cy.contains('button', 'Mermas').click();
    cy.contains('Registros en el período', { timeout: 15000 }).should('be.visible');
    cy.contains('Valor económico total').should('be.visible');

    cy.contains('button', 'Avance de producción').click();
    cy.wait(500);
    cy.contains(/producidos/, { timeout: 15000 }).should('be.visible');
  });

  it('el comparativo entre sucursales muestra mermas y valor de stock por sucursal (solo ADMIN)', () => {
    cy.contains('button', 'Sucursales').click();
    cy.contains('h2, h3, p', 'Comparativo entre sucursales').should('be.visible');

    cy.contains('button', 'Consultar').click();
    cy.contains('mermas', { timeout: 15000 }).should('be.visible');
    cy.contains('Stock:').should('be.visible');
  });

  it('el botón "Descargar PDF" dispara la exportación client-side sin errores', () => {
    cy.window().then((win) => cy.spy(win.console, 'error').as('consoleError'));
    cy.contains('button', 'Descargar PDF').click();
    cy.wait(1500);
    // No aserta contra la descarga real del archivo (bloqueada por el sandbox del navegador
    // de pruebas en algunos entornos CI) — sólo que el flujo de generación no lanzó un error
    // de aplicación (jsPDF se resuelve vía import dinámico y arma el documento en memoria).
    cy.get('@consoleError').should((spy) => {
      const errores = (spy as unknown as sinon.SinonSpy).getCalls().map(c => String(c.args[0]));
      const errorDeApp = errores.some(e => e.includes('ChunkLoadError') || e.includes('is not a function'));
      expect(errorDeApp, `errores de consola inesperados: ${errores.join(' | ')}`).to.be.false;
    });
  });
});
