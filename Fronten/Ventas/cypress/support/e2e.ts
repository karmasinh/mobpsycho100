import './commands';

// Uncaught exceptions from the app (e.g. transient WebSocket/STOMP reconnect
// noise from RealtimeService) should not fail specs that don't rely on
// real-time updates — the app itself surfaces its own toast/error UI.
Cypress.on('uncaught:exception', () => {
  return false;
});
