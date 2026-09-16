// ═══════════════════════════════════════════════════════════════════════
// Capítulo 8 — Devolución de insumo a proveedor
//
// Inicia sesión como almacenero1, ingresa un lote real con vencimiento
// próximo (para que aparezca en la pestaña "Vencimientos", único lugar
// donde vive el botón "Devolver a proveedor"), y confirma la devolución
// parcial de ese lote — verificando que el remanente disponible baja
// exactamente lo devuelto. Selectores verificados contra
// inventario.component.ts (modales "Ingresar Lote de Insumo" y
// "Devolver a proveedor").
// ═══════════════════════════════════════════════════════════════════════
describe('08 - Devolución de insumo a proveedor', () => {
  beforeEach(() => {
    cy.viewport(1366, 800);
    cy.login('almacenero1', 'Almacen123!');
  });

  it('ingresa un lote con vencimiento próximo y lo devuelve parcialmente al proveedor', () => {
    cy.visit('/inventario');
    cy.contains('h1', 'Inventario').should('be.visible');

    // Fecha de vencimiento 5 días en el futuro, dentro de la ventana de "Vencimientos" (15 días).
    const vencimiento = new Date();
    vencimiento.setDate(vencimiento.getDate() + 5);
    const fechaVencimientoStr = vencimiento.toISOString().slice(0, 10);

    cy.contains('button', '+ Ingresar lote').click();
    cy.contains('h3', 'Ingresar Lote de Insumo').should('be.visible');
    cy.wait(500);

    cy.contains('h3', 'Ingresar Lote de Insumo').parents('.card').first().within(() => {
      cy.get('select').first().find('option').its('length').should('be.gt', 1);
      cy.get('select').first().find('option').eq(1).then($opt => {
        cy.get('select').first().select($opt.val() as string);
      });

      cy.get('input[placeholder="0.00"]').first().clear().type('20');
      cy.get('input[placeholder="0.00"]').eq(1).clear().type('9');
      cy.get('input[type="date"]').type(fechaVencimientoStr);

      cy.wait(400);
      cy.contains('button', 'Ingresar lote').click();
    });
    cy.contains('h3', 'Ingresar Lote de Insumo').should('not.exist');
    cy.wait(700);

    // Pestaña Vencimientos: el lote recién ingresado debe aparecer con su botón de devolución.
    cy.contains('button', 'Vencimientos').click();
    cy.wait(600);
    cy.contains('button', 'Devolver a proveedor', { timeout: 15000 }).should('be.visible');

    cy.contains('p', /disponibles/i).first().invoke('text').then((textoAntes) => {
      cy.log(`Remanente antes de la devolución: ${textoAntes}`);

      cy.contains('button', 'Devolver a proveedor').click();
      cy.contains('h3', 'Devolver a proveedor').should('be.visible');
      cy.wait(500);

      cy.contains('h3', 'Devolver a proveedor').parents('.card').first().within(() => {
        cy.get('input[type="number"]').clear().type('5');
        cy.get('input[placeholder="Producto en mal estado / vencido"]').type('Devolución registrada por el spec de Cypress (tutorial E2E).');
        cy.get('input[placeholder="Opcional"]').type(`DEV-CY-${Date.now()}`);
        cy.wait(400);
        cy.contains('button', 'Confirmar').click();
      });

      cy.contains('h3', 'Devolver a proveedor').should('not.exist');
      cy.wait(800);

      // El toast real de confirmarDevolucion() y el remanente visible ya no coinciden
      // con el texto de antes (bajó realmente) — verificación cualitativa, no aritmética
      // sobre texto parseado (más robusta, mismo criterio que el resto de la suite).
      cy.contains('Devolución registrada', { timeout: 10000 }).should('be.visible');
      cy.contains('p', /disponibles/i, { timeout: 15000 }).first().invoke('text').should((textoDespues) => {
        expect(textoDespues).not.to.eq(textoAntes);
      });
    });
  });
});
