// ═══════════════════════════════════════════════════════════════════════
// Capítulo 7 — Solicitudes de compra (flujo de aprobación por etapas)
//
// Recorre el flujo completo con 2 usuarios reales: jefecocina1 crea una
// solicitud y la envía a revisión; admin la aprueba, la marca en proceso
// y la marca recibida (ingresando datos de lote reales) — confirmando que
// el stock del insumo aumentó de verdad. Selectores verificados contra
// solicitudes-compra.component.ts (sin data-cy: se usan textos reales del
// flujo, igual que 04-inventario.cy.ts).
// ═══════════════════════════════════════════════════════════════════════
describe('07 - Solicitudes de compra', () => {
  const numeroDevolucionMarker = `Cypress-${Date.now()}`;
  let insumoNombre = '';
  let solicitudId = '';

  it('jefecocina1 crea una solicitud de compra y la envía a revisión', () => {
    cy.viewport(1366, 800);
    cy.intercept('POST', '**/solicitudes-compra*').as('crearSolicitud');
    cy.login('jefecocina1', 'JefeCocina123!');
    cy.visit('/solicitudes-compra');
    cy.contains('h1', 'Solicitudes de compra').should('be.visible');

    cy.contains('button', '+ Nueva solicitud').click();
    cy.contains('h3', 'Nueva solicitud de compra').should('be.visible');
    cy.wait(500);

    cy.contains('h3', 'Nueva solicitud de compra').parents('.card').first().within(() => {
      // Primer proveedor real disponible.
      cy.get('select').first().find('option').its('length').should('be.gt', 1);
      cy.get('select').first().find('option').eq(1).then($opt => {
        cy.get('select').first().select($opt.val() as string);
      });

      // Primer insumo real disponible en la fila de ítem.
      cy.get('select').eq(1).find('option').its('length').should('be.gt', 1);
      cy.get('select').eq(1).find('option').eq(1).then($opt => {
        cy.get('select').eq(1).select($opt.val() as string);
      });

      cy.get('input[placeholder="Cant."]').clear().type('12');
      cy.get('input[placeholder="Observaciones (opcional)"]').type(numeroDevolucionMarker);

      cy.wait(500);
      cy.contains('button', 'Crear solicitud').click();
    });

    // IMPORTANTE: los `cy.contains('tr', `#${solicitudId}`)` de más abajo
    // deben quedar DENTRO de este `.then()` (o de otro posterior) — el
    // cuerpo del test se ejecuta de forma síncrona para encolar comandos, así
    // que un template string con `solicitudId` fuera de un callback async
    // capturaría el valor inicial ('') en vez del recién asignado.
    cy.wait('@crearSolicitud').then(({ response }) => {
      solicitudId = String(response?.body?.id ?? '');
      expect(solicitudId, 'id de la solicitud recién creada').not.to.eq('');

      cy.contains('h3', 'Nueva solicitud de compra').should('not.exist');
      // Se scopea al # de la solicitud recién creada (no al primer botón
      // "Enviar a revisión" de la página) porque pueden quedar en la tabla
      // otras solicitudes CREADA de corridas previas del mismo usuario.
      // Se usa un `.contains()` encadenado (no `.within()`) para que Cypress
      // reintente la búsqueda completa de la fila si Angular la vuelve a
      // renderizar entremedio (p. ej. tras refrescar la lista al crear).
      cy.contains('tr', `#${solicitudId}`, { timeout: 15000 })
        .contains('button', 'Enviar a revisión')
        .should('be.visible');
      cy.wait(700);
      cy.contains('tr', `#${solicitudId}`)
        .contains('button', 'Enviar a revisión')
        .click();

      cy.contains('tr', `#${solicitudId}`, { timeout: 15000 })
        .should('contain.text', 'En revisión')
        .and('contain.text', 'Esperando decisión de un administrador');
      cy.wait(500);
    });
  });

  it('admin aprueba, marca en proceso y recibe la solicitud — el stock ingresa de verdad', () => {
    cy.viewport(1366, 800);
    cy.login('admin', 'admin123');
    cy.visit('/solicitudes-compra');
    cy.contains('h1', 'Solicitudes de compra').should('be.visible');

    // Se ubica la fila por su # único (capturado al crearla en el test
    // anterior) en vez de por "jefecocina1", porque pueden quedar en la
    // tabla solicitudes de corridas previas para el mismo usuario en
    // distintos estados, lo que vuelve ambiguo un match por texto de usuario.
    cy.contains('tr', `#${solicitudId}`, { timeout: 15000 }).should('contain.text', 'En revisión');
    cy.contains('tr', `#${solicitudId}`).contains('button', 'Aprobar').click();
    cy.wait(700);

    cy.contains('tr', `#${solicitudId}`, { timeout: 15000 }).should('contain.text', 'Aprobada');
    cy.contains('tr', `#${solicitudId}`).contains('button', 'Marcar en proceso').click();
    cy.wait(700);

    cy.contains('tr', `#${solicitudId}`, { timeout: 15000 }).should('contain.text', 'En proceso');
    cy.contains('tr', `#${solicitudId}`).contains('button', 'Marcar recibida').click();

    cy.contains('h3', `Marcar solicitud #${solicitudId} como recibida`).should('be.visible');
    cy.wait(600);
    // El nombre real del insumo aparece en el encabezado del ítem dentro del
    // modal ("{{ item.insumoNombre }} ({{ item.unidadMedida }})") — se
    // captura acá para buscar el mismo insumo en el Kárdex más abajo, en
    // vez de asumir que "la primera opción" es igual en ambos selects
    // (los catálogos de insumo no necesariamente listan en el mismo orden).
    cy.contains('h3', `Marcar solicitud #${solicitudId} como recibida`).parents('.card').first().within(() => {
      cy.get('p.font-semibold').first().invoke('text').then((texto) => {
        insumoNombre = texto.split('(')[0].trim();
      });
      cy.get('input[placeholder="0.00"]').first().clear().type('9.5');
      cy.wait(400);
      cy.contains('button', 'Confirmar recepción').click();
    });

    cy.contains('h3', `Marcar solicitud #${solicitudId} como recibida`).should('not.exist');
    cy.contains('tr', `#${solicitudId}`, { timeout: 15000 }).should('not.exist'); // ya no está "pendiente" (RECIBIDA es terminal)
    cy.wait(500);

    // El Kárdex confirma el ingreso real del lote (SC-<id>-<item>), buscando
    // el mismo insumo que se recibió (por nombre, capturado arriba). El
    // primer <select> de la página es el de sucursal (topbar) — el de
    // insumo vive dentro del panel de consulta (.card).
    cy.visit('/kardex');
    cy.contains('h1', 'Kárdex de Inventario').should('be.visible');
    cy.get('.card select').first().find('option').its('length').should('be.gt', 1);
    cy.get('.card select').first().then($select => {
      expect(insumoNombre, 'nombre de insumo capturado en el paso anterior').not.to.eq('');
      const $opt = $select.find('option').filter((_, o) => o.textContent?.trim().startsWith(insumoNombre) ?? false).first();
      expect($opt.length, `opción de insumo "${insumoNombre}" en el Kárdex`).to.be.greaterThan(0);
      cy.wrap($select).select($opt.val() as string);
    });
    cy.wait(400);
    cy.contains('button', 'Generar Kárdex').should('not.be.disabled').click();
    cy.contains('Ingreso por compra - Lote: SC-', { timeout: 15000 }).should('be.visible');
  });
});
