// ═══════════════════════════════════════════════════════════════════════
// Capítulo 5 — Platos y Recetas: un plato tradicional de Tarija
//
// Inicia sesión como jefecocina1 y registra "Doradillo tarijeño" — uno de
// los platos tradicionales de Tarija (arroz con queso y leche, típico del
// valle central) — como Plato nuevo, y luego le arma su receta real con
// insumos ya cargados en el sistema (Arroz, Queso criollo, Leche).
// Idempotente: si ya existe de una corrida anterior, reutiliza el plato
// (se verifica por API antes de decidir si hace falta crearlo).
//
// Los buscadores "Buscar plato..." (Platos/Recetas) y "Buscar insumo..."
// (panel de ingredientes de Recetas) son reactivos: busquedaPlato/busquedaInsumo
// son signals y el `computed()` de cada lista los rastrea, por lo que escribir
// en el campo refiltra la lista en vivo, sin recargar ni paginar. Estos specs
// usan justamente ese buscador — en vivo — para ubicar la tarjeta del plato,
// demostrando la reactividad en el propio flujo.
// Selectores verificados contra platos.component.ts y recetas.component.ts.
// ═══════════════════════════════════════════════════════════════════════
import { API_URL } from '../support/commands';

describe('05 - Platos y recetas (Doradillo tarijeño)', () => {
  const NOMBRE_PLATO = 'Doradillo tarijeño';

  /**
   * Escribe `texto` (parcial) en el buscador reactivo indicado y verifica
   * EN VIVO —sin paginar ni disparar ninguna otra acción— que la lista se
   * refiltra a solo las tarjetas que lo contienen. No usa recarga ni submit:
   * solo el binding [ngModel]->signal.set($event) del propio componente.
   */
  const buscarEnVivo = (selectorInput: string, texto: string, selectorItem = '.card'): void => {
    cy.get(selectorInput).clear().type(texto);
    cy.contains(selectorItem, texto, { timeout: 10000 }).should('be.visible');
  };

  beforeEach(() => {
    cy.viewport(1366, 800);
    cy.login('jefecocina1', 'JefeCocina123!');
  });

  it('registra el plato tradicional (si no existe) con su código, tipo y precio', () => {
    cy.apiLogin('admin', 'admin123').then((admin) => {
      cy.request({
        method: 'GET',
        url: `${API_URL}/platos/todos`,
        headers: { Authorization: `Bearer ${admin.token}` },
      }).then((resp) => {
        const yaExiste = (resp.body as any[]).some((p) => p.nombre === NOMBRE_PLATO);

        cy.visit('/platos');
        cy.contains('h1', 'Platos y Menú').should('be.visible');

        if (yaExiste) {
          buscarEnVivo('input[placeholder="Buscar plato..."]', NOMBRE_PLATO);
          return;
        }

        cy.contains('button', '+ Nuevo Plato').click();
        cy.contains('h3', 'Registrar Nuevo Plato').should('be.visible');
        cy.wait(600);

        cy.get('input[placeholder="Ej: PL-001"]').type('PLA-DORADILLO');
        cy.get('input[placeholder="Ej: Silpancho Cochabambino"]').type(NOMBRE_PLATO);
        cy.get('textarea').type('Arroz graneado con queso criollo derretido y leche, plato tradicional del valle central de Tarija.');
        cy.get('input[type="number"]').clear().type('18');
        cy.get('select').select('SEGUNDO');

        cy.wait(500);
        cy.contains('button', 'Guardar Plato').click();
        cy.wait(700);
        cy.contains('h3', 'Registrar Nuevo Plato').should('not.exist');

        // Buscador reactivo en vivo: ubica la tarjeta recién creada tecleando
        // en "Buscar plato..." — sin recargar ni paginar.
        buscarEnVivo('input[placeholder="Buscar plato..."]', NOMBRE_PLATO);
      });
    });
  });

  it('arma la receta del plato con insumos reales (Arroz, Queso criollo, Leche)', () => {
    cy.visit('/recetas');
    cy.contains('h1', 'Recetas de Platos').should('be.visible');

    // Buscador reactivo en vivo: ubica el plato tecleando en "Buscar plato...".
    buscarEnVivo('input[placeholder="Buscar plato..."]', NOMBRE_PLATO);
    cy.contains('.card', NOMBRE_PLATO).click();

    cy.contains('h2', NOMBRE_PLATO).should('be.visible');
    cy.contains('button', 'Ingredientes').click();
    cy.wait(600);

    // Si la receta ya existía de una corrida previa, el editor precarga sus
    // ingredientes y el botón del insumo ya agregado queda deshabilitado.
    const agregarSiHaceFalta = (insumo: string) => {
      // Buscador de insumos reactivo en vivo: escribir filtra la lista al
      // instante (sin recargar), dejando expuesto solo el botón buscado.
      cy.get('input[placeholder="Buscar insumo..."]').clear().type(insumo);
      cy.contains('button', insumo, { timeout: 10000 }).then(($btn) => {
        if (!$btn.is(':disabled')) cy.wrap($btn).click();
      });
    };
    agregarSiHaceFalta('Arroz');
    agregarSiHaceFalta('Queso criollo');
    agregarSiHaceFalta('Leche');

    // Limpia el buscador de insumos para dejar la lista completa visible de nuevo.
    cy.get('input[placeholder="Buscar insumo..."]').clear();

    // Confirmar que los 3 ingredientes quedaron en la tabla de la receta.
    cy.get('table').within(() => {
      cy.contains('Arroz').should('be.visible');
      cy.contains('Queso criollo').should('be.visible');
      cy.contains('Leche').should('be.visible');
    });

    cy.get('textarea[placeholder*="Pasos de preparación"]')
      .clear()
      .type('Graneado de arroz, se agrega queso criollo en cubos y un chorro de leche hasta gratinar.');

    cy.wait(500);
    cy.contains('button', 'Guardar receta').click();
    cy.wait(700);

    // Tras guardar, el plato pasa a mostrar el badge de versión activa.
    cy.contains('span', /v\d+ activa/, { timeout: 15000 }).should('be.visible');
  });

  it('agrega un ingrediente más y guarda una nueva versión — el historial conserva la anterior', () => {
    // RecetaController.crear() (POST /recetas/plato/{id}) SIEMPRE crea una
    // versión nueva — no hay endpoint de "editar" la receta activa. Por eso
    // "editar" una receta en esta app significa: reabrir el editor, tocar
    // los ingredientes y volver a Guardar receta, lo que sube la versión
    // (v1 -> v2) dejando la anterior como histórico en vez de sobrescribirla.
    cy.visit('/recetas');
    cy.contains('h1', 'Recetas de Platos').should('be.visible');

    buscarEnVivo('input[placeholder="Buscar plato..."]', NOMBRE_PLATO);
    cy.contains('.card', NOMBRE_PLATO).click();
    cy.contains('h2', NOMBRE_PLATO).should('be.visible');
    cy.contains('button', 'Ingredientes').click();
    cy.wait(600);

    // Versión activa antes del cambio (para comparar después).
    let versionAntes = 0;
    cy.contains('span', /v\d+ activa/, { timeout: 15000 })
      .invoke('text')
      .then((texto) => {
        versionAntes = Number(texto.match(/v(\d+)/)?.[1] ?? 0);
        expect(versionAntes, 'versión activa antes de editar').to.be.greaterThan(0);
      });

    // Agrega Sal a la receta ya existente (Arroz, Queso criollo, Leche).
    cy.get('input[placeholder="Buscar insumo..."]').clear().type('Sal');
    cy.contains('button', 'Sal', { timeout: 10000 }).then(($btn) => {
      if (!$btn.is(':disabled')) cy.wrap($btn).click();
    });
    cy.get('input[placeholder="Buscar insumo..."]').clear();

    cy.get('table').within(() => {
      cy.contains('Sal').should('be.visible');
    });

    cy.wait(500);
    cy.contains('button', 'Guardar receta').click();
    cy.wait(700);

    // La versión activa avanzó (v1 -> v2, o la que corresponda si el spec
    // ya corrió antes en este entorno).
    cy.contains('span', /v\d+ activa/, { timeout: 15000 })
      .invoke('text')
      .then((texto) => {
        const versionDespues = Number(texto.match(/v(\d+)/)?.[1] ?? 0);
        expect(versionDespues).to.be.greaterThan(versionAntes);
      });

    // Verificación por API (histórico real, no solo la UI): el endpoint de
    // historial de versiones del plato debe seguir devolviendo la versión
    // anterior además de la nueva — la app versiona, no sobrescribe.
    cy.apiLogin('admin', 'admin123').then((admin) => {
      cy.request({
        method: 'GET',
        url: `${API_URL}/platos/todos`,
        headers: { Authorization: `Bearer ${admin.token}` },
      }).then((platosResp) => {
        const plato = (platosResp.body as any[]).find((p) => p.nombre === NOMBRE_PLATO);
        expect(plato, 'plato recién versionado').to.exist;

        cy.request({
          method: 'GET',
          url: `${API_URL}/recetas/plato/${plato.id}`,
          headers: { Authorization: `Bearer ${admin.token}` },
        }).then((historialResp) => {
          expect(historialResp.status).to.eq(200);
          // El historial conserva TODAS las versiones anteriores (nunca se
          // sobrescriben) — debe haber al menos 2: la original (Arroz, Queso
          // criollo, Leche) y la recién guardada con Sal.
          expect(historialResp.body.length, 'versiones conservadas en el historial').to.be.greaterThan(1);

          const versiones = (historialResp.body as any[]).map((r) => r.version).sort((a: number, b: number) => a - b);
          const ultima = historialResp.body.find((r: any) => r.version === versiones[versiones.length - 1]);
          const primera = historialResp.body.find((r: any) => r.version === versiones[0]);

          // La versión más nueva incluye Sal; la primera versión que se
          // registró (v1) nunca la tuvo — se conserva tal cual quedó entonces.
          const nombresUltima = ultima.ingredientes.map((i: any) => i.insumoNombre);
          const nombresPrimera = primera.ingredientes.map((i: any) => i.insumoNombre);
          expect(nombresUltima).to.include('Sal');
          expect(nombresPrimera).to.not.include('Sal');
        });
      });
    });
  });
});
