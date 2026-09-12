// Chapter 15 — Proveedores: crear, editar y dar de baja
// Logs in as admin, registers a new proveedor through the real modal form in
// /proveedores, edits it, then confirms desactivar() flips it to "Inactivo"
// (soft delete — the backend never removes the row, see
// proveedores.component.ts desactivar()/svc.desactivar()).
describe('15 - Proveedores', () => {
  const nombre = `Distribuidora Cypress ${Date.now()}`;
  const nombreEditado = `${nombre} SRL`;
  // Bolivian NIT-like number, unique per run.
  const nit = String(Date.now()).slice(-9);
  // Tarija-area cell format (76x/77x + 5 digits = 8 digits total).
  const telefono = `766${String(Date.now()).slice(-5)}`;
  const correo = `contacto.cypress.${Date.now()}@proveedores.bo`;
  const contacto = 'Rolando Vaca Guzmán';
  const direccion = 'Av. Las Américas, Tarija';

  beforeEach(() => {
    cy.login('admin', 'admin123');
  });

  it('creates a new proveedor', () => {
    cy.visit('/proveedores');
    cy.contains('h1', 'Proveedores').should('be.visible');

    cy.contains('button', '+ Nuevo').click();
    cy.wait(600);
    cy.contains('Nuevo Proveedor').should('be.visible');

    cy.get('input[placeholder="Nombre del proveedor"]').type(nombre, { delay: 60 });
    cy.get('input[placeholder="12345678"]').type(nit, { delay: 60 });
    cy.get('input[placeholder="79xxxxxx"]').type(telefono, { delay: 60 });
    cy.get('input[placeholder="correo@proveedor.com"]').type(correo, { delay: 60 });
    cy.get('input[placeholder="Nombre del contacto"]').type(contacto, { delay: 60 });
    cy.get('input[placeholder="Dirección del proveedor"]').type(direccion, { delay: 60 });
    cy.wait(500);
    cy.contains('button', 'Guardar').click();

    cy.contains('Nuevo Proveedor').should('not.exist');

    // Appended at the end of the (unsorted, paginated) list — search by name
    // like the clientes tutorial does, rather than assuming page 1.
    cy.get('input[placeholder="Buscar proveedor..."]').type(nombre, { delay: 60 });
    cy.contains('tr', nombre, { timeout: 10000 }).should('be.visible');
    cy.contains('tr', nombre).should('contain', 'Activo');
  });

  it('edits the proveedor just created', () => {
    // Depends on the "creates a new proveedor" test above having run first in
    // this spec (same run) so the proveedor exists.
    cy.visit('/proveedores');
    cy.get('input[placeholder="Buscar proveedor..."]').type(nombre, { delay: 60 });
    cy.contains('tr', nombre, { timeout: 10000 }).should('be.visible');

    cy.contains('tr', nombre).contains('button', 'Editar').click();
    cy.wait(600);
    cy.contains('Editar Proveedor').should('be.visible');

    cy.get('input[placeholder="Nombre del proveedor"]').clear().type(nombreEditado, { delay: 60 });
    cy.wait(500);
    cy.contains('button', 'Guardar').click();

    cy.contains('Editar Proveedor').should('not.exist');

    cy.get('input[placeholder="Buscar proveedor..."]').clear().type(nombreEditado, { delay: 60 });
    cy.contains('tr', nombreEditado, { timeout: 10000 }).should('be.visible');
  });

  it('gives the proveedor de baja (soft delete)', () => {
    cy.visit('/proveedores');
    cy.get('input[placeholder="Buscar proveedor..."]').type(nombreEditado, { delay: 60 });
    cy.contains('tr', nombreEditado, { timeout: 10000 }).should('be.visible');

    // window.confirm() from desactivar() is auto-accepted by Cypress by
    // default, so no stub is needed here.
    cy.contains('tr', nombreEditado).contains('button', 'Baja').click();
    cy.wait(700);

    // Soft delete: the row stays visible (dimmed) with an "Inactivo" badge
    // and the "Baja" button disappears — it is not removed from the list.
    cy.contains('tr', nombreEditado, { timeout: 10000 }).should('contain', 'Inactivo');
    cy.contains('tr', nombreEditado).should('not.contain', 'Baja');
  });
});
