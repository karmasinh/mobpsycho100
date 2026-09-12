// Chapter 16 — Categorías de Plato: crear, editar y dar de baja
// Logs in as admin, creates a new categoría de plato through the real modal
// form in /categorias (a grid of cards, not a table), edits it, then
// confirms desactivar() flips it to "Inactivo" — a soft delete, the row stays
// in the grid with an "Alta" button to reactivate it (see
// categorias-plato.component.ts desactivar()/activar()).
describe('16 - Categorias de Plato', () => {
  const nombre = `Categoria Cypress ${Date.now()}`;
  const nombreEditado = `${nombre} Editada`;
  const descripcion = 'Platos tradicionales tarijeños de la casa';

  beforeEach(() => {
    cy.login('admin', 'admin123');
  });

  it('creates a new categoria de plato', () => {
    cy.visit('/categorias');
    cy.contains('h1', 'Categorías de Platos').should('be.visible');

    cy.contains('button', '+ Nueva').click();
    cy.wait(600);
    cy.contains('Nueva Categoría de Plato').should('be.visible');

    cy.get('input[placeholder="Ej: Almuerzos, Bebidas, Antojos de la tarde"]').type(nombre, { delay: 60 });
    cy.get('textarea[placeholder="Descripción de la categoría..."]').type(descripcion, { delay: 60 });
    cy.wait(500);
    cy.contains('button', 'Guardar').click();

    cy.contains('Nueva Categoría de Plato').should('not.exist');

    // Appended at the end of the (unsorted, paginated) card grid — search by
    // name rather than assuming it lands on page 1.
    cy.get('input[placeholder="Buscar categoría..."]').type(nombre, { delay: 60 });
    cy.contains('div.card', nombre, { timeout: 10000 }).should('be.visible');
    cy.contains('div.card', nombre).should('contain', 'Activo');
  });

  it('edits the categoria just created', () => {
    // Depends on the "creates a new categoria de plato" test above having run
    // first in this spec (same run) so the categoria exists.
    cy.visit('/categorias');
    cy.get('input[placeholder="Buscar categoría..."]').type(nombre, { delay: 60 });
    cy.contains('div.card', nombre, { timeout: 10000 }).should('be.visible');

    cy.contains('div.card', nombre).contains('button', 'Editar').click();
    cy.wait(600);
    cy.contains('Editar Categoría').should('be.visible');

    cy.get('input[placeholder="Ej: Almuerzos, Bebidas, Antojos de la tarde"]').clear().type(nombreEditado, { delay: 60 });
    cy.wait(500);
    cy.contains('button', 'Guardar').click();

    cy.contains('Editar Categoría').should('not.exist');

    cy.get('input[placeholder="Buscar categoría..."]').clear().type(nombreEditado, { delay: 60 });
    cy.contains('div.card', nombreEditado, { timeout: 10000 }).should('be.visible');
  });

  it('gives the categoria de baja (soft delete)', () => {
    cy.visit('/categorias');
    cy.get('input[placeholder="Buscar categoría..."]').type(nombreEditado, { delay: 60 });
    cy.contains('div.card', nombreEditado, { timeout: 10000 }).should('be.visible');

    // window.confirm() from desactivar() is auto-accepted by Cypress by
    // default, so no stub is needed here.
    cy.contains('div.card', nombreEditado).contains('button', 'Baja').click();
    cy.wait(700);

    // Soft delete: the card stays visible (dimmed) with an "Inactivo" badge
    // and the "Baja" button is replaced by an "Alta" (reactivate) button.
    cy.contains('div.card', nombreEditado, { timeout: 10000 }).should('contain', 'Inactivo');
    cy.contains('div.card', nombreEditado).contains('button', 'Alta').should('be.visible');
  });
});
