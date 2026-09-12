// Chapter 14 — Sucursales: crear, editar y desactivar
// Logs in as admin, creates a new sucursal through the real modal form in
// /sucursales (a grid of cards, not a table), edits it, then confirms
// desactivar() flips it to "Inactiva". Unlike empleados, SucursalService
// reads from GET /sucursales/todas (which returns every sucursal regardless
// of estado) and desactivar() just flips `activo` optimistically in the
// signal (see sucursales.component.ts desactivar()), so the card itself
// stays visible — dimmed, with an "Inactiva" badge and no "Desactivar"
// button anymore.
describe('14 - Sucursales', () => {
  const nombre = `Sucursal San Jorge ${Date.now()}`;
  const nombreEditado = `${nombre} Editada`;
  const direccion = 'Av. Las Américas, zona San Jorge, Tarija';
  // Tarija-area landline format (4 + 6 digits).
  const telefono = `4664${String(Date.now()).slice(-3)}`;

  beforeEach(() => {
    cy.login('admin', 'admin123');
  });

  it('creates a new sucursal with Tarija address and phone', () => {
    cy.visit('/sucursales');
    cy.contains('h1', 'Sucursales').should('be.visible');

    cy.contains('button', '+ Nueva sucursal').click();
    cy.wait(600);
    cy.contains('Nueva Sucursal').should('be.visible');

    cy.get('input[placeholder="Sucursal Centro, Sucursal Norte..."]').type(nombre, { delay: 60 });
    cy.get('input[placeholder="Av. Principal #123"]').type(direccion, { delay: 60 });
    cy.get('input[type="tel"]').type(telefono, { delay: 60 });
    cy.wait(500);
    cy.contains('button', 'Guardar').click();

    cy.contains('Nueva Sucursal').should('not.exist');

    // Appended at the end of the (unsorted, paginated) card grid — search by
    // name rather than assuming it lands on page 1.
    cy.get('input[placeholder="Buscar sucursal..."]').type(nombre, { delay: 60 });
    cy.contains('div.card', nombre, { timeout: 10000 }).should('be.visible');
    cy.contains('div.card', nombre).should('contain', 'Activa');
    cy.contains('div.card', nombre).should('contain', direccion);
  });

  it('edits the sucursal just created and then desactivates it', () => {
    // Depends on the "creates a new sucursal" test above having run first in
    // this spec (same run) so the sucursal exists.
    cy.visit('/sucursales');
    cy.get('input[placeholder="Buscar sucursal..."]').type(nombre, { delay: 60 });
    cy.contains('div.card', nombre, { timeout: 10000 }).should('be.visible');

    cy.contains('div.card', nombre).contains('button', 'Editar').click();
    cy.wait(600);
    cy.contains('Editar Sucursal').should('be.visible');

    cy.get('input[placeholder="Sucursal Centro, Sucursal Norte..."]').clear().type(nombreEditado, { delay: 60 });
    cy.wait(500);
    cy.contains('button', 'Guardar').click();

    cy.contains('Editar Sucursal').should('not.exist');

    cy.get('input[placeholder="Buscar sucursal..."]').clear().type(nombreEditado, { delay: 60 });
    cy.contains('div.card', nombreEditado, { timeout: 10000 }).should('be.visible');

    // window.confirm() from desactivar() is auto-accepted by Cypress by
    // default, so no stub is needed here.
    cy.contains('div.card', nombreEditado).contains('button', 'Desactivar').click();
    cy.wait(700);

    // Soft delete: the card stays visible (dimmed) with an "Inactiva" badge
    // and its "Desactivar" button is gone (desactivar() only shows for
    // s.activo === true).
    cy.contains('div.card', nombreEditado, { timeout: 10000 }).should('contain', 'Inactiva');
    cy.contains('div.card', nombreEditado).find('button').should('have.length', 1);
    cy.contains('div.card', nombreEditado).contains('button', 'Editar').should('be.visible');
  });
});
