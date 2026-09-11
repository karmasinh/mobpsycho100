// Chapter 1 — Login
// Logs in as the seeded ADMIN user (admin / admin123, DataInitializer.java)
// through the real login form and verifies the dashboard renders real content.
describe('01 - Login', () => {
  it('logs in as admin and lands on a real dashboard', () => {
    cy.visit('/login');

    cy.contains('LA', { matchCase: false }).should('exist');
    cy.get('input[name="username"]').type('admin', { delay: 60 });
    cy.get('input[name="password"]').type('admin123', { delay: 60 });
    cy.get('button[type="submit"]').contains('Iniciar sesión').click();

    cy.url({ timeout: 15000 }).should('include', '/dashboard');
    cy.contains('h1', 'Dashboard').should('be.visible');
    cy.contains('Resumen del día').should('be.visible');
    cy.contains('Ventas del día').should('be.visible');
    cy.contains('Clientes activos').should('be.visible');
    cy.wait(500);
  });

  it('rejects an invalid password with a real error message', () => {
    cy.visit('/login');
    cy.get('input[name="username"]').type('admin', { delay: 60 });
    cy.get('input[name="password"]').type('password-incorrecta-123', { delay: 60 });
    cy.get('button[type="submit"]').contains('Iniciar sesión').click();

    cy.url().should('include', '/login');
    cy.get('.ent-error', { timeout: 10000 }).should('be.visible');
    cy.wait(700);
  });
});
