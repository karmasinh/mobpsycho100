// Chapter 24 — Asistencia diaria de pensionados
// /asistencia (asistencia.component.ts) is a DIFFERENT screen from the
// per-pensionado "ver asistencia" side panel already covered in
// 04-pensionados.cy.ts: this one is a daily dashboard grid over ALL
// pensionados at once (progress bar, "marcar todos presentes", search), not a
// single-pensionado modal. CAJERO holds MOD_ASISTENCIA (DataInitializer.java)
// so this run uses cajero1 instead of admin — a different entry point/role
// than chapter 4, on a screen chapter 4 never visits.
describe('24 - Asistencia', () => {
  beforeEach(() => {
    cy.login('cajero1', 'Cajero123!');
    cy.visit('/asistencia');
    cy.contains('h1', 'Asistencia').should('be.visible');
  });

  it('loads the daily grid and marks a pending pensionado present', () => {
    // cargando starts true (signal(true)); the "X asistieron" / "Y
    // pendientes" badges are computed()s that render (as 0/0) even before
    // data loads, so they can't be used as the load-finished signal. The 6
    // skeleton cards in the grid, however, only exist while cargando() is
    // true — wait for those to be gone first.
    cy.get('.skeleton', { timeout: 15000 }).should('not.exist');
    cy.contains(/asistieron/).should('be.visible');
    cy.wait(600);

    // Búsqueda en vivo sobre el grid.
    cy.get('input[placeholder="Buscar pensionado..."]').type('a', { delay: 60 });
    cy.wait(500);
    cy.get('input[placeholder="Buscar pensionado..."]').clear();
    cy.wait(500);

    cy.intercept('POST', '**/pensionados/*/asistencia').as('marcarAsistencia');

    cy.get('body').then($body => {
      // Botón "+" real y habilitado = pensionado que todavía no asistió hoy.
      const pendientes = $body.find('button').filter((_, el) =>
        el.textContent?.trim() === '+' && !(el as any).disabled
      );

      if (pendientes.length === 0) {
        // Todos ya asistieron hoy en esta base (por ejemplo si esta suite ya
        // corrió antes en el día) — el estado real es que no queda nadie
        // pendiente, así que solo se confirma eso.
        cy.contains('0 pendientes').should('be.visible');
        return;
      }

      cy.wrap(pendientes.first()).click();
      cy.wait('@marcarAsistencia').then(interception => {
        if (interception.response?.statusCode === 409) {
          // Real race with another test/run that marked the same pensionado
          // present between this grid's load and the click — the backend
          // correctly rejects a duplicate asistencia for today. That's a
          // legitimate outcome, not a UI bug, so it's accepted here rather
          // than asserted away.
          cy.log('El pensionado ya tenía asistencia registrada hoy (409) — estado real aceptado.');
        } else {
          cy.contains('button', '✓', { timeout: 10000 }).should('be.visible');
        }
      });
    });
  });
});
