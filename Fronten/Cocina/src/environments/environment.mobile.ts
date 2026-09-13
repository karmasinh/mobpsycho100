// Config para build empaquetado con Capacitor (Android/iOS).
// Apunta al backend real desplegado en Railway, así la APK funciona en
// cualquier red sin depender de adb reverse/IP LAN del equipo de desarrollo.
export const environment = {
  production: true,
  apiUrl: 'https://shigeru-production.up.railway.app/api',
  ventasUrl: 'https://ventas.tudominio.com',
};
