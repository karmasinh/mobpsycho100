// Chapter 23 — Cobros mensuales de pensionados
// CAJERO holds MOD_COBROS (DataInitializer.java) so cajero1 is a real user of
// this screen, not just admin. cobros.component.ts lists CobroMensual rows
// (PensionadoService.cobrosPendientes()) and the only real write action is
// "Registrar pago" -> registrarPago(), a partial/total payment against
// saldoRestante with a forma de pago (EFECTIVO/QR/MIXTO).
describe('23 - Cobros', () => {
  beforeEach(() => {
    cy.login('cajero1', 'Cajero123!');
    cy.visit('/cobros');
    cy.contains('h1', 'Cobros Mensuales').should('be.visible');
  });

  it('loads real cobros and registers a payment when one is pending', () => {
    // cargando starts true and the pensionadoService.cobrosPendientes() call
    // in ngOnInit() resolves it — while true, tbody renders 4 skeleton <tr>
    // placeholders, which a plain "tbody tr" count would wrongly count as
    // real rows. Wait for those to be gone before reading real content.
    cy.get('table tbody .skeleton', { timeout: 15000 }).should('not.exist');
    cy.wait(600);

    cy.get('body').then($body => {
      const hayPendientes = $body.find('button:contains("Registrar pago")').length > 0;

      if (!hayPendientes) {
        // No hay cobros pendientes hoy (todos ya pagados o sin pensionados con
        // deuda) — se demuestra igual el cambio de vista y la búsqueda, que
        // son interacciones reales del componente.
        cy.contains('button', 'Todos').click();
        cy.wait(600);
        cy.get('table tbody tr', { timeout: 10000 }).should('have.length.greaterThan', 0);
        return;
      }

      cy.contains('table tbody tr', 'Registrar pago').first().within(() => {
        cy.get('span.font-semibold').invoke('text').as('pensionadoNombre');
        cy.contains('button', 'Registrar pago').click();
      });
      cy.wait(600);
      cy.contains('Registrar Pago').should('be.visible');

      cy.get('@pensionadoNombre').then(nombre => {
        cy.contains(String(nombre).trim()).should('be.visible');
      });

      // Pagar el monto sugerido (saldoRestante, precargado como placeholder
      // y como valor inicial de montoPago) con Forma de pago QR.
      cy.get('.card select').select('QR');
      cy.wait(500);
      cy.contains('button', 'Confirmar pago').click();

      cy.contains('Pago registrado', { timeout: 15000 }).should('be.visible');
      cy.wait(700);
      cy.contains('Registrar Pago').should('not.exist');
    });
  });
});
