import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.laentrerriana.cocina',
  appName: 'Restaurante Cocina',
  webDir: 'dist/restaurante-cocina/browser',
  server: {
    // El backend de desarrollo corre en HTTP plano (sin certificado). Si la app
    // se sirve en https://localhost (default de Capacitor en Android) el WebView
    // bloquea las llamadas HTTP como "Mixed Content". Sirviendo en http://localhost
    // evita ese bloqueo mientras el backend no tenga HTTPS real.
    androidScheme: 'http'
  }
};

export default config;
