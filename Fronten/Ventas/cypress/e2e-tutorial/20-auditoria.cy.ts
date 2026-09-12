// Chapter 20 — Auditoría: filtrar el registro inmutable
// Auditoría is read-only (see auditoria.component.ts: no create/edit/delete,
// only buscar()/limpiar() and client-side sort/search/expand-detalle). Only
// MOD_AUDITORIA-holding roles (ADMIN/GERENTE_SUCURSAL) see /auditoria — the
// seeded CAJERO does not — so this spec logs in as admin.
describe('20 - Auditoría', () => {
  beforeEach(() => {
    cy.login('admin', 'admin123');
    cy.visit('/auditoria');
    cy.contains('h1', 'Auditoría del sistema').should('be.visible');
  });

  it('loads the audit log and filters by usuario and entidad', () => {
    // ngOnInit() calls buscar() immediately (cargando signal flips true then
    // false); while true the tbody renders 5 skeleton <tr> placeholders, so a
    // plain "tbody tr" count would pass instantly on those. Wait for the
    // skeleton rows to be gone, THEN assert real rows landed.
    cy.get('table tbody .skeleton', { timeout: 15000 }).should('not.exist');
    cy.get('table tbody tr').should('have.length.greaterThan', 0);

    // Filtrar por usuario: the login we just did creates a real LOGIN audit
    // entry for "admin", so filtering by username always returns a hit.
    cy.get('input[placeholder="username..."]').type('admin', { delay: 60 });
    cy.wait(500);
    cy.contains('button', 'Filtrar').click();
    cy.get('table tbody .skeleton', { timeout: 10000 }).should('not.exist');
    cy.contains('td', 'admin', { timeout: 10000 }).should('be.visible');
    cy.wait(600);

    // Limpiar vuelve a traer el listado completo (buscar() sin filtroUsuario).
    cy.contains('button', 'Limpiar').click();
    cy.get('table tbody .skeleton', { timeout: 10000 }).should('not.exist');
    cy.get('table tbody tr').should('have.length.greaterThan', 0);
    cy.wait(600);

    // Filtrar por entidad "Usuario" (aplicado en el cliente sobre la lista ya
    // cargada) y confirmar que la columna Entidad muestra solo esa opción.
    // Scoped to the "Entidad" filter — a bare cy.get('select') also matches
    // the app shell's sucursal switcher <select> (admin has no fixed
    // sucursal), which made the raw selector ambiguous (2 elements).
    cy.contains('label', 'Entidad').parent().find('select').select('Usuario');
    cy.wait(500);
    cy.contains('button', 'Filtrar').click();
    cy.get('table tbody .skeleton', { timeout: 10000 }).should('not.exist');
    cy.get('table tbody tr').should('have.length.greaterThan', 0);
    cy.get('table tbody tr td:nth-child(4)').each($td => {
      cy.wrap($td).should('contain.text', 'Usuario');
    });
    cy.wait(600);

    // Búsqueda en vivo (computed() sobre busqueda signal) y expandir el
    // detalle antes/después de un registro si existe.
    cy.contains('button', 'Limpiar').click();
    cy.get('table tbody .skeleton', { timeout: 10000 }).should('not.exist');
    cy.get('table tbody tr').should('have.length.greaterThan', 0);
    cy.get('input[placeholder="Buscar en registros..."]').type('admin', { delay: 60 });
    cy.contains('td', 'admin', { timeout: 10000 }).should('be.visible');
    cy.wait(500);

    cy.get('body').then($body => {
      const $btn = $body.find('table tbody button[title="Ver cambios"]');
      if ($btn.length) {
        cy.wrap($btn.first()).click();
        cy.wait(600);
        // The expanded row only renders an "Antes" block when log.valorAnterior
        // is set (e.g. an UPDATE) — a CREATE-only entry shows just "Después".
        // Assert whichever real block the toggled row actually has instead of
        // assuming "Antes" is always present.
        cy.get('body').then($body2 => {
          expect($body2.text()).to.match(/Antes|Después/);
        });
      }
    });
  });
});
