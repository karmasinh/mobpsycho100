// Chapter 21 — Centro de alertas
// /alertas has no MOD_* guard (just authGuard, see app.routes.ts), so any
// logged-in user can see it. It shows AlertaSistema rows fed by the backend
// scheduled jobs (inventory expiry, cliente inactivo, pensionado baja, login
// bloqueado — see alertas.component.ts tipoLabel()). The only real
// interactions are: filter by tipo (stat-card click), marcar una alerta como
// leída, and marcar todas como leídas.
describe('21 - Alertas', () => {
  beforeEach(() => {
    cy.login('admin', 'admin123');
    cy.visit('/alertas');
    cy.contains('h1', 'Centro de alertas').should('be.visible');
  });

  it('loads real alertas and demonstrates filter + marcar leída', () => {
    // cargando starts true (signal(true)) and cargar() resolves it, swapping
    // the 3 skeleton bars for either real alerta cards or the empty state.
    // Wait for the loading signal to resolve before reading any content.
    cy.get('.skeleton', { timeout: 15000 }).should('not.exist');
    cy.wait(600);

    cy.get('body').then($body => {
      const hayAlertas = $body.find('[title="Marcar como leída"]').length > 0;

      if (!hayAlertas) {
        // Nothing pending right now (a previous run in this suite already
        // cleared them, or the scheduled jobs haven't produced any today) —
        // the empty state itself is the real content, nothing else to drive.
        cy.contains('No hay alertas pendientes').should('be.visible');
        return;
      }

      // Filtrar por tipo: click en la primera stat-card de grupos().
      cy.get('.stat-card').first().click();
      cy.wait(600);
      cy.contains('Quitar filtro').should('be.visible');
      cy.wait(500);
      cy.contains('Quitar filtro').click();
      cy.wait(500);

      // Marcar una sola alerta como leída y confirmar que desaparece de la lista.
      cy.get('[title="Marcar como leída"]').first().parents('.flex.items-start').first()
        .find('p.text-sm').first().invoke('text').then(mensaje => {
          cy.get('[title="Marcar como leída"]').first().click();
          cy.wait(700);
          cy.contains(mensaje.trim()).should('not.exist');
        });

      // Marcar todas como leídas, si queda alguna.
      cy.get('body').then($body2 => {
        if ($body2.find('button:contains("Marcar todas como leídas")').length) {
          cy.contains('button', 'Marcar todas como leídas').click();
          cy.contains('No hay alertas pendientes', { timeout: 10000 }).should('be.visible');
          cy.wait(700);
        }
      });
    });
  });
});
