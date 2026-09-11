// ═══════════════════════════════════════════════════════════════════════
// Capítulo 1 — Iniciar sesión en el sistema de Cocina (La Entrerriana)
//
// Inicia sesión como administrador (accede a todos los sistemas, incluido
// Cocina) desde el formulario real de /login y verifica que el dashboard
// carga con contenido real (título, accesos rápidos).
// ═══════════════════════════════════════════════════════════════════════
describe('01 - Login', () => {
  beforeEach(() => {
    cy.viewport(1366, 800);
  });

  it('rechaza credenciales inválidas mostrando el error real del backend', () => {
    cy.visit('/login');
    cy.get('input[name="username"]').type('usuario_inexistente');
    cy.get('input[name="password"]').type('claveIncorrecta123');
    cy.contains('button[type="submit"]', 'Ingresar al sistema').click();
    cy.wait(700);
    cy.contains('.ent-error', /./, { timeout: 10000 }).should('be.visible');
    cy.location('pathname').should('eq', '/login');
  });

  it('permite iniciar sesión como admin y muestra el Dashboard de Cocina', () => {
    cy.visit('/login');

    // Formulario real: input[name=username]/[name=password], boton submit.
    cy.get('input[name="username"]').type('admin');
    cy.get('input[name="password"]').type('admin123');
    cy.contains('button[type="submit"]', 'Ingresar al sistema').click();
    cy.wait(700);

    // Redirección real a /dashboard tras login exitoso (ver LoginComponent.onLogin).
    cy.location('pathname', { timeout: 10000 }).should('eq', '/dashboard');

    // Contenido real del DashboardComponent.
    cy.contains('h1', 'Dashboard Cocina').should('be.visible');

    // Accesos rápidos reales definidos en dashboard.component.ts.
    cy.contains('a', 'Producción del día').should('be.visible');
    cy.contains('a', 'Cola de pedidos').should('be.visible');
    cy.contains('a', 'Inventario').should('be.visible');
    cy.contains('a', 'Platos y recetas').should('be.visible');

    // Sesión persistida en localStorage (usada por AuthService/JwtInterceptor).
    cy.window().its('localStorage').invoke('getItem', 'restaurante_token').should('exist');
  });

  it('permite iniciar sesión como cocinero1 (rol COCINERO de Casa Matriz)', () => {
    cy.visit('/login');
    cy.get('input[name="username"]').type('cocinero1');
    cy.get('input[name="password"]').type('Cocina123!');
    cy.contains('button[type="submit"]', 'Ingresar al sistema').click();
    cy.wait(700);

    cy.location('pathname', { timeout: 10000 }).should('eq', '/dashboard');
    cy.contains('h1', 'Dashboard Cocina').should('be.visible');
  });
});
