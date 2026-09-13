# APKs de depuración (debug)

APKs Android generadas con Capacitor a partir del código de `Fronten/Ventas` y `Fronten/Cocina`. Son builds **debug**, sin firmar para producción — pensadas para instalar y probar en un emulador o dispositivo físico durante el desarrollo/tesis, no para publicar en una tienda.

| Archivo | Proyecto | appId |
|---|---|---|
| `ventas-debug.apk` | Sistema Ventas | `com.laentrerriana.ventas` |
| `cocina-debug.apk` | Sistema Cocina | `com.laentrerriana.cocina` |

## Instalar

```bash
adb install -r ventas-debug.apk
adb install -r cocina-debug.apk
```

Ambas apps apuntan al backend real desplegado en Railway (`https://shigeru-production.up.railway.app/api`, configurado en `environment.mobile.ts` de cada proyecto) — funcionan en cualquier red con internet, sin depender de la IP LAN del equipo de desarrollo. Si el backend cambia de URL, hay que actualizar `environment.mobile.ts` y reconstruir con `npm run build -- --configuration mobile` + `npx cap sync android` + `gradlew assembleDebug`.

Generadas: 2026-09-12 (backend en producción, Railway).
