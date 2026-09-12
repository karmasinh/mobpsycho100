// Chapter 18 — Roles y Permisos: crear, editar permisos y dar de baja
//
// Admin-only screen. Reading roles.component.ts shows this UI actually
// supports full CRUD on a rol: "+ Nuevo rol" opens a modal that POSTs a
// brand-new rol (nombre + descripcion + a set of módulo checkboxes),
// "Editar" opens the same modal pre-filled and PUTs the change, and "Baja"
// calls rolSvc.desactivar() — a real soft-delete (backend sets activo=false,
// see RolService.desactivar() in api.service.ts). So — unlike what the
// "7 hardcoded roles" line in the architecture docs might suggest — this
// screen genuinely lets an admin create/edit/deactivate *custom* dynamic
// roles; the 7 seeded roles (ADMIN, GERENTE_SUCURSAL, etc.) are just
// existing seed data, not a UI restriction. Full CRUD is demonstrated below.
//
// guardar() uppercases the nombre before sending it to the backend
// (`this.form.nombre.trim().toUpperCase()`), so the card always displays the
// UPPERCASE version of whatever we type. The búsqueda box lowercases both
// sides of the comparison, so searching with the original mixed-case string
// still matches.
//
// No data-cy attributes exist anywhere in roles.component.ts, and none were
// added — every element here has a stable, unique placeholder/text/heading
// to select on (checked against the real template before writing this).
describe('18 - Roles', () => {
  const nombre = `Rol Cypress ${Date.now()}`;
  const nombreMostrado = nombre.toUpperCase();

  beforeEach(() => {
    cy.login('admin', 'admin123');
    cy.visit('/roles');
    cy.contains('h1', 'Roles y Permisos').should('be.visible');
  });

  it('creates a new rol with one módulo checked', () => {
    cy.contains('button', 'Nuevo rol').click();
    cy.wait(600);
    cy.contains('h3', 'Nuevo Rol').should('be.visible');

    cy.get('input[placeholder="Ej: CAJERO, GERENTE_SUCURSAL"]').type(nombre, { delay: 60 });
    cy.get('input[placeholder="Descripción del rol..."]')
      .type('Rol de prueba para el tutorial de Cypress', { delay: 60 });

    // Check the real first módulo from the live catalog — never hardcode a
    // módulo name, it's whatever ModuloMenuService returns from the backend.
    cy.contains('h3', 'Nuevo Rol').parent()
      .find('input[type="checkbox"]').should('have.length.greaterThan', 0);
    cy.contains('h3', 'Nuevo Rol').parent()
      .find('input[type="checkbox"]').eq(0).check();

    cy.wait(500);
    cy.contains('button', 'Guardar').click();

    cy.contains('Rol creado', { timeout: 10000 }).should('be.visible');
    cy.contains('h3', 'Nuevo Rol').should('not.exist');

    // New roles are appended at the end of the (unsorted) list, so search
    // for it by name instead of assuming it landed on page 1.
    cy.get('input[placeholder="Buscar rol..."]').type(nombre, { delay: 60 });
    cy.contains('.card', nombreMostrado, { timeout: 10000 }).should('be.visible');
  });

  it('edits the rol and adds a second módulo permission', () => {
    cy.get('input[placeholder="Buscar rol..."]').type(nombre, { delay: 60 });
    cy.contains('.card', nombreMostrado, { timeout: 10000 })
      .contains('button', 'Editar').click();
    cy.wait(600);
    cy.contains('h3', 'Editar Rol').should('be.visible');

    // Add a second módulo on top of the one selected at creation time — a
    // real permission change, not just re-saving the same state.
    cy.contains('h3', 'Editar Rol').parent()
      .find('input[type="checkbox"]').should('have.length.greaterThan', 1);
    cy.contains('h3', 'Editar Rol').parent()
      .find('input[type="checkbox"]').eq(1).check();

    cy.wait(500);
    cy.contains('button', 'Guardar').click();

    cy.contains('Rol actualizado', { timeout: 10000 }).should('be.visible');
    cy.contains('h3', 'Editar Rol').should('not.exist');

    cy.get('input[placeholder="Buscar rol..."]').clear().type(nombre, { delay: 60 });
    cy.contains('.card', nombreMostrado, { timeout: 10000 }).should('be.visible');
  });

  it('deactivates (soft-delete) the rol just created', () => {
    cy.get('input[placeholder="Buscar rol..."]').type(nombre, { delay: 60 });
    cy.contains('.card', nombreMostrado, { timeout: 10000 }).should('be.visible');

    // desactivar() calls window.confirm() first — Cypress auto-accepts
    // window.confirm() by default (it returns true without user input),
    // so no stub is required here.
    cy.contains('.card', nombreMostrado).contains('button', 'Baja').click();

    cy.contains('Rol desactivado', { timeout: 10000 }).should('be.visible');

    // Soft-delete effect: the card is NOT removed from the list (it's just
    // marked activo=false), so it flips from the "Activo" badge to
    // "Inactivo" and the "Baja" button disappears (only rendered while
    // rol.activo is true — see the @if (rol.activo) around it).
    cy.get('input[placeholder="Buscar rol..."]').clear().type(nombre, { delay: 60 });
    cy.contains('.card', nombreMostrado, { timeout: 10000 }).within(() => {
      cy.contains('Inactivo').should('be.visible');
      cy.contains('button', 'Baja').should('not.exist');
    });
  });
});
