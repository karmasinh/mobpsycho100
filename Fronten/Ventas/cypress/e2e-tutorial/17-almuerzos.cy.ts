// Chapter 17 — Tipos de Almuerzo: crear, editar y desactivar
// Logs in as admin, creates a new plan de almuerzo through the real modal
// form in /almuerzos (a grid of cards, not a table), edits it, then
// confirms desactivar() flips it to "Inactivo" (soft delete — see
// tipos-almuerzo.component.ts desactivar()).
//
// tipos-almuerzo is also used elsewhere: the pensionados tutorial
// (04-pensionados.cy.ts) picks the FIRST <option> of the live
// select-pensionado-tipo-almuerzo dropdown when registering a pensionado. A
// plan created here is appended at the end of the list, so it never becomes
// that first option — but to stay safe this spec only ever edits/deactivates
// the one plan it creates itself (name tagged "Plan Cypress <timestamp>"),
// never an existing seeded plan.
describe('17 - Tipos de Almuerzo', () => {
  const nombre = `Plan Cypress ${Date.now()}`;
  const nombreEditado = `${nombre} Editado`;
  const precio = '450';
  const descripcion = 'Plan mensual con almuerzo de lunes a viernes';

  beforeEach(() => {
    cy.login('admin', 'admin123');
  });

  it('creates a new tipo de almuerzo', () => {
    cy.visit('/almuerzos');
    cy.contains('h1', 'Tipos de Almuerzo').should('be.visible');

    cy.contains('button', '+ Nuevo plan').click();
    cy.wait(600);
    cy.contains('Nuevo plan de almuerzo').should('be.visible');

    cy.get('input[placeholder="Ej: Plan Completo, Plan Básico..."]').type(nombre, { delay: 60 });
    cy.get('input[placeholder="0.00"]').clear().type(precio, { delay: 60 });
    cy.get('textarea[placeholder="Descripción opcional del plan..."]').type(descripcion, { delay: 60 });
    cy.wait(500);
    cy.contains('button', 'Guardar').click();

    cy.contains('Nuevo plan de almuerzo').should('not.exist');

    // Appended at the end of the (unsorted, paginated) card grid — search by
    // name rather than assuming it lands on page 1.
    cy.get('input[placeholder="Buscar plan..."]').type(nombre, { delay: 60 });
    cy.contains('div.card', nombre, { timeout: 10000 }).should('be.visible');
    cy.contains('div.card', nombre).should('contain', 'Activo');
    cy.contains('div.card', nombre).should('contain', 'Bs 450.00');
  });

  it('edits the tipo de almuerzo just created', () => {
    // Depends on the "creates a new tipo de almuerzo" test above having run
    // first in this spec (same run) so the plan exists.
    cy.visit('/almuerzos');
    cy.get('input[placeholder="Buscar plan..."]').type(nombre, { delay: 60 });
    cy.contains('div.card', nombre, { timeout: 10000 }).should('be.visible');

    cy.contains('div.card', nombre).contains('button', 'Editar').click();
    cy.wait(600);
    cy.contains('Editar plan').should('be.visible');

    cy.get('input[placeholder="Ej: Plan Completo, Plan Básico..."]').clear().type(nombreEditado, { delay: 60 });
    cy.wait(500);
    cy.contains('button', 'Guardar').click();

    cy.contains('Editar plan').should('not.exist');

    cy.get('input[placeholder="Buscar plan..."]').clear().type(nombreEditado, { delay: 60 });
    cy.contains('div.card', nombreEditado, { timeout: 10000 }).should('be.visible');
  });

  it('deactivates only the tipo de almuerzo created by this spec', () => {
    cy.visit('/almuerzos');
    cy.get('input[placeholder="Buscar plan..."]').type(nombreEditado, { delay: 60 });
    cy.contains('div.card', nombreEditado, { timeout: 10000 }).should('be.visible');

    // window.confirm() from desactivar() is auto-accepted by Cypress by
    // default, so no stub is needed here.
    cy.contains('div.card', nombreEditado).contains('button', 'Desactivar').click();
    cy.wait(700);

    // Soft delete: the card stays visible (dimmed) with an "Inactivo" badge
    // and the "Desactivar" button disappears — pensionados already assigned
    // to this plan keep working, per the confirm() copy in the component.
    cy.contains('div.card', nombreEditado, { timeout: 10000 }).should('contain', 'Inactivo');
    cy.contains('div.card', nombreEditado).should('not.contain', 'Desactivar');
  });
});
