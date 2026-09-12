// ═══════════════════════════════════════════════════════════════════════
// Capítulo 6 — Cola de Pedidos en móvil (390×844)
//
// La Cola de Pedidos es la pantalla operativa clave para el cocinero en
// planta — se valida en viewport móvil real: navegación por bottom-nav,
// columnas apiladas y la acción de avanzar un pedido siguen funcionando.
// ═══════════════════════════════════════════════════════════════════════
import { API_URL as apiUrl } from '../support/commands';

describe('06 - Cola de pedidos (móvil)', () => {
  let pedidoId: number;

  before(() => {
    cy.apiLogin('admin', 'admin123').then((admin) => {
      const headers = { Authorization: `Bearer ${admin.token}` };
      cy.request({ method: 'GET', url: `${apiUrl}/platos/todos`, headers }).then((platosResp) => {
        const plato = platosResp.body.find((p: any) => p.activo && p.tipo === 'SOPA');
        expect(plato, 'plato SOPA activo').to.exist;

        cy.request({
          method: 'POST',
          url: `${apiUrl}/pedidos`,
          headers,
          body: {
            sucursalId: 1,
            observaciones: 'Pedido de prueba E2E móvil (tutorial Cypress)',
            detalles: [{ platoId: plato.id, cantidad: 1 }],
          },
        }).then((pedidoResp) => {
          expect(pedidoResp.status).to.eq(201);
          pedidoId = pedidoResp.body.id;
        });
      });
    });
  });

  beforeEach(() => {
    cy.viewport(390, 844);
    cy.login('jefecocina1', 'JefeCocina123!');
  });

  it('permite navegar por el bottom-nav móvil hacia Pedidos', () => {
    cy.visit('/dashboard');
    cy.contains('h1', 'Dashboard Cocina').should('be.visible');

    // Bottom-nav (solo visible en viewport móvil vía CSS) — primeros módulos del rol.
    cy.get('nav.bottom-nav a').should('have.length.greaterThan', 0);
    cy.get('nav.bottom-nav a[href="/pedidos"]').click();
    cy.wait(500);

    cy.location('pathname').should('eq', '/pedidos');
    cy.contains('h1', 'Cola de Pedidos').should('be.visible');
  });

  it('muestra las columnas del kanban apiladas y permite avanzar un pedido', () => {
    cy.visit('/pedidos');
    cy.contains('h1', 'Cola de Pedidos').should('be.visible');
    cy.contains('button', 'Actualizar').click();

    // Layout responsivo: en móvil el grid usa una sola columna (grid-cols-1 de Tailwind).
    cy.get('.grid.grid-cols-1.md\\:grid-cols-3').should('exist');

    cy.contains('span.font-mono', `#${pedidoId}`, { timeout: 15000 }).should('be.visible');
    cy.contains('span.font-mono', `#${pedidoId}`)
      .closest('.card')
      .within(() => {
        cy.contains('button', 'Iniciar preparación').click();
      });
    cy.wait(700);

    cy.contains('span.font-mono', `#${pedidoId}`, { timeout: 15000 })
      .closest('.card')
      .within(() => {
        cy.contains('button', 'Marcar listo').should('be.visible');
      });
  });
});
