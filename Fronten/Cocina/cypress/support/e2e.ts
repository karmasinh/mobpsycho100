import './commands';

// The app throws no uncaught global errors under normal operation; if a rare
// third-party (e.g. iconify, audio context) exception slips through it
// shouldn't fail an otherwise-passing tutorial spec.
Cypress.on('uncaught:exception', () => false);

// ── Ritmo humano para la grabación del tutorial ──────────────────────────
// Todo cy.type(...) usa un delay de 60ms entre teclas por defecto, salvo que
// el propio call site especifique su propio `delay`. Esto evita que el texto
// aparezca "de golpe" en los videos grabados, sin tener que tocar cada
// llamada individual de cy.type en los specs.
Cypress.Commands.overwrite('type', (originalFn, subject, text, options = {}) => {
  return originalFn(subject, text, { delay: 60, ...options });
});
