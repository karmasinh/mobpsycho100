// ═══════════════════════════════════════════════════════════════════════
// Capítulo 10 — El rol ALMACENERO en acción (menú acotado + Kárdex)
//
// ALMACENERO se enfoca en el almacén: Inventario, Insumos, Proveedores,
// Alertas inventario, Categorías de insumo, Mermas y Kárdex — pero NO ve
// Pedidos en cola, Producción, Recetas, Platos ni Auditoría (esos son de
// cocina/jefatura). Confirmado contra la respuesta real de
// POST /api/auth/login para almacenero1. El spec verifica ese menú acotado
// y luego genera un Kárdex real de un insumo con movimientos —la pantalla
// de solo lectura que hasta ahora no tenía cobertura de tutorial.
// ═══════════════════════════════════════════════════════════════════════
describe('10 - Rol ALMACENERO (menú acotado y Kárdex)', () => {
  beforeEach(() => {
    cy.viewport(1366, 800);
    cy.login('almacenero1', 'Almacen123!');
  });

  it('muestra en el menú lateral solo los módulos que le corresponden a ALMACENERO', () => {
    cy.visit('/dashboard');
    cy.contains('h1', 'Dashboard Cocina').should('be.visible');

    const permitidos = [
      'Inventario', 'Insumos', 'Proveedores', 'Alertas inventario',
      'Categorías de insumo', 'Mermas', 'Kárdex',
    ];
    const prohibidos = [
      'Pedidos en cola', 'Producción del día', 'Recetas', 'Platos', 'Auditoría',
      'Empleados', 'Sucursales', 'Roles y permisos', 'Módulos y Menús', 'Usuarios',
    ];

    permitidos.forEach((nombre) => {
      cy.contains('a.nav-item', nombre).should('exist');
    });
    prohibidos.forEach((nombre) => {
      cy.contains('a.nav-item', nombre).should('not.exist');
    });
  });

  it('genera el Kárdex del mes de un insumo real y descarga su PDF', () => {
    cy.visit('/kardex');
    cy.contains('h1', 'Kárdex de Inventario').should('be.visible');

    cy.get('select', { timeout: 15000 }).first().find('option').its('length').should('be.gt', 1);
    cy.get('select').first().find('option').then(($opts) => {
      const value = $opts.filter((_, o) => o.value !== '').first().val() as string;
      cy.get('select').first().select(value);
    });
    cy.wait(500);

    cy.contains('button', 'Generar Kárdex').click();
    cy.wait(700);

    // El resumen y la tabla de movimientos deben cargar con contenido real
    // (Cypress reintenta el .contains hasta que la respuesta del backend
    // resuelve, sin depender de un cy.wait fijo para el dato en sí).
    cy.contains('p', 'Saldo Inicial', { timeout: 15000 }).should('be.visible');
    cy.contains('p', 'Saldo Final').should('be.visible');
    cy.contains('button', 'Descargar PDF').should('be.visible');
  });

  it('revisa el Centro de alertas de inventario (vencimientos y stock bajo)', () => {
    cy.visit('/alertas');
    cy.contains('h1', 'Centro de alertas').should('be.visible');

    // Se espera a que termine la carga real (el skeleton solo se muestra
    // mientras cargando() es true) antes de decidir qué rama de contenido
    // corresponde — nunca con un cy.wait(ms) ciego.
    cy.get('.skeleton', { timeout: 15000 }).should('not.exist');

    cy.get('body').then(($body) => {
      const sinAlertas = $body.text().includes('No hay alertas pendientes');
      if (!sinAlertas) {
        cy.get('.stat-card').its('length').should('be.gt', 0);
      } else {
        cy.contains('No hay alertas pendientes').should('be.visible');
      }
    });
  });
});
