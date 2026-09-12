// Chapter 19 — Usuarios: alta de empleado/usuario, cambio de rol y contraseña, y baja
//
// IMPORTANT finding from reading usuarios.component.ts in full: this screen
// is EDIT-ONLY. It lists empleados that already have a usuario account and
// lets an admin reassign their rol (abrirCambiarRol -> guardarRol, PATCH
// .../empleados/usuarios/{id}/rol/{rolId}), reset their password
// (abrirPassword -> guardarPassword, PATCH .../password) or desbloquear a
// BLOQUEADO account. There is no "+ Nuevo usuario" button and no
// delete/desactivar action anywhere in its template — confirmed by reading
// the whole component, not assumed.
//
// The actual create/delete of a usuario account lives one screen over, in
// empleados.component.ts (/empleados — subtitle "Creación de usuario
// automática"): creating an empleado there also creates its usuario
// (username + initial password) via EmpleadoAdminService's shared backend
// endpoint, and its "Desactivar" action soft-deletes the empleado AND its
// usuario together (see the confirm() text: "Su usuario también quedará
// inactivo."). So this spec demonstrates the real, full CRUD story by
// combining both real screens: /empleados for create + delete (the only
// place those exist), and /usuarios for the edit actions that screen
// actually owns (rol change, password reset) — this matches the actual
// traceability chain of the feature, not a single component in isolation.
//
// No data-cy attributes exist in either component, and none were added —
// every field/button below is matched by its real, unique placeholder,
// label text or button text (verified against both templates first).
describe('19 - Usuarios', () => {
  const nombre = 'Cypress';
  const apellido = `Usuario${Date.now()}`;
  const username = `cypress.${Date.now()}`;
  const ciNueva = String(Date.now()).slice(-8);

  beforeEach(() => {
    cy.login('admin', 'admin123');
  });

  it('creates a new empleado from /empleados (auto-creates its usuario)', () => {
    cy.visit('/empleados');
    cy.contains('h1', 'Empleados').should('be.visible');

    cy.contains('button', 'Nuevo empleado').click();
    cy.wait(600);
    cy.contains('Nuevo empleado').should('be.visible');

    cy.get('input[placeholder="Juan"]').type(nombre, { delay: 60 });
    cy.get('input[placeholder="Pérez"]').type(apellido, { delay: 60 });
    cy.get('input[placeholder="12345678"]').type(ciNueva, { delay: 60 });
    cy.get('input[placeholder="Cocinero, Cajero, etc."]').type('Cajero Tarija Cypress', { delay: 60 });

    // Real sucursal and rol, picked from the live <select> options — never
    // hardcode a sucursal/rol name, it comes from the backend catalog.
    cy.contains('label', 'Sucursal').parent().find('select').find('option')
      .should('have.length.greaterThan', 1);
    cy.contains('label', 'Sucursal').parent().find('select').find('option').eq(1)
      .then(opt => cy.contains('label', 'Sucursal').parent().find('select').select(opt.val() as string));

    cy.contains('label', 'Rol del sistema').parent().find('select').find('option')
      .should('have.length.greaterThan', 1);
    cy.contains('label', 'Rol del sistema').parent().find('select').find('option').eq(1)
      .then(opt => cy.contains('label', 'Rol del sistema').parent().find('select').select(opt.val() as string));

    cy.get('input[placeholder="Auto: nombre.apellido"]').type(username, { delay: 60 });
    cy.get('input[placeholder="Mínimo 6 caracteres"]').type('Cypress123', { delay: 60 });

    cy.wait(500);
    cy.contains('button', 'Crear empleado y usuario').click();

    cy.contains('Empleado creado', { timeout: 10000 }).should('be.visible');
    // Scoped to the modal heading, not the "+ Nuevo empleado" button — that
    // button's own text also contains "Nuevo empleado" and stays on the page.
    cy.contains('h3', 'Nuevo empleado').should('not.exist');

    cy.get('input[placeholder="Buscar nombre o CI..."]').type(apellido, { delay: 60 });
    cy.contains('td', `${nombre} ${apellido}`, { timeout: 10000 }).should('be.visible');
  });

  it('edits the rol and resets the password for that usuario from /usuarios', () => {
    cy.visit('/usuarios');
    cy.contains('h1', 'Usuarios del Sistema').should('be.visible');

    cy.get('input[placeholder="Buscar usuario..."]').type(apellido, { delay: 60 });
    cy.contains('tr', apellido, { timeout: 10000 }).should('be.visible');

    // Change rol — pick a real rol different from the one assigned at
    // creation (index 1), from the live <select> inside the modal.
    cy.contains('tr', apellido).contains('button', 'Rol').click();
    cy.wait(600);
    cy.contains('Cambiar Rol', { timeout: 10000 }).should('be.visible');
    // Scoped to the "Nuevo rol" field inside the modal — a bare cy.get('select')
    // also matches the app shell's sucursal switcher <select> (admin has no
    // fixed sucursal), which made the raw selector ambiguous (2 elements).
    cy.contains('label', 'Nuevo rol').parent().find('select').find('option')
      .should('have.length.greaterThan', 2);
    cy.contains('label', 'Nuevo rol').parent().find('select').find('option').eq(2)
      .then(opt => cy.contains('label', 'Nuevo rol').parent().find('select').select(opt.val() as string));
    cy.wait(500);
    cy.contains('button', 'Aplicar').click();

    cy.contains('Rol actualizado', { timeout: 10000 }).should('be.visible');

    // Reset the password from the same screen.
    cy.get('input[placeholder="Buscar usuario..."]').clear().type(apellido, { delay: 60 });
    cy.contains('tr', apellido).contains('button', 'Pass').click();
    cy.wait(600);
    cy.contains('Cambiar Contraseña', { timeout: 10000 }).should('be.visible');
    cy.get('input[placeholder="Mínimo 8 caracteres"]').type('CypressNueva123', { delay: 60 });
    cy.wait(500);
    cy.contains('button', 'Cambiar').click();

    cy.contains('Contraseña actualizada', { timeout: 10000 }).should('be.visible');
  });

  it('deactivates the empleado from /empleados and confirms the soft-delete effect', () => {
    cy.visit('/empleados');
    cy.get('input[placeholder="Buscar nombre o CI..."]').type(apellido, { delay: 60 });
    cy.contains('tr', apellido, { timeout: 10000 }).should('be.visible');

    // desactivar() calls window.confirm() first — Cypress auto-accepts
    // window.confirm() by default (it returns true without user input),
    // so no stub is required here.
    cy.contains('tr', apellido).contains('button', 'Desactivar').click();

    cy.contains('Empleado desactivado', { timeout: 10000 }).should('be.visible');

    // Real soft-delete effect, verified against GET /empleados (curl with an
    // admin token returned only estado=ACTIVO rows): EmpleadoService.listar()
    // hits the same active-filtered endpoint the list table binds to, so once
    // desactivar() succeeds and cargarDatos() reloads, the row disappears
    // from this table entirely — it does not stay with an "Inactivo" badge
    // (that visual pattern only applies to proveedores/categorías/tipos de
    // almuerzo, which do have a "todos" endpoint the UI reads from).
    cy.get('input[placeholder="Buscar nombre o CI..."]').clear().type(apellido, { delay: 60 });
    cy.contains('Sin empleados registrados', { timeout: 10000 }).should('be.visible');

    // /usuarios (usuarios.component.ts) is fed by that same EmpleadoService.listar()
    // call, so the deactivated empleado disappears from there too — not shown
    // as "Inactivo", simply no longer listed.
    cy.visit('/usuarios');
    cy.get('input[placeholder="Buscar usuario..."]').type(apellido, { delay: 60 });
    cy.contains('No se encontraron usuarios', { timeout: 10000 }).should('be.visible');
  });
});
