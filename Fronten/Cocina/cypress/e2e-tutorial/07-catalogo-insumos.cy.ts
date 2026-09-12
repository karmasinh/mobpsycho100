// ═══════════════════════════════════════════════════════════════════════
// Capítulo 7 — Catálogo de cocina: Categorías de Insumo, Insumos y
// Proveedores (CRUD completo con baja lógica)
//
// Inicia sesión como jefecocina1 (rol JEFE_COCINA) y recorre el ciclo
// completo de alta → edición → baja (soft-delete, activo=false) en las tres
// pantallas de catálogo que alimentan el inventario y las recetas. Todo el
// contenido usa datos con sabor boliviano/tarijeño real, tal como los
// maneja "La Entrerriana" en su día a día.
//
// El backend nunca borra físicamente: el botón "Baja" llama a
// desactivar(id), que pone activo=false, y la fila pasa a mostrar el badge
// "Inactivo" (con opacidad reducida) en vez de desaparecer de la lista —
// salvo en Proveedores, donde una vez inactivo el botón de Baja deja de
// mostrarse (ver proveedores.component.ts) pero el registro sigue visible
// con su badge "Inactivo". Selectores verificados contra
// categorias-insumo.component.ts, insumos.component.ts y
// proveedores.component.ts.
//
// Nota sobre el buscador en vivo de estas tres pantallas: a diferencia de
// Platos/Recetas (donde `busquedaPlato`/`busquedaInsumo` SON signals), acá
// `busqueda` es una propiedad de clase normal leída dentro de un computed()
// — Angular Signals solo invalida un computed() cuando cambia una signal
// que rastreó, así que escribir en el campo no vuelve a filtrar la tabla
// una vez que la lista ya se cargó (se puede comprobar tecleando en el
// campo real de la app: el texto aparece pero la tabla no se reduce). Es un
// comportamiento real de la app tal como está, no algo a "arreglar" en el
// código de producción para este tutorial. Por eso, para ubicar un registro
// recién creado que quede fuera de la primera página, se usa
// cy.buscarEnPaginas(texto) (ver support/commands.ts) en lugar de depender
// del buscador, recorriendo página por página hasta encontrar el texto real.
// ═══════════════════════════════════════════════════════════════════════
describe('07 - Catálogo: Categorías de Insumo, Insumos y Proveedores', () => {
  const SUFIJO = Date.now().toString().slice(-6);
  const NOMBRE_CATEGORIA = `Condimentos Tarijeños ${SUFIJO}`;
  const NOMBRE_CATEGORIA_EDITADA = `Condimentos y Especias Tarijeñas ${SUFIJO}`;
  const CODIGO_INSUMO = `INS-TJA-${SUFIJO}`;
  const NOMBRE_INSUMO = `Comino molido ${SUFIJO}`;
  const NOMBRE_PROVEEDOR = `Distribuidora San Roque ${SUFIJO}`;

  beforeEach(() => {
    cy.viewport(1366, 800);
    cy.login('jefecocina1', 'JefeCocina123!');
  });

  it('registra, edita y da de baja una Categoría de Insumo', () => {
    cy.visit('/categorias-insumo');
    cy.contains('h1', 'Categorías de Insumos').should('be.visible');

    // Alta
    cy.contains('button', '+ Nueva Categoría').click();
    cy.contains('h3', 'Registrar Nueva Categoría').should('be.visible');
    cy.wait(600);

    cy.get('input[placeholder="Ej: Verduras, Carnes, Abarrotes"]').type(NOMBRE_CATEGORIA, { delay: 60 });
    cy.get('textarea[placeholder="Detalles de la categoría..."]')
      .type('Comino, orégano, pimentón y demás condimentos típicos del valle tarijeño.', { delay: 60 });

    cy.wait(500);
    cy.contains('button', 'Guardar Categoría').click();
    cy.wait(700);
    cy.contains('h3', 'Registrar Nueva Categoría').should('not.exist');
    cy.buscarEnPaginas(NOMBRE_CATEGORIA);
    cy.contains('td', NOMBRE_CATEGORIA, { timeout: 15000 }).should('be.visible');

    // Edición
    cy.contains('td', NOMBRE_CATEGORIA).parents('tr').within(() => {
      cy.contains('button', 'Editar').click();
    });
    cy.contains('h3', 'Editar Categoría').should('be.visible');
    cy.wait(600);
    cy.get('input[placeholder="Ej: Verduras, Carnes, Abarrotes"]').clear().type(NOMBRE_CATEGORIA_EDITADA, { delay: 60 });
    cy.wait(500);
    cy.contains('button', 'Guardar Categoría').click();
    cy.wait(700);
    cy.buscarEnPaginas(NOMBRE_CATEGORIA_EDITADA);
    cy.contains('td', NOMBRE_CATEGORIA_EDITADA, { timeout: 15000 }).should('be.visible');

    // Baja lógica
    cy.contains('td', NOMBRE_CATEGORIA_EDITADA).parents('tr').within(() => {
      cy.contains('button', 'Baja').click();
    });
    cy.wait(700);
    cy.buscarEnPaginas(NOMBRE_CATEGORIA_EDITADA);
    cy.contains('td', NOMBRE_CATEGORIA_EDITADA).parents('tr').within(() => {
      cy.contains('span', 'Inactivo', { timeout: 15000 }).should('be.visible');
    });
  });

  it('registra, edita y da de baja un Insumo (Comino molido)', () => {
    cy.visit('/insumos');
    cy.contains('h1', 'Gestión de Insumos').should('be.visible');

    // Alta
    cy.contains('button', '+ Nuevo Insumo').click();
    cy.contains('h3', 'Registrar Nuevo Insumo').should('be.visible');
    cy.wait(600);

    cy.get('input[placeholder="Ej: INS-001"]').type(CODIGO_INSUMO, { delay: 60 });
    cy.get('input[placeholder="Ej: Kg, Litro, Unid."]').type('Kg', { delay: 60 });
    cy.get('input[placeholder="Ej: Arroz Grano de Oro"]').type(NOMBRE_INSUMO, { delay: 60 });
    // Las categorías se cargan por una llamada HTTP aparte (cargarCategorias())
    // — se espera con reintento a que el <select> tenga opciones reales antes
    // de leer su valor, para no seleccionar en falso un <select> aún vacío.
    cy.get('select').first().find('option').its('length').should('be.gt', 1);
    cy.get('select').first().find('option').then(($opts) => {
      const value = $opts.filter((_, o) => o.value !== '').first().val() as string;
      cy.get('select').first().select(value);
    });
    cy.get('input[placeholder="0.00"]').clear().type('28.5', { delay: 60 });
    cy.contains('label', 'El insumo es perecedero').find('input[type="checkbox"]').uncheck({ force: true });

    cy.wait(500);
    cy.contains('button', 'Guardar Insumo').click();
    cy.wait(700);
    cy.contains('h3', 'Registrar Nuevo Insumo').should('not.exist');
    cy.buscarEnPaginas(NOMBRE_INSUMO);
    cy.contains('td', NOMBRE_INSUMO, { timeout: 15000 }).should('be.visible');

    // Edición: se marca como perecedero (badge visible en la tabla cambia de
    // "No perecedero" a "Perecedero").
    cy.contains('td', NOMBRE_INSUMO).parents('tr').within(() => {
      cy.contains('button', 'Editar').click();
    });
    cy.contains('h3', 'Editar Insumo').should('be.visible');
    cy.wait(600);
    // Reafirma la categoría (campo obligatorio) antes de guardar — el modal
    // de edición no la deja vacía en un flujo real, así que se selecciona
    // explícitamente por las dudas de qué haya quedado precargada.
    cy.get('select').first().find('option').its('length').should('be.gt', 1);
    cy.get('select').first().find('option').then(($opts) => {
      const value = $opts.filter((_, o) => o.value !== '').first().val() as string;
      cy.get('select').first().select(value);
    });
    cy.contains('label', 'El insumo es perecedero').find('input[type="checkbox"]').check({ force: true });
    cy.wait(500);
    cy.contains('button', 'Guardar Insumo').click();
    cy.wait(700);
    cy.contains('h3', 'Editar Insumo').should('not.exist');
    cy.buscarEnPaginas(NOMBRE_INSUMO);
    cy.contains('td', NOMBRE_INSUMO).parents('tr').within(() => {
      cy.contains('span', 'Perecedero', { timeout: 15000 }).should('be.visible');
    });

    // Baja lógica
    cy.contains('td', NOMBRE_INSUMO).parents('tr').within(() => {
      cy.contains('button', 'Baja').click();
    });
    cy.wait(700);
    cy.buscarEnPaginas(NOMBRE_INSUMO);
    cy.contains('td', NOMBRE_INSUMO).parents('tr').within(() => {
      cy.contains('span', 'Inactivo', { timeout: 15000 }).should('be.visible');
      cy.contains('button', 'Alta').should('be.visible');
    });
  });

  it('registra, edita y da de baja un Proveedor (Distribuidora San Roque, Tarija)', () => {
    cy.visit('/proveedores');
    cy.contains('h1', 'Proveedores').should('be.visible');

    // Alta
    cy.contains('button', '+ Nuevo').click();
    cy.contains('h3', 'Nuevo Proveedor').should('be.visible');
    cy.wait(600);

    cy.get('input[placeholder="Nombre del proveedor"]').type(NOMBRE_PROVEEDOR, { delay: 60 });
    cy.get('input[placeholder="12345678"]').type(`1023${SUFIJO}`, { delay: 60 });
    cy.get('input[placeholder="79xxxxxx"]').type('76612345', { delay: 60 });
    cy.get('input[placeholder="contacto@proveedor.com"]').type(`ventas.${SUFIJO}@sanroque-tja.com`, { delay: 60 });
    cy.get('input[placeholder="Nombre del contacto"]').type('Rubén Choque', { delay: 60 });
    cy.get('input[placeholder="Dirección del proveedor"]').type('Av. Las Américas, Barrio San Roque, Tarija', { delay: 60 });

    cy.wait(500);
    cy.contains('button', 'Guardar').click();
    cy.wait(700);
    cy.contains('h3', 'Nuevo Proveedor').should('not.exist');
    cy.buscarEnPaginas(NOMBRE_PROVEEDOR);
    cy.contains('p', NOMBRE_PROVEEDOR, { timeout: 15000 }).should('be.visible');

    // Edición: actualiza el teléfono
    cy.contains('p', NOMBRE_PROVEEDOR).parents('tr').within(() => {
      cy.contains('button', 'Editar').click();
    });
    cy.contains('h3', 'Editar Proveedor').should('be.visible');
    cy.wait(600);
    cy.get('input[placeholder="79xxxxxx"]').clear().type('76698765', { delay: 60 });
    cy.wait(500);
    cy.contains('button', 'Guardar').click();
    cy.wait(700);
    cy.buscarEnPaginas('76698765');
    cy.contains('td', '76698765', { timeout: 15000 }).should('be.visible');

    // Baja lógica
    cy.contains('p', NOMBRE_PROVEEDOR).parents('tr').within(() => {
      cy.contains('button', 'Baja').click();
    });
    cy.wait(700);
    cy.buscarEnPaginas(NOMBRE_PROVEEDOR);
    cy.contains('p', NOMBRE_PROVEEDOR).parents('tr').within(() => {
      cy.contains('span', 'Inactivo', { timeout: 15000 }).should('be.visible');
    });
  });
});
