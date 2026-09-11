// ═══════════════════════════════════════════════════════════════════════
// Capítulo 2 — Producción del día
//
// Inicia sesión como jefecocina1 (rol JEFE_COCINA, sucursal fija Casa
// Matriz), planifica la producción del día si todavía no existe, la pasa a
// "En curso" y registra el avance real de producción de una línea.
// Selectores verificados contra produccion.component.ts.
// ═══════════════════════════════════════════════════════════════════════
describe('02 - Producción del día', () => {
  beforeEach(() => {
    cy.viewport(1366, 800);
    cy.login('jefecocina1', 'JefeCocina123!');
    cy.visit('/produccion');
    cy.contains('h1', 'Producción del día').should('be.visible');
  });

  it('planifica el día (si hace falta), inicia producción y registra el avance', () => {
    // Esperar a que termine el skeleton de carga.
    cy.get('.skeleton', { timeout: 15000 }).should('not.exist');

    cy.get('body').then(($body) => {
      const sinPlan = $body.text().includes('No hay plan de producción para hoy');

      if (sinPlan) {
        cy.contains('button', '+ Planificar día de hoy').click();
        cy.contains('h3', 'Planificar producción').should('be.visible');
        cy.wait(600);

        // Sopa: agregar línea y elegir la primera sopa disponible.
        cy.contains('p', 'Sopas').parent().contains('button', '+ Agregar').click();
        cy.get('select').first().find('option').then(($opts) => {
          const value = $opts.filter((_, o) => o.value !== '').first().val() as string;
          cy.get('select').first().select(value);
        });

        // Segundo: agregar línea y elegir el primer segundo disponible.
        cy.contains('p', 'Segundos').parent().contains('button', '+ Agregar').click();
        cy.get('select').eq(1).find('option').then(($opts) => {
          const value = $opts.filter((_, o) => o.value !== '').first().val() as string;
          cy.get('select').eq(1).select(value);
        });

        cy.wait(500);
        cy.contains('button', 'Guardar plan').click();
        cy.wait(700);
        cy.contains('h3', 'Planificar producción').should('not.exist');
      }
    });

    // Ahora debe existir un plan del día (recién creado o preexistente).
    cy.contains('h1', 'Producción del día').should('be.visible');
    cy.get('.card', { timeout: 15000 }).should('exist');

    // Si está solo "Planificado", iniciar producción para poder registrar avance.
    cy.get('body').then(($body) => {
      if ($body.text().includes('▶ Iniciar producción')) {
        cy.contains('button', '▶ Iniciar producción').click();
        cy.wait(700);
        cy.contains('span', 'En curso', { timeout: 10000 }).should('be.visible');
      }
    });

    // Con el día en curso, registrar el avance de producción de la primera sopa.
    cy.get('body').then(($body) => {
      if ($body.find('button:contains("Actualizar")').length > 0) {
        cy.contains('button', 'Actualizar').first().click();
        cy.contains('h3', 'Actualizar producción').should('be.visible');
        cy.wait(600);
        cy.get('input[type="number"]').clear().type('12');
        cy.wait(500);
        cy.contains('button', 'Guardar').click();
        cy.wait(700);
        cy.contains('h3', 'Actualizar producción').should('not.exist');
      }
    });

    // La tabla de sopas/segundos del día debe seguir mostrando contenido real.
    cy.contains('h3', 'Sopas del día').should('be.visible');
    cy.contains('h3', 'Segundos del día').should('be.visible');
  });
});
