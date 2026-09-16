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
});

// Chapter 4b — Ciclo prepago de 26 días (DEC-A-029, modo alternativo al cobro mensual)
// Registra un pensionado nuevo en modo CICLO_26D, marca una asistencia real
// (confirmando el decremento de días) y renueva el ciclo, verificando el
// mensaje exacto tomado del documento oficial de evaluación.
describe('04b - Pensionados: ciclo prepago de 26 días', () => {
  const nombre = 'Cypress';
  const apellido = `Ciclo${Date.now()}`;

  beforeEach(() => {
    cy.login('admin', 'admin123');
    cy.visit('/pensionados');
    cy.contains('h1', 'Pensionados').should('be.visible');
  });

  it('registra un pensionado en modo Ciclo prepago de 26 días', () => {
    cy.get('[data-cy="btn-nuevo-pensionado"]').click();
    cy.wait(600);
    cy.contains('Nuevo Pensionado').should('be.visible');

    cy.get('[data-cy="input-pensionado-nombre"]').type(nombre, { delay: 60 });
    cy.get('[data-cy="input-pensionado-apellido"]').type(apellido, { delay: 60 });
    cy.get('[data-cy="input-pensionado-cedula"]').type(String(Date.now()).slice(-8), { delay: 60 });

    cy.get('[data-cy="select-pensionado-tipo-almuerzo"] option').should('have.length.greaterThan', 1);
    cy.get('[data-cy="select-pensionado-tipo-almuerzo"]').find('option').eq(1)
      .then(opt => cy.get('[data-cy="select-pensionado-tipo-almuerzo"]').select(opt.val() as string));

    cy.get('body').then($body => {
      if ($body.find('[data-cy="select-pensionado-sucursal"]').length) {
        cy.get('[data-cy="select-pensionado-sucursal"] option').should('have.length.greaterThan', 1);
        cy.get('[data-cy="select-pensionado-sucursal"]').find('option').eq(1)
          .then(opt => cy.get('[data-cy="select-pensionado-sucursal"]').select(opt.val() as string));
      }
    });

    cy.get('[data-cy="select-pensionado-modo-facturacion"]').select('CICLO_26D');
    cy.get('[data-cy="input-pensionado-password"]').type('Ciclo123!', { delay: 60 });
    cy.wait(500);
    cy.get('[data-cy="btn-registrar-pensionado"]').click();

    cy.contains('Nuevo Pensionado').should('not.exist');
    cy.contains('td', `${nombre} ${apellido}`, { timeout: 10000 }).should('be.visible');
  });

  it('marca una asistencia real y confirma que el ciclo consume un día', () => {
    cy.get('input[placeholder="Buscar..."]').type(apellido, { delay: 60 });

    cy.contains('tr', apellido, { timeout: 10000 }).within(() => {
      cy.get('[data-cy="btn-ver-ciclo"]').click();
    });
    cy.wait(600);
    cy.contains(`Ciclo — ${nombre} ${apellido}`).should('be.visible');
    cy.contains('Días consumidos: 0').should('be.visible');
    cy.contains('Días disponibles: 26').should('be.visible');
    // El panel lateral no cierra con Escape (no tiene ese listener) — se
    // cierra con su botón "×" real (icono line-md:close), igual que haría
    // un usuario.
    cy.get('.fixed.inset-0.z-50').find('button.btn-ghost').first().click();
    cy.contains(`Ciclo — ${nombre} ${apellido}`).should('not.exist');

    cy.get('input[placeholder="Buscar..."]').clear().type(apellido, { delay: 60 });
    cy.contains('tr', apellido, { timeout: 10000 }).within(() => {
      cy.get('[data-cy="btn-ver-asistencia"]').click();
    });
    cy.wait(600);
    cy.get('[data-cy="btn-marcar-asistencia"]').click();
    cy.contains('Presente', { timeout: 10000 }).should('be.visible');
    cy.get('.fixed.inset-0.z-50').find('button.btn-ghost').first().click();
    cy.get('.fixed.inset-0.z-50').should('not.exist');

    cy.get('input[placeholder="Buscar..."]').clear().type(apellido, { delay: 60 });
    cy.contains('tr', apellido, { timeout: 10000 }).within(() => {
      cy.get('[data-cy="btn-ver-ciclo"]').click();
    });
    cy.wait(600);
    cy.contains('Días consumidos: 1', { timeout: 10000 }).should('be.visible');
    cy.contains('Días disponibles: 25').should('be.visible');
  });

  it('renueva el ciclo y muestra el mensaje exacto del documento oficial', () => {
    cy.get('input[placeholder="Buscar..."]').type(apellido, { delay: 60 });
    cy.contains('tr', apellido, { timeout: 10000 }).within(() => {
      cy.get('[data-cy="btn-ver-ciclo"]').click();
    });
    cy.wait(600);

    cy.get('[data-cy="btn-renovar-ciclo"]').click();
    cy.contains('Renovar Pensión').should('be.visible');
    cy.wait(500);
    cy.get('[data-cy="input-renovar-monto"]').type('350', { delay: 60 });
    cy.get('[data-cy="btn-confirmar-renovar-ciclo"]').click();

    cy.contains('Pensión renovada correctamente. Nuevo ciclo iniciado con 26 días disponibles.', { timeout: 10000 })
      .should('be.visible');
    cy.contains('Días consumidos: 0', { timeout: 10000 }).should('be.visible');
    cy.contains('Monto pagado: Bs 350.00').should('be.visible');
  });
});
