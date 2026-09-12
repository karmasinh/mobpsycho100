// Chapter 3 — Clientes: crear y editar
// Logs in as admin, creates a new cliente through the real modal form in
// /clientes, then edits it and verifies the change is reflected in the table.
describe('03 - Clientes', () => {
  const nombre = `Cliente Cypress ${Date.now()}`;
  const nombreEditado = `${nombre} Editado`;
  // Unique 8-digit phone per run — the API rejects duplicate teléfono (409).
  const telefono = `7${String(Date.now()).slice(-7)}`;

  beforeEach(() => {
    cy.login('admin', 'admin123');
  });

  it('creates a new cliente', () => {
    cy.visit('/clientes');
    cy.contains('h1', 'Clientes').should('be.visible');

    cy.get('[data-cy="btn-nuevo-cliente"]').click();
    cy.wait(600);
    cy.contains('Nuevo Cliente').should('be.visible');

    cy.get('[data-cy="input-cliente-nombre"]').type(nombre, { delay: 60 });
    cy.get('[data-cy="input-cliente-telefono"]').type(telefono, { delay: 60 });
    cy.wait(500);
    cy.get('[data-cy="btn-guardar-cliente"]').click();

    cy.get('[data-cy="btn-guardar-cliente"]').should('not.exist');

    // The new cliente is appended at the end of the (unsorted, paginated)
    // list, so search for it by name instead of assuming it's on page 1.
    // Typed character-by-character (cy.type default) — the filtered list is
    // a computed() driven by the busqueda signal, so the table now filters
    // live as each keystroke lands, with no extra click needed.
    cy.get('input[aria-label="Buscar clientes"]').type(nombre, { delay: 60 });
    cy.contains('td', nombre, { timeout: 10000 }).should('be.visible');
  });

  it('edits the cliente just created', () => {
    // Depends on the "creates a new cliente" test above having run first in
    // this spec (same run) so the cliente exists.
    cy.visit('/clientes');
    cy.get('input[aria-label="Buscar clientes"]').type(nombre, { delay: 60 });
    cy.contains('td', nombre, { timeout: 10000 }).should('be.visible');

    cy.contains('tr', nombre).find('[data-cy="btn-editar-cliente"]').click();
    cy.wait(600);
    cy.contains('Editar Cliente').should('be.visible');

    cy.get('[data-cy="input-cliente-nombre"]').clear().type(nombreEditado, { delay: 60 });
    cy.wait(500);
    cy.get('[data-cy="btn-guardar-cliente"]').click();

    // Live reactive filter again: typing the edited name is enough, no click
    // on the column header is needed to force the computed() to re-evaluate.
    cy.get('input[aria-label="Buscar clientes"]').clear().type(nombreEditado, { delay: 60 });
    cy.contains('td', nombreEditado, { timeout: 10000 }).should('be.visible');
  });
});
