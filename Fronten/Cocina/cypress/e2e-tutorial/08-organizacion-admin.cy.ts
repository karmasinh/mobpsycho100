// ═══════════════════════════════════════════════════════════════════════
// Capítulo 8 — Organización (solo ADMIN): Sucursales, Empleados, Usuarios,
// Roles y Módulos
//
// Estas cinco pantallas son exclusivas de ADMIN — ni jefecocina1 ni ningún
// otro rol de cocina las ve en su menú (confirmado contra los módulos reales
// que devuelve /api/auth/login para cada usuario: MOD_SUCURSALES,
// MOD_EMPLEADOS, MOD_USUARIOS, MOD_ROLES y MOD_MODULOS solo llegan con
// sistema=ADMIN). El spec inicia sesión como admin y hace el ciclo completo
// de alta → edición → baja lógica en cada una, más la asignación de rol y
// cambio de contraseña de un usuario ya creado. Selectores verificados
// contra sucursales.component.ts, empleados.component.ts,
// usuarios.component.ts, roles.component.ts y modulos.component.ts.
//
// Nota sobre el buscador en vivo: igual que en el capítulo 7 (Insumos,
// Categorías, Proveedores), estas cinco pantallas leen `busqueda` como
// propiedad de clase normal (no signal) dentro de un computed(), así que
// escribir en el campo no vuelve a filtrar la tabla una vez cargada. Se usa
// cy.buscarEnPaginas(texto) (ver support/commands.ts) para llegar al registro
// recién creado en vez de depender del buscador.
// ═══════════════════════════════════════════════════════════════════════
describe('08 - Organización (Sucursales, Empleados, Usuarios, Roles, Módulos)', () => {
  const SUFIJO = Date.now().toString().slice(-6);
  const NOMBRE_SUCURSAL = `Sucursal San Jacinto ${SUFIJO}`;
  const NOMBRE_EMPLEADO = 'Nayra';
  const APELLIDO_EMPLEADO = `Vargas${SUFIJO}`;
  const CI_EMPLEADO = `78${SUFIJO}`;
  const NOMBRE_ROL = `AYUDANTE_COCINA_${SUFIJO}`;
  const CODIGO_MODULO = `MOD_TEST_${SUFIJO}`;

  beforeEach(() => {
    cy.viewport(1366, 800);
    cy.login('admin', 'admin123');
  });

  it('registra, edita y da de baja una Sucursal', () => {
    cy.visit('/sucursales');
    cy.contains('h1', 'Sucursales').should('be.visible');

    cy.contains('button', '+ Nueva sucursal').click();
    cy.contains('h3', 'Nueva Sucursal').should('be.visible');
    cy.wait(600);

    cy.get('input[placeholder="Sucursal Centro, Sucursal Norte..."]').type(NOMBRE_SUCURSAL, { delay: 60 });
    cy.get('input[placeholder="Av. Principal #123"]').type('Calle San Jacinto esq. Bolívar, Tarija', { delay: 60 });
    cy.get('input[placeholder="79xxxxxx"]').type('46642233', { delay: 60 });

    cy.wait(500);
    cy.contains('button', 'Guardar').click();
    cy.wait(700);
    cy.contains('h3', 'Nueva Sucursal').should('not.exist');
    cy.buscarEnPaginas(NOMBRE_SUCURSAL);
    cy.contains('p', NOMBRE_SUCURSAL, { timeout: 15000 }).should('be.visible');

    // Edición
    cy.contains('p', NOMBRE_SUCURSAL).parents('.card').within(() => {
      cy.contains('button', 'Editar').click();
    });
    cy.contains('h3', 'Editar Sucursal').should('be.visible');
    cy.wait(600);
    cy.get('input[placeholder="79xxxxxx"]').clear().type('46655544', { delay: 60 });
    cy.wait(500);
    cy.contains('button', 'Guardar').click();
    cy.wait(700);
    cy.buscarEnPaginas('46655544');
    cy.contains('p', '46655544', { timeout: 15000 }).should('be.visible');

    // Baja lógica
    cy.contains('p', NOMBRE_SUCURSAL).parents('.card').within(() => {
      cy.contains('button', 'Desactivar').click();
    });
    cy.wait(700);
    cy.buscarEnPaginas(NOMBRE_SUCURSAL);
    cy.contains('p', NOMBRE_SUCURSAL).parents('.card').within(() => {
      cy.contains('span', 'Inactiva', { timeout: 15000 }).should('be.visible');
    });
  });

  it('registra un Empleado (crea su usuario automáticamente) y luego lo desactiva', () => {
    cy.visit('/empleados');
    cy.contains('h1', 'Empleados').should('be.visible');

    cy.contains('button', '+ Nuevo empleado').click();
    cy.contains('h3', 'Nuevo empleado').should('be.visible');
    cy.wait(600);

    // Todo el formulario se escopea al modal — la barra superior también
    // trae su propio <select> (elegir sucursal activa, visible para ADMIN
    // porque no tiene sucursal fija) que de otro modo se cuela en cy.get('select').
    cy.contains('h3', 'Nuevo empleado').parents('.card').first().within(() => {
      cy.get('input[placeholder="Juan"]').type(NOMBRE_EMPLEADO, { delay: 60 });
      cy.get('input[placeholder="Pérez"]').type(APELLIDO_EMPLEADO, { delay: 60 });
      cy.get('input[placeholder="12345678"]').type(CI_EMPLEADO, { delay: 60 });
      cy.get('input[placeholder="79xxxxxx"]').type('76701122', { delay: 60 });
      cy.get('input[placeholder="juan@ejemplo.com"]').type(`nayra.${SUFIJO}@laentrerriana.com`, { delay: 60 });
      cy.get('input[placeholder="Cocinero, Cajero, etc."]').type('Ayudante de cocina', { delay: 60 });
      cy.get('select').eq(0).select('MANANA');

      // Sucursal y Rol: se cargan por HTTP aparte (cargarDatos()) — se espera
      // con reintento a que cada <select> tenga sus opciones reales antes de
      // leer el primer valor real disponible. Ambos placeholders usan
      // [value]="null" en el template (no [ngValue]), lo que Angular renderiza
      // como el <option> con value="null" (el string literal, no vacío) — se
      // descarta explícitamente además de la cadena vacía.
      cy.get('select').eq(1).find('option').its('length').should('be.gt', 1);
      cy.get('select').eq(1).find('option').then(($opts) => {
        const value = $opts.filter((_, o) => o.value !== '' && o.value !== 'null').first().val() as string;
        cy.get('select').eq(1).select(value);
      });
      cy.get('select').eq(2).find('option').its('length').should('be.gt', 1);
      cy.get('select').eq(2).find('option').then(($opts) => {
        const value = $opts.filter((_, o) => o.value !== '' && o.value !== 'null').first().val() as string;
        cy.get('select').eq(2).select(value);
      });

      cy.get('input[placeholder="Mínimo 6 caracteres"]').type('Cocina2024!', { delay: 60 });
    });

    cy.wait(500);
    cy.contains('button', 'Crear empleado y usuario').click();
    cy.wait(700);
    cy.contains('h3', 'Nuevo empleado').should('not.exist');
    cy.buscarEnPaginas(CI_EMPLEADO);
    cy.contains('td', CI_EMPLEADO, { timeout: 15000 }).should('be.visible');
    cy.contains('p', `${NOMBRE_EMPLEADO} ${APELLIDO_EMPLEADO}`).should('be.visible');

    // Baja (desactiva empleado y su usuario asociado — confirm() nativo lo
    // acepta Cypress automáticamente). GET /empleados solo trae activos
    // (EmpleadoServiceImpl.listarActivos), así que cargarDatos() vuelve a
    // pedir la lista y la fila desaparece del listado por completo — no
    // queda un badge "Inactivo" en esta pantalla (a diferencia de
    // Insumos/Categorías/Módulos, que sí listan inactivos).
    cy.contains('td', CI_EMPLEADO).parents('tr').within(() => {
      cy.contains('button', 'Desactivar').click();
    });
    cy.wait(700);
    cy.contains('td', CI_EMPLEADO, { timeout: 15000 }).should('not.exist');
  });

  it('en Usuarios del Sistema, cambia el rol y la contraseña de un empleado existente', () => {
    cy.visit('/usuarios');
    cy.contains('h1', 'Usuarios del Sistema').should('be.visible');

    // Se toma un usuario real de la tabla (cualquier empleado con cuenta
    // activa ya sembrado por DataInitializer) para demostrar el flujo, pero
    // evitando deliberadamente las cuentas nombradas que otros capítulos de
    // este mismo tutorial necesitan poder loguear después (admin, cocinero1,
    // jefecocina1, almacenero1) — cambiarles el rol o la contraseña aquí
    // rompería esos capítulos más adelante en la misma sesión de grabación.
    // El cambio de rol solo actualiza el signal local (no vuelve a pedir la
    // lista), así que la fila sigue siendo la misma tras la acción.
    const CUENTAS_PROTEGIDAS = ['admin', 'cocinero1', 'jefecocina1', 'almacenero1'];
    cy.get('table tbody tr', { timeout: 15000 }).should('have.length.greaterThan', 0);
    cy.get('table tbody tr').then(($rows) => {
      const fila = Array.from($rows).find(
        (row) => !CUENTAS_PROTEGIDAS.some((u) => Cypress.$(row).text().includes(u))
      );
      expect(fila, 'fila de un usuario no protegido').to.exist;
      cy.wrap(fila).as('filaUsuario');
    });

    cy.get('@filaUsuario').within(() => {
      cy.contains('button', 'Rol').click();
    });
    cy.contains('h3', 'Cambiar Rol', { timeout: 10000 }).should('be.visible');
    cy.wait(600);
    cy.contains('h3', 'Cambiar Rol').parents('.card').first().within(() => {
      cy.get('select').find('option').then(($opts) => {
        const value = $opts.filter((_, o) => o.value !== '').first().val() as string;
        cy.get('select').select(value);
      });
    });
    cy.wait(500);
    cy.contains('button', 'Aplicar').click();
    cy.wait(700);
    cy.contains('h3', 'Cambiar Rol').should('not.exist');

    // Cambiar contraseña del mismo usuario (misma fila protegida-de-exclusión).
    cy.get('@filaUsuario').within(() => {
      cy.contains('button', 'Pass').click();
    });
    cy.contains('h3', 'Cambiar Contraseña', { timeout: 10000 }).should('be.visible');
    cy.wait(600);
    cy.get('input[placeholder="Mínimo 8 caracteres"]').type('NuevaClave2024#', { delay: 60 });
    cy.wait(500);
    cy.contains('button', 'Cambiar').click();
    cy.wait(700);
    cy.contains('h3', 'Cambiar Contraseña').should('not.exist');
  });

  it('registra, edita módulos y da de baja un Rol de permisos', () => {
    cy.visit('/roles');
    cy.contains('h1', 'Roles y Permisos').should('be.visible');

    cy.contains('button', '+ Nuevo rol').click();
    cy.contains('h3', 'Nuevo Rol').should('be.visible');
    cy.wait(600);

    cy.get('input[placeholder="Ej: CAJERO, JEFE_COCINA"]').type(NOMBRE_ROL, { delay: 60 });
    cy.get('input[placeholder="Descripción del rol..."]').type('Rol de apoyo para tareas básicas de cocina (creado por el spec de tutorial).', { delay: 60 });

    // Selecciona un par de módulos reales de cocina (Pedidos en cola, Mermas).
    cy.contains('label', 'Pedidos en cola').find('input[type="checkbox"]').check({ force: true });
    cy.contains('label', 'Mermas').find('input[type="checkbox"]').check({ force: true });

    cy.wait(500);
    cy.contains('button', 'Guardar').click();
    cy.wait(700);
    cy.contains('h3', 'Nuevo Rol').should('not.exist');
    cy.buscarEnPaginas(NOMBRE_ROL);
    cy.contains('p', NOMBRE_ROL, { timeout: 15000 }).should('be.visible');

    // Edición: agrega un módulo más.
    cy.contains('p', NOMBRE_ROL).parents('.card').within(() => {
      cy.contains('button', 'Editar').click();
    });
    cy.contains('h3', 'Editar Rol').should('be.visible');
    cy.wait(600);
    cy.contains('label', 'Alertas inventario').find('input[type="checkbox"]').check({ force: true });
    cy.wait(500);
    cy.contains('button', 'Guardar').click();
    cy.wait(700);
    cy.buscarEnPaginas(NOMBRE_ROL);
    cy.contains('p', NOMBRE_ROL).parents('.card').within(() => {
      cy.contains('span', 'Alertas inventario').should('be.visible');
    });

    // Baja lógica. RolesComponent.desactivar() actualiza el signal local
    // (activo=false) de forma optimista y NO vuelve a pedir la lista al
    // backend, así que el rol se queda visible en pantalla con su badge
    // "Inactivo" — aunque RolController.listar() ya no lo devolvería en una
    // recarga real de la página (solo trae roles activos).
    cy.contains('p', NOMBRE_ROL).parents('.card').within(() => {
      cy.contains('button', 'Baja').click();
    });
    cy.wait(700);
    cy.buscarEnPaginas(NOMBRE_ROL);
    cy.contains('p', NOMBRE_ROL).parents('.card').within(() => {
      cy.contains('span', 'Inactivo', { timeout: 15000 }).should('be.visible');
    });
  });

  it('registra, edita y da de baja un Módulo de menú', () => {
    cy.visit('/modulos');
    cy.contains('h1', 'Módulos y Menús').should('be.visible');

    cy.contains('button', '+ Nuevo Módulo').click();
    cy.contains('h3', 'Registrar Nuevo Módulo').should('be.visible');
    cy.wait(600);

    // Escopeado al modal — la página de fondo tiene su propio <select> de
    // sucursal (topbar) y, dentro del propio modal, otro <select> para el
    // "Módulo Padre" además del de "Sistema".
    cy.contains('h3', 'Registrar Nuevo Módulo').parents('.card').first().within(() => {
      cy.get('input[placeholder="Ej: MOD_REPORTES"]').type(CODIGO_MODULO, { delay: 60 });
      cy.get('input[placeholder="Ej: Reportes de Venta"]').type('Módulo de prueba tutorial', { delay: 60 });
      cy.get('input[placeholder="Ej: /admin/reportes"]').type('/admin/prueba-tutorial', { delay: 60 });
      cy.get('input[placeholder="Ej: tabler:chart-bar"]').type('tabler:tag', { delay: 60 });
      cy.contains('label', 'Sistema *').parent().find('select').select('ADMIN');
      cy.get('input[type="number"]').clear().type('99');
    });

    cy.wait(500);
    cy.contains('button', 'Guardar Módulo').click();
    cy.wait(700);
    cy.contains('h3', 'Registrar Nuevo Módulo').should('not.exist');
    cy.buscarEnPaginas(CODIGO_MODULO);
    cy.contains('td', CODIGO_MODULO, { timeout: 15000 }).should('be.visible');

    // Edición
    cy.contains('td', CODIGO_MODULO).parents('tr').within(() => {
      cy.contains('button', 'Editar').click();
    });
    cy.contains('h3', 'Editar Módulo').should('be.visible');
    cy.wait(600);
    cy.get('input[placeholder="Ej: Reportes de Venta"]').clear().type('Módulo de prueba (editado)', { delay: 60 });
    cy.wait(500);
    cy.contains('button', 'Guardar Módulo').click();
    cy.wait(700);
    cy.buscarEnPaginas('Módulo de prueba (editado)');
    cy.contains('td', 'Módulo de prueba (editado)', { timeout: 15000 }).should('be.visible');

    // Baja lógica
    cy.contains('td', CODIGO_MODULO).parents('tr').within(() => {
      cy.contains('button', 'Baja').click();
    });
    cy.wait(700);
    cy.buscarEnPaginas(CODIGO_MODULO);
    cy.contains('td', CODIGO_MODULO).parents('tr').within(() => {
      cy.contains('span', 'Inactivo', { timeout: 15000 }).should('be.visible');
    });
  });
});
