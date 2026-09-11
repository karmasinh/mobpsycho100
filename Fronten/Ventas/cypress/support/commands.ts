/// <reference types="cypress" />

// -----------------------------------------------------------------------
// Custom command: cy.login(username, password)
// Visits the real /login route, fills the real template-driven form
// (name="username" / name="password"), submits it, and waits for the
// authGuard-driven redirect to /dashboard (see login.component.ts,
// auth.guard.ts and app.routes.ts in src/app).
// -----------------------------------------------------------------------
Cypress.Commands.add('login', (username: string, password: string) => {
  // cy.session caches localStorage (JWT + user) across tests in the same run
  // for this (username, password) pair — Cypress clears storage between
  // tests by default (testIsolation), so without this every it() would need
  // to re-submit the real login form.
  cy.session(
    [username, password],
    () => {
      cy.visit('/login');
      cy.get('input[name="username"]').clear().type(username);
      cy.get('input[name="password"]').clear().type(password);
      cy.get('button[type="submit"]').contains('Iniciar sesión').click();
      cy.url({ timeout: 15000 }).should('include', '/dashboard');
      cy.contains('h1', 'Dashboard', { timeout: 15000 }).should('be.visible');
    },
    {
      validate: () => {
        cy.window().its('localStorage').invoke('getItem', 'restaurante_ventas_token').should('exist');
      },
    },
  );
  cy.visit('/dashboard');
  cy.contains('h1', 'Dashboard', { timeout: 15000 }).should('be.visible');
});

// -----------------------------------------------------------------------
// Custom command: cy.ensureTurnoAbierto()
// /caja refuses to cobrar without an open shift ("Debe abrir un turno de
// caja antes de cobrar" — see caja.component.ts / ventaService.cobrar).
// Visits /cierre-caja and opens a turno for the current user if one isn't
// already open, using the real form (see cierre-caja.component.ts).
// -----------------------------------------------------------------------
Cypress.Commands.add('ensureTurnoAbierto', () => {
  cy.visit('/cierre-caja');
  cy.contains('h1', 'Cierre de caja').should('be.visible');
  cy.get('body').then($body => {
    if ($body.find('[data-cy="btn-abrir-turno"]').length) {
      cy.get('[data-cy="input-monto-inicial"]').type('100');
      cy.get('[data-cy="btn-abrir-turno"]').click();
      cy.contains('Turno abierto', { timeout: 15000 }).should('be.visible');
    }
  });
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /**
       * Logs in through the real login form at /login and waits for the
       * redirect to /dashboard.
       */
      login(username: string, password: string): Chainable<void>;

      /**
       * Opens a cierre-caja turno for the current user if one isn't already
       * open — required before /caja allows cobrar().
       */
      ensureTurnoAbierto(): Chainable<void>;
    }
  }
}

export {};
