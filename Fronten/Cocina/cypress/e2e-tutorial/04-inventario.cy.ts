// ═══════════════════════════════════════════════════════════════════════
// Capítulo 4 — Inventario y registro de mermas
//
// Inicia sesión como almacenero1 (rol ALMACENERO, sucursal fija Casa
// Matriz), revisa el stock real por insumo (FEFO) y registra una merma
// real contra un insumo con stock disponible. Selectores verificados
// contra inventario.component.ts y mermas.component.ts.
// ═══════════════════════════════════════════════════════════════════════
describe('04 - Inventario y mermas', () => {
  beforeEach(() => {
    cy.viewport(1366, 800);
    cy.login('almacenero1', 'Almacen123!');
  });

  it('muestra el stock real de insumos por sucursal (control FEFO)', () => {
    cy.visit('/inventario');
    cy.contains('h1', 'Inventario').should('be.visible');
    cy.contains('Control FEFO').should('be.visible');

    // La tabla de stock debe tener al menos una fila real de insumo.
    cy.get('table tbody tr', { timeout: 15000 }).should('have.length.greaterThan', 0);
    cy.get('table thead').within(() => {
      cy.contains('th', 'Insumo').should('be.visible');
      cy.contains('th', 'Stock actual').should('be.visible');
      cy.contains('th', 'Estado').should('be.visible');
    });

    // Buscador reactivo en vivo ("Buscar insumo..."): escribir en el campo
    // refiltra la tabla al instante (busqueda es un signal), sin recargar ni
    // paginar. Se toma el nombre real del primer insumo de la tabla y se
    // busca por sus primeras letras.
    cy.get('table tbody tr').its('length').then((totalFilas) => {
      cy.get('table tbody tr').first().find('td').eq(1).invoke('text').then((nombreCompleto) => {
        const termino = nombreCompleto.trim().slice(0, 4);

        cy.get('input[placeholder="Buscar insumo..."]').clear().type(termino);

        // La tabla se refiltra sola: todas las filas visibles contienen el término.
        cy.get('table tbody tr').should(($rows) => {
          expect($rows.length).to.be.greaterThan(0);
          $rows.each((_, row) => {
            expect(Cypress.$(row).text().toLowerCase()).to.include(termino.toLowerCase());
          });
        });

        // Limpiar el buscador restaura la lista completa (misma cantidad de antes).
        cy.get('input[placeholder="Buscar insumo..."]').clear();
        cy.get('table tbody tr').should('have.length', totalFilas);
      });
    });

    // Vista de vencimientos también es real (aunque esté vacía).
    cy.contains('button', 'Vencimientos').click();
    cy.wait(500);
    cy.get('body').should('not.contain', 'Cargando');
  });

  it('registra una merma real contra un insumo con stock disponible', () => {
    cy.visit('/mermas');
    cy.contains('h1', 'Registro de Mermas').should('be.visible');

    cy.contains('button', '+ Nueva Merma').click();
    cy.contains('h2', 'Registrar Merma').should('be.visible');
    cy.wait(600);

    // Todo lo siguiente se escopea al modal — la página de fondo también tiene
    // sus propios <select> (filtro de insumo) tapados por el overlay del modal.
    cy.contains('h2', 'Registrar Merma').parents('.card').first().within(() => {
      // Elegir el primer insumo real disponible en el select (tiene stock cargado por el backend).
      cy.get('select').first().find('option').its('length').should('be.gt', 1);
      cy.get('select').first().find('option').eq(1).then(($opt) => {
        const value = $opt.val() as string;
        cy.get('select').first().select(value);
      });

      cy.get('input[type="number"]').clear().type('0.5');

      // Causa real del catálogo fijo de mermas.component.ts.
      cy.get('select').eq(1).select('Deterioro por tiempo');

      cy.get('textarea').type('Merma registrada por el spec de Cypress (tutorial E2E).');

      cy.wait(500);
      cy.contains('button', 'Registrar Merma').click();
    });
    cy.wait(700);

    // Tras guardar, el modal se cierra y la nueva merma aparece en la tabla (orden desc por fecha/creación).
    cy.contains('h2', 'Registrar Merma').should('not.exist');
    cy.contains('td', 'Deterioro por tiempo', { timeout: 15000 }).should('be.visible');
  });
});
