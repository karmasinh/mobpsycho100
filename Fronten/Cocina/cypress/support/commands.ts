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

/**
 * Recorre una tabla/grilla paginada con app-pagination (botón
 * "Página siguiente") página por página hasta encontrar `texto` en el
 * contenido visible, dejando esa página activa. Si ya está en la página
 * actual no avanza.
 *
 * Usado por los specs de tutorial contra varias pantallas de catálogo
 * (insumos, categorías, proveedores, sucursales, roles, módulos, empleados)
 * cuyo <input> de búsqueda en vivo no vuelve a filtrar tras la carga inicial
 * — el computed() de la lista filtrada lee `busqueda` como propiedad plana
 * (no signal), así que escribir en el buscador no lo invalida y la tabla se
 * queda mostrando todos los registros sin filtrar. Tampoco se puede asumir
 * que un registro recién creado caiga siempre en la última página: el orden
 * que devuelve el backend no es necesariamente por fecha de creación (p.ej.
 * insumos.component ordena de forma que agrupa según categoría). Por eso se
 * recorre página por página buscando el texto real, en vez de adivinar su
 * posición.
 */
Cypress.Commands.add('buscarEnPaginas', (texto: string, maxPaginas = 30) => {
  const buscar = (intentosRestantes: number): void => {
    cy.get('body').then(($body) => {
      if ($body.text().includes(texto) || intentosRestantes <= 0) return;
      const boton = $body.find('button[aria-label="Página siguiente"]');
      if (boton.length > 0 && !boton.is(':disabled')) {
        cy.wrap(boton).click();
        cy.wait(200);
        buscar(intentosRestantes - 1);
      }
    });
  };
  buscar(maxPaginas);
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Log in through the real login UI and wait for redirect out of /login. */
      login(username: string, password: string): Chainable<void>;
      /** Log in via the backend REST API and return the LoginResponse body. */
      apiLogin(username: string, password: string): Chainable<any>;
      /** Recorre una tabla paginada (app-pagination) hasta encontrar `texto`. */
      buscarEnPaginas(texto: string, maxPaginas?: number): Chainable<void>;
    }
  }
}

export {};
