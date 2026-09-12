// Chapter 4 — Pensionados: registrar y marcar asistencia
// Logs in as admin, registers a new pensionado (choosing a real plan and a
// real sucursal from the live selects) and then registers today's asistencia
// for that pensionado from the real side panel.
describe('04 - Pensionados', () => {
  const nombre = 'Cypress';
  const apellido = `Pensionado${Date.now()}`;

  beforeEach(() => {
    cy.login('admin', 'admin123');
    cy.visit('/pensionados');
    cy.contains('h1', 'Pensionados').should('be.visible');
  });

  it('registers a new pensionado with a sucursal and a plan', () => {
    cy.get('[data-cy="btn-nuevo-pensionado"]').click();
    cy.wait(600);
    cy.contains('Nuevo Pensionado').should('be.visible');

    cy.get('[data-cy="input-pensionado-nombre"]').type(nombre, { delay: 60 });
    cy.get('[data-cy="input-pensionado-apellido"]').type(apellido, { delay: 60 });
    cy.get('[data-cy="input-pensionado-cedula"]').type(String(Date.now()).slice(-8), { delay: 60 });

    // Real plan option (first one after the placeholder).
    cy.get('[data-cy="select-pensionado-tipo-almuerzo"] option').should('have.length.greaterThan', 1);
    cy.get('[data-cy="select-pensionado-tipo-almuerzo"]').find('option').eq(1)
      .then(opt => cy.get('[data-cy="select-pensionado-tipo-almuerzo"]').select(opt.val() as string));

    // Real sucursal (admin has no fixed sucursal, so this selector is shown).
    cy.get('body').then($body => {
      if ($body.find('[data-cy="select-pensionado-sucursal"]').length) {
        cy.get('[data-cy="select-pensionado-sucursal"] option').should('have.length.greaterThan', 1);
        cy.get('[data-cy="select-pensionado-sucursal"]').find('option').eq(1)
          .then(opt => cy.get('[data-cy="select-pensionado-sucursal"]').select(opt.val() as string));
      }
    });

    cy.get('[data-cy="input-pensionado-password"]').type('Pension123!', { delay: 60 });
    cy.wait(500);
    cy.get('[data-cy="btn-registrar-pensionado"]').click();

    cy.contains('Nuevo Pensionado').should('not.exist');
    cy.contains('td', `${nombre} ${apellido}`, { timeout: 10000 }).should('be.visible');
  });

  it('registers asistencia for the pensionado just created', () => {
    // The pensionado was created on a prior page load, so it now sits at
    // whichever page the backend's creation-order listing puts it on.
    // Search for it — typed character-by-character (cy.type default). The
    // filtered computed() reacts to the busqueda signal on every keystroke,
    // so the table narrows down live with no extra click needed.
    cy.get('input[placeholder="Buscar..."]').type(apellido, { delay: 60 });

    cy.contains('tr', apellido, { timeout: 10000 }).within(() => {
      cy.get('[data-cy="btn-ver-asistencia"]').click();
    });
    cy.wait(600);

    cy.contains(`Asistencia — ${nombre} ${apellido}`).should('be.visible');
    cy.get('[data-cy="btn-marcar-asistencia"]').click();

    cy.contains('Presente', { timeout: 10000 }).should('be.visible');
    cy.wait(700);
  });

  it('gives baja to the pensionado (soft-delete) and confirms the estado badge changes', () => {
    // Real "Baja" flow (pensionados.component.ts baja()): a native
    // window.confirm() gate, then PATCH via service.baja(id) which flips
    // estado from ACTIVO/REACTIVADO to BAJA_VOLUNTARIA — a soft-delete, the
    // pensionado stays in the list but its estado badge changes.
    cy.on('window:confirm', () => true);

    cy.get('input[placeholder="Buscar..."]').type(apellido, { delay: 60 });
    cy.contains('tr', apellido, { timeout: 10000 }).should('be.visible');

    cy.contains('tr', apellido).contains('button', 'Baja').click();
    cy.wait(700);

    // Visible effect: the same row now shows the "Baja voluntaria" badge
    // instead of "Activo", and the action button flips to "Reactivar".
    cy.contains('tr', apellido).contains('Baja voluntaria', { timeout: 10000 }).should('be.visible');
    cy.contains('tr', apellido).contains('button', 'Reactivar').should('be.visible');
    cy.wait(500);
  });
});
