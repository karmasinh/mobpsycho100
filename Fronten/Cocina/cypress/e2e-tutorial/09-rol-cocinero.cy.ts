// ═══════════════════════════════════════════════════════════════════════
// Capítulo 9 — El rol COCINERO en acción (menú acotado + tareas operativas)
//
// COCINERO es el rol de planta: ve Pedidos en cola, Producción del día,
// Recetas, Platos, Inventario, Alertas inventario, Categorías de insumo y
// Mermas — pero NO Insumos, Proveedores, Kárdex ni Auditoría (esos quedan
// para ALMACENERO/JEFE_COCINA/ADMIN). Confirmado contra la respuesta real
// de POST /api/auth/login para cocinero1 (ver modulos del usuario), no
// contra una suposición. El spec primero verifica ese menú acotado en la
// barra lateral y después hace dos tareas reales del día a día de un
// cocinero: avanzar un pedido en la cola y registrar una merma.
// ═══════════════════════════════════════════════════════════════════════
import { API_URL as apiUrl } from '../support/commands';

describe('09 - Rol COCINERO (menú acotado y tareas operativas)', () => {
  let pedidoId: number;

  before(() => {
    cy.apiLogin('admin', 'admin123').then((admin) => {
      const headers = { Authorization: `Bearer ${admin.token}` };
      cy.request({ method: 'GET', url: `${apiUrl}/platos/todos`, headers }).then((platosResp) => {
        const plato = platosResp.body.find((p: any) => p.activo && p.tipo === 'SEGUNDO');
        expect(plato, 'plato SEGUNDO activo').to.exist;

        cy.request({
          method: 'POST',
          url: `${apiUrl}/pedidos`,
          headers,
          body: {
            sucursalId: 1,
            observaciones: 'Pedido de prueba E2E — rol COCINERO (tutorial Cypress)',
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
    cy.viewport(1366, 800);
    cy.login('cocinero1', 'Cocina123!');
  });

  it('muestra en el menú lateral solo los módulos que le corresponden a COCINERO', () => {
    cy.visit('/dashboard');
    cy.contains('h1', 'Dashboard Cocina').should('be.visible');

    const permitidos = [
      'Pedidos en cola', 'Producción del día', 'Recetas', 'Platos',
      'Inventario', 'Alertas inventario', 'Categorías de insumo', 'Mermas',
    ];
    const prohibidos = ['Insumos', 'Proveedores', 'Kárdex', 'Auditoría', 'Empleados', 'Sucursales', 'Roles y permisos', 'Módulos y Menús', 'Usuarios'];

    permitidos.forEach((nombre) => {
      cy.contains('a.nav-item', nombre).should('exist');
    });
    prohibidos.forEach((nombre) => {
      cy.contains('a.nav-item', nombre).should('not.exist');
    });
  });

  it('avanza un pedido de "Pendientes" a "Preparando" desde la Cola de Pedidos', () => {
    cy.visit('/pedidos');
    cy.contains('h1', 'Cola de Pedidos').should('be.visible');
    cy.contains('button', 'Actualizar').click();

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

  it('registra una merma real (papa deteriorada) desde la pantalla de Mermas', () => {
    cy.visit('/mermas');
    cy.contains('h1', 'Registro de Mermas').should('be.visible');

    cy.contains('button', '+ Nueva Merma').click();
    cy.contains('h2', 'Registrar Merma').should('be.visible');
    cy.wait(600);

    cy.contains('h2', 'Registrar Merma').parents('.card').first().within(() => {
      cy.get('select').first().find('option').its('length').should('be.gt', 1);
      cy.get('select').first().find('option').eq(1).then(($opt) => {
        const value = $opt.val() as string;
        cy.get('select').first().select(value);
      });

      cy.get('input[type="number"]').clear().type('1.5');
      cy.get('select').eq(1).select('Deterioro por tiempo');
      cy.get('textarea').type('Papa con brotes y manchas, se retira del stock (registrado por cocinero1).', { delay: 60 });

      cy.wait(500);
      cy.contains('button', 'Registrar Merma').click();
    });
    cy.wait(700);

    cy.contains('h2', 'Registrar Merma').should('not.exist');
    cy.contains('td', 'Deterioro por tiempo', { timeout: 15000 }).should('be.visible');
  });
});
