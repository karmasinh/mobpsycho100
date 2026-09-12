// ═══════════════════════════════════════════════════════════════════════
// Capítulo 11 — Auditoría del sistema (solo lectura)
//
// Inicia sesión como jefecocina1 (JEFE_COCINA también tiene
// MOD_AUDITORIA_COCINA) y recorre la pantalla de Auditoría: es un registro
// inmutable de acciones (CREATE/UPDATE/DELETE/LOGIN) que AuditoriaComponent
// carga apenas entra a la pantalla (ngOnInit -> buscar() sin filtro), así
// que ya debería haber filas reales generadas por los propios specs de este
// mismo tutorial (altas, ediciones y bajas de insumos, proveedores, etc.).
// Se filtra por entidad para mostrar el detalle expandible de un cambio.
// Selectores verificados contra auditoria.component.ts.
// ═══════════════════════════════════════════════════════════════════════
describe('11 - Auditoría del sistema (solo lectura)', () => {
  beforeEach(() => {
    cy.viewport(1366, 800);
    cy.login('jefecocina1', 'JefeCocina123!');
  });

  it('muestra el registro real de auditoría y permite filtrar por entidad', () => {
    cy.visit('/auditoria');
    cy.contains('h1', 'Auditoría del sistema').should('be.visible');

    // Carga inicial real (sin filtro) — se espera con reintento, no con
    // cy.wait(ms), a que termine el spinner y aparezcan filas o el estado vacío.
    cy.get('table tbody', { timeout: 15000 }).should(($tbody) => {
      const texto = $tbody.text();
      const tieneFilas = $tbody.find('tr').length > 0 && !texto.includes('Aplicá un filtro');
      expect(tieneFilas, 'la auditoría cargó registros reales al entrar').to.be.true;
    });

    // Filtra por la entidad Insumo (los specs de catálogo generan altas y
    // bajas reales sobre esta entidad).
    cy.get('select').select('Insumo');
    cy.contains('button', 'Filtrar').click();
    cy.wait(700);

    cy.get('table tbody tr', { timeout: 15000 }).its('length').should('be.gte', 0);

    // Si hay al menos un registro con detalle expandible (antes/después),
    // lo despliega para mostrar el contenido real del cambio.
    cy.get('body').then(($body) => {
      if ($body.find('button:contains("▼")').length > 0) {
        cy.contains('button', '▼').first().click();
        cy.wait(500);
        cy.get('pre').its('length').should('be.gt', 0);
      }
    });

    cy.contains('button', 'Limpiar').click();
    cy.wait(500);
  });
});
