// ═══════════════════════════════════════════════════════════════════════
// Capítulo 3 — Cola de pedidos (Kanban de cocina)
//
// Sólo CAJERO/VENDEDOR/ADMIN pueden crear pedidos (ver PedidoController),
// así que primero se siembra un pedido PENDIENTE real vía la API del
// backend autenticado como admin. Luego se inicia sesión en la UI como
// jefecocina1 y se avanza ese pedido de "Pendientes" a "Preparando" desde
// la Cola de Pedidos real (cola-pedidos.component.ts).
// ═══════════════════════════════════════════════════════════════════════
import { API_URL as apiUrl } from '../support/commands';

describe('03 - Cola de pedidos', () => {
  let pedidoId: number;

  before(() => {
    cy.apiLogin('admin', 'admin123').then((admin) => {
      const headers = { Authorization: `Bearer ${admin.token}` };

      // Plato real activo de tipo SEGUNDO en Casa Matriz (sucursalId 1).
      cy.request({ method: 'GET', url: `${apiUrl}/platos/todos`, headers }).then((platosResp) => {
        const plato = platosResp.body.find((p: any) => p.activo && p.tipo === 'SEGUNDO');
        expect(plato, 'plato SEGUNDO activo').to.exist;

        cy.request({
          method: 'POST',
          url: `${apiUrl}/pedidos`,
          headers,
          body: {
            sucursalId: 1,
            observaciones: 'Pedido de prueba E2E (tutorial Cypress)',
            detalles: [{ platoId: plato.id, cantidad: 1 }],
          },
        }).then((pedidoResp) => {
          expect(pedidoResp.status).to.eq(201);
          pedidoId = pedidoResp.body.id;
        });
      });
    });
  });

  it('muestra el pedido sembrado en "Pendientes" y lo avanza a "Preparando"', () => {
    cy.viewport(1366, 800);
    cy.login('jefecocina1', 'JefeCocina123!');
    cy.visit('/pedidos');
    cy.contains('h1', 'Cola de Pedidos').should('be.visible');

    // La cola carga por API (no realtime en el test) — refrescar para asegurar datos frescos.
    cy.contains('button', 'Actualizar').click();

    cy.contains('span.font-mono', `#${pedidoId}`, { timeout: 15000 }).should('be.visible');

    cy.contains('span.font-mono', `#${pedidoId}`)
      .closest('.card')
      .within(() => {
        cy.contains('button', 'Iniciar preparación').click();
      });
    cy.wait(700);

    // Tras avanzar de estado, la tarjeta del pedido ahora ofrece "Marcar listo"
    // (acción exclusiva de la columna EN_PREPARACION) en lugar de "Iniciar preparación".
    cy.contains('span.font-mono', `#${pedidoId}`, { timeout: 15000 })
      .closest('.card')
      .within(() => {
        cy.contains('button', 'Marcar listo').should('be.visible');
        cy.contains('button', 'Iniciar preparación').should('not.exist');
      });
  });
});
