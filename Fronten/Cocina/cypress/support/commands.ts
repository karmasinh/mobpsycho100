/// <reference types="cypress" />

// ── Custom commands for the Cocina (La Entrerriana) E2E training specs ──

/** Backend API base URL (see src/environments/environment.ts). */
export const API_URL = 'http://localhost:8080/api';

/**
 * Logs in through the real login form at /login (username `admin` / a real
 * seeded cocina role) and waits for the redirect to an authenticated route
 * (dashboard by default). Selectors match src/app/features/auth/login.component.ts.
 */
Cypress.Commands.add('login', (username: string, password: string) => {
  cy.session(
    [username, password],
    () => {
      cy.visit('/login');
      cy.get('input[name="username"]').clear().type(username);
      cy.get('input[name="password"]').clear().type(password);
      cy.contains('button[type="submit"]', /Ingresar al sistema|Ingresando/).click();
      cy.location('pathname', { timeout: 10000 }).should('not.eq', '/login');
    },
    {
      validate: () => {
        cy.window().its('localStorage').invoke('getItem', 'restaurante_token').should('exist');
      },
    }
  );
});

/**
 * Logs in via the backend REST API directly (no UI), returning the login
 * response (token, usuarioId, rol, sucursalId, ...). Used to seed data
 * (e.g. create a pedido as admin/cajero) before exercising the Cocina UI.
 */
Cypress.Commands.add('apiLogin', (username: string, password: string) => {
  return cy
    .request('POST', `${API_URL}/auth/login`, { username, password })
    .then((resp) => resp.body);
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Log in through the real login UI and wait for redirect out of /login. */
      login(username: string, password: string): Chainable<void>;
      /** Log in via the backend REST API and return the LoginResponse body. */
      apiLogin(username: string, password: string): Chainable<any>;
    }
  }
}

export {};
