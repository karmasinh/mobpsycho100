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

Ambas apps apuntan al backend configurado en `environment.mobile.ts` de cada proyecto (por defecto, la IP LAN configurada al momento del build). Si el backend corre en otra dirección, hay que reconstruir la APK con `npm run build:mobile` tras actualizar ese archivo — ver `Fronten/Ventas/README.md` / `Fronten/Cocina/README.md` si existen, o el `AGENTS.md` raíz del proyecto.

Generadas: 2026-09-11.
