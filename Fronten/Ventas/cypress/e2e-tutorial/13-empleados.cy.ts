// Chapter 13 — Empleados: crear, editar y desactivar
// Logs in as admin, creates a new empleado through the real modal form in
// /empleados (which also auto-creates a system user for them — see the
// header note "Creación de usuario automática" and guardar() in
// empleados.component.ts), edits it (cargo change), then desactiva it.
// NOTE: EmpleadoRequest.passwordInicial has no @NotBlank server-side (see
// its javadoc: "actualizar() nunca toca la contraseña del usuario"), and the
// edit modal doesn't render the password field at all while editando() is
// true, so a real edit here completes normally with a 200 — there is no
// backend validation error to demonstrate on this screen.
// desactivar() calls DELETE /empleados/{id} which sets estado=INACTIVO server-side
// (EmpleadoServiceImpl.desactivar()); the list is loaded from GET /empleados
// which only returns ACTIVOs (listarActivos()), so after desactivar + reload
// the row disappears from this active-filtered table entirely (no "Inactivo"
// badge stays visible, unlike categorías/proveedores).
describe('13 - Empleados', () => {
  const nombre = 'Mauricio';
  const apellido = 'Vaca Guzmán';
  // Unique 8-digit CI per run — the API rejects a duplicate CI (409).
  const ci = String(Date.now()).slice(-8);
  // Tarija-area mobile format (76x/77x + 5 digits).
  const telefono = `767${String(Date.now()).slice(-5)}`;
  // Custom username so re-runs never collide on the auto nombre.apellido one.
  const username = `mvaca.cy${String(Date.now()).slice(-6)}`;
  const cargo = 'Cajero';
  const cargoEditado = 'Cajero Senior';

  beforeEach(() => {
    cy.login('admin', 'admin123');
  });

  it('creates a new empleado with a real sucursal and rol', () => {
    cy.visit('/empleados');
    cy.contains('h1', 'Empleados').should('be.visible');

    cy.contains('button', '+ Nuevo empleado').click();
    cy.wait(600);
    cy.contains('Nuevo empleado').should('be.visible');

    cy.get('input[placeholder="Juan"]').type(nombre, { delay: 60 });
    cy.get('input[placeholder="Pérez"]').type(apellido, { delay: 60 });
    cy.get('input[placeholder="12345678"]').type(ci, { delay: 60 });
    cy.get('input[type="tel"]').type(telefono, { delay: 60 });
    cy.get('input[type="email"]').type(`${username}@sistemadesk.test`, { delay: 60 });
    cy.get('input[placeholder="Cocinero, Cajero, etc."]').type(cargo, { delay: 60 });

    // Real sucursal (first option after the "Seleccionar..." placeholder).
    cy.get('[data-cy="select-empleado-sucursal"] option').should('have.length.greaterThan', 1);
    cy.get('[data-cy="select-empleado-sucursal"]').find('option').eq(1)
      .then(opt => cy.get('[data-cy="select-empleado-sucursal"]').select(opt.val() as string));

    // Real rol (first option after the "Seleccionar rol..." placeholder).
    cy.get('[data-cy="select-empleado-rol"] option').should('have.length.greaterThan', 1);
    cy.get('[data-cy="select-empleado-rol"]').find('option').eq(1)
      .then(opt => cy.get('[data-cy="select-empleado-rol"]').select(opt.val() as string));

    cy.get('input[placeholder="Auto: nombre.apellido"]').type(username, { delay: 60 });
    cy.get('input[type="password"]').type('Cypress123!', { delay: 60 });

    cy.wait(500);
    cy.contains('button', 'Crear empleado y usuario').click();

    cy.contains('button', 'Crear empleado y usuario').should('not.exist');

    // Appended at the end of the (unsorted, paginated) list — search by CI
    // instead of assuming it lands on page 1. Typed character-by-character
    // (cy.type default) so the live busqueda-driven computed() filters as we
    // go, no extra click needed.
    cy.get('input[placeholder="Buscar nombre o CI..."]').type(ci, { delay: 60 });
    cy.contains('td', ci, { timeout: 10000 }).should('be.visible');
    cy.contains('tr', ci).should('contain.text', 'ACTIVO');
    cy.wait(700);
  });

  it('edits the empleado just created and then desactivates it', () => {
    // Depends on the "creates a new empleado" test above having run first in
    // this spec (same run) so the empleado exists.
    cy.visit('/empleados');
    cy.get('input[placeholder="Buscar nombre o CI..."]').type(ci, { delay: 60 });
    cy.contains('td', ci, { timeout: 10000 }).should('be.visible');

    cy.contains('tr', ci).contains('button', 'Editar').click();
    cy.wait(600);
    cy.contains('Editar empleado').should('be.visible');

    cy.get('input[placeholder="Cocinero, Cajero, etc."]').clear().type(cargoEditado, { delay: 60 });

    // editarEmpleado() always resets form.rolId to null even though it's a
    // required field (see empleados.component.ts), so the rol has to be
    // re-picked here or guardar() blocks with a validation error.
    cy.get('[data-cy="select-empleado-rol"] option').should('have.length.greaterThan', 1);
    cy.get('[data-cy="select-empleado-rol"]').find('option').eq(1)
      .then(opt => cy.get('[data-cy="select-empleado-rol"]').select(opt.val() as string));

    // The "Contraseña inicial" field only renders inside the template's
    // `@if (!editando())` block, so it doesn't exist at all while editing.
    // That's fine here: EmpleadoRequest.passwordInicial has no server-side
    // @NotBlank, and actualizar() never touches the user's password anyway.
    cy.get('input[type="password"]').should('not.exist');

    cy.wait(500);
    cy.contains('button', 'Actualizar').click();

    cy.contains('button', 'Actualizar').should('not.exist');
    cy.wait(700);

    cy.get('input[placeholder="Buscar nombre o CI..."]').clear().type(ci, { delay: 60 });
    cy.contains('tr', ci, { timeout: 10000 }).should('contain.text', cargoEditado);

    // window.confirm() from desactivar() is auto-accepted by Cypress by
    // default, so no stub is needed here.
    cy.contains('tr', ci).contains('button', 'Desactivar').click();
    cy.wait(700);

    // Soft delete via an active-filtered list: unlike categorías/proveedores
    // (which flip a visible badge and stay in the grid), GET /empleados only
    // ever returns ACTIVOs, so the just-desactivated empleado now disappears
    // from the table completely once the list reloads.
    cy.get('input[placeholder="Buscar nombre o CI..."]').clear().type(ci, { delay: 60 });
    cy.contains('Sin empleados registrados', { timeout: 10000 }).should('be.visible');
  });
});
