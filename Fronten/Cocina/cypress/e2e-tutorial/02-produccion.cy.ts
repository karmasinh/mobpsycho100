// ═══════════════════════════════════════════════════════════════════════
// Capítulo 2 — Producción del día
//
// Inicia sesión como jefecocina1 (rol JEFE_COCINA, sucursal fija Casa
// Matriz), planifica la producción del día si todavía no existe, la pasa a
// "En curso" y registra el avance real de producción de una línea.
// Selectores verificados contra produccion.component.ts.
//
// Nota sobre la tarjeta "INGREDIENTES TOTALES": produccion.component.ts la
// llena con un fetch encadenado (primero el plan de hoy, luego la receta
// activa de cada plato con producción registrada, agregadas client-side —
// ver calcularIngredientes()). Si el spec navega y sigue de largo sin
// esperar esa segunda ronda de peticiones, el video queda con la tarjeta
// vacía/"cargando" y corta ahí, lo cual se ve roto. Por eso, tras registrar
// el avance de producción, se usa cy.contains/.should con reintento real
// (no cy.wait(ms) a ciegas) para esperar a que la tarjeta muestre ingredientes
// reales o, si de verdad no hay producción registrada, el texto de vacío
// genuino del componente.
//
// Nota sobre recetas activas: platosPorTipo() conserva el orden con el que
// PlatoService.listar() trae los platos, así que "elegir el primer disponible"
// del <select> siempre recae en el mismo par de platos semilla (Sopa de maní
// id 4, Pique a lo macho id 5). Esos dos platos de la semilla original no
// traían receta activa, y el backend bloquea con 422 registrar producción
// para un plato sin receta ("no se puede registrar producción sin poder
// descontar insumos"). En vez de asumir que la semilla siempre trae receta,
// el before() usa la propia funcionalidad de Recetas (POST /recetas/plato/:id,
// la misma que se ve en el capítulo 5) para asegurar que esos dos platos
// tengan una receta activa real antes de grabar — igual que 03/05/06 siembran
// datos reales por API antes de ejercitar la UI.
// ═══════════════════════════════════════════════════════════════════════
import { API_URL as apiUrl } from '../support/commands';

describe('02 - Producción del día', () => {
  before(() => {
    cy.apiLogin('admin', 'admin123').then((admin) => {
      const headers = { Authorization: `Bearer ${admin.token}` };
      const asegurarReceta = (platoId: number, ingredientes: { insumoId: number; cantidad: number; unidadMedida: string }[]) => {
        cy.request({
          method: 'GET',
          url: `${apiUrl}/recetas/plato/${platoId}/activa`,
          headers,
          failOnStatusCode: false,
        }).then((resp) => {
          const tieneActiva = resp.status === 200 && resp.body && resp.body.activa;
          if (!tieneActiva) {
            cy.request({
              method: 'POST',
              url: `${apiUrl}/recetas/plato/${platoId}`,
              headers,
              body: { notas: 'Receta estándar de casa', ingredientes },
            });
          }
        });
      };

      // Arroz (id 3) y Carne de res (id 6) — mismos insumos que usan otras
      // recetas semilla reales (ver Sopa de arroz / Segundo de carne con papas).
      asegurarReceta(4, [{ insumoId: 3, cantidad: 0.15, unidadMedida: 'kg' }, { insumoId: 6, cantidad: 0.1, unidadMedida: 'kg' }]);
      asegurarReceta(5, [{ insumoId: 6, cantidad: 0.2, unidadMedida: 'kg' }, { insumoId: 2, cantidad: 0.2, unidadMedida: 'kg' }]);
    });
  });

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
        // La cantidad producida no puede superar la planificada (validación real
        // del backend); una línea nueva se planifica por defecto en 10 unidades
        // (ver agregarLinea() en produccion.component.ts), así que se registra un
        // avance parcial seguro de 8 en lugar de un valor que podría excederla.
        cy.get('input[type="number"]').clear().type('8');
        cy.wait(500);
        cy.contains('button', 'Guardar').click();
        cy.wait(700);
        cy.contains('h3', 'Actualizar producción').should('not.exist');
      }
    });

    // La tabla de sopas/segundos del día debe seguir mostrando contenido real.
    cy.contains('h3', 'Sopas del día').should('be.visible');
    cy.contains('h3', 'Segundos del día').should('be.visible');

    // "INGREDIENTES TOTALES" depende de un segundo fetch encadenado (receta
    // activa por cada plato con producción > 0). Se espera el contenido real
    // con reintento de Cypress — no un cy.wait(ms) ciego — aceptando también
    // el estado vacío genuino ("Sin recetas activas...") si ningún plato con
    // avance tiene receta cargada.
    cy.contains('h3', 'INGREDIENTES TOTALES')
      .parents('.card')
      .first()
      .should(($card) => {
        const texto = $card.text();
        const vacioGenuino = texto.includes('Sin recetas activas asociadas a los platos');
        const filasReales = $card.find('.space-y-1\\.5 > div').length > 0;
        expect(vacioGenuino || filasReales, 'la tarjeta de ingredientes totales terminó de cargar').to.be.true;
      });

    // Pausa breve adicional solo para el ritmo de la narración, una vez que
    // el contenido real ya fue confirmado arriba.
    cy.wait(600);
  });
});
