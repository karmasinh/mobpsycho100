// Config para build empaquetado con Capacitor (Android/iOS).
// 'localhost' no sirve en un dispositivo/emulador real por sí solo, pero con
// `adb reverse tcp:8080 tcp:8080` (dispositivo físico por USB) el propio
// localhost del teléfono queda mapeado al localhost de la PC anfitriona —
// así probamos en un dispositivo real sin depender de la IP LAN ni WiFi.
// - Emulador de Android Studio (AVD): usar 10.0.2.2 en su lugar (alias fijo
//   del emulador hacia el localhost del host).
// - Dispositivo físico sin `adb reverse` (o backend desplegado): reemplazar
//   por la IP LAN de la PC (ej. 192.168.1.50) o la URL del backend real.
export const environment = {
  production: true,
  apiUrl: 'http://localhost:8080/api',
  ventasUrl: 'http://localhost:4201',
};
