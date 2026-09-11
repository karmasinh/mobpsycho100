import { addCollection } from 'iconify-icon';
import iconosBundleados from './iconos-bundleados.json';

/**
 * Mapa de nombre lógico → ícono Iconify ("prefix:nombre"). Reemplaza el sistema Lucide
 * anterior. Dos librerías conviven a propósito (decisión del 2026-09-10, ver
 * Luciana/Alison Docs 10_BACKLOG_Y_CAMBIOS.md — bloque "migración de íconos"):
 *
 * - `line-md` (Material Line Icons, con animación de trazo nativa) para íconos de
 *   ACCIÓN EFÍMERA (botones, toasts, badges, toggle de tema) — se investigó a fondo y
 *   esta librería NO tiene íconos de sustantivos de dominio (no hay "users", "shield",
 *   "package", "database", etc.), así que solo se usa donde realmente tiene el ícono.
 * - `tabler` (cobertura completa, ~6200 íconos, mismos nombres que los Lucide que
 *   reemplaza) para TODO lo demás: navegación persistente (sidebar/bottom-nav/módulos)
 *   y sustantivos de dominio en toda la UI.
 *
 * Cada nombre fue verificado contra `api.iconify.design/collection?prefix=...` antes de
 * escribirse acá — no hay nombres adivinados.
 */
export const ICONO_MAP: Record<string, string> = {
  // ── Navegación persistente (sidebar/bottom-nav) — mismos nombres que DataInitializer.cargarModulos() ──
  'chef-hat': 'tabler:chef-hat',
  'clipboard-list': 'tabler:clipboard-list',
  'flame': 'tabler:flame',
  'book-open': 'tabler:book-2',
  'utensils': 'tabler:tools-kitchen-2',
  'package': 'tabler:package',
  'database': 'tabler:database',
  'truck': 'tabler:truck',
  'bell': 'tabler:bell',
  'tag': 'tabler:tag',
  'trash-2': 'tabler:trash',
  'bar-chart-2': 'tabler:chart-bar',
  'file-text': 'tabler:file-text',
  'dollar-sign': 'tabler:currency-dollar',
  'wallet': 'tabler:wallet',
  'shopping-bag': 'tabler:shopping-bag',
  'users': 'tabler:users',
  'user-check': 'tabler:user-check',
  'credit-card': 'tabler:credit-card',
  'calendar-check': 'tabler:calendar-check',
  'history': 'tabler:history',
  'bar-chart': 'tabler:chart-bar',
  'circle-check': 'tabler:circle-check',
  'settings': 'tabler:settings',
  'id-card': 'tabler:id-badge',
  'shield': 'tabler:shield',
  'user-cog': 'tabler:user-cog',
  'building': 'tabler:building',
  'alert-triangle': 'tabler:alert-triangle',
  'layout': 'tabler:layout-grid',

  // ── Reemplazo de emoji: acción efímera (line-md animado) ──
  'confirmar': 'line-md:confirm-circle',
  'error': 'line-md:close-circle',
  'info': 'tabler:info-circle',
  'advertencia': 'tabler:alert-triangle',
  'buscar': 'line-md:search',
  'editar': 'line-md:edit',
  'cerrar': 'line-md:close',
  'luna': 'line-md:moon',
  'campana': 'line-md:bell',
  'calendario': 'line-md:calendar',
  'agregar': 'line-md:plus-circle',
  'quitar': 'line-md:minus-circle',
  'cargando': 'line-md:loading-loop',
  'usuario': 'line-md:account',

  // ── Reemplazo de emoji: sustantivo de dominio (tabler) ──
  'tienda': 'tabler:building-store',
  'candado': 'tabler:lock',
  'recibo': 'tabler:receipt',
  'casa': 'tabler:home',
  'plato': 'tabler:tools-kitchen-2',
  'sopa': 'tabler:bowl',
  'guiso': 'tabler:soup',
  'te': 'tabler:cup',
  'reloj-arena': 'tabler:hourglass',
  'papelera': 'tabler:trash',
  'documento': 'tabler:file',
  'estrella': 'tabler:star',
  'amanecer': 'tabler:sunrise',
  'atardecer': 'tabler:sunset-2',
  'tendencia': 'tabler:trending-up',
  'carrito': 'tabler:shopping-cart',
  'reloj': 'tabler:clock',
  'ojo': 'tabler:eye',
  'ojo-cerrado': 'tabler:eye-off',
  'impresora': 'tabler:printer',
  'telefono': 'tabler:phone',
  'correo': 'tabler:mail',
  'ubicacion': 'tabler:map-pin',
  'refrescar': 'tabler:refresh',
  'filtro': 'line-md:filter',
  'lista': 'tabler:list',
  'check-simple': 'tabler:check',
  'x': 'tabler:x',
  'descargar': 'line-md:download-loop',
  'subir': 'line-md:upload-loop',
  'certificado': 'tabler:certificate',
  'almacen': 'tabler:building-warehouse',
  'balanza': 'tabler:scale',
  'paleta': 'tabler:palette',
};

let registrado = false;

/**
 * Registra en memoria (sin red) el bundle curado `iconos-bundleados.json` — generado con un
 * script one-off a partir de `@iconify-json/tabler`/`@iconify-json/line-md`, con solo los
 * íconos listados en `ICONO_MAP` (~57, no las ~7400 de ambos paquetes completos). Importar los
 * paquetes completos directamente en el componente hace que esbuild los empaquete enteros en
 * el bundle final (~3.6 MB, supera el budget) aunque el filtrado ocurra en runtime — de ahí
 * este archivo intermedio, regenerable con el script si `ICONO_MAP` cambia (ver
 * `Alison Docs`/`Luciana Docs` 10_BACKLOG_Y_CAMBIOS.md para el comando exacto).
 *
 * Crítico para la app móvil (Capacitor): sin esto, `<iconify-icon>` pediría cada ícono a la
 * API pública de Iconify en runtime, lo cual no funciona offline. Llamar una vez desde
 * `main.ts`, antes de `bootstrapApplication`.
 */
export function registrarIconosUsados(): void {
  if (registrado) return;
  registrado = true;

  addCollection(iconosBundleados.tabler);
  addCollection(iconosBundleados.lineMd);
}

/**
 * Íconos Iconify completos ("prefix:nombre") realmente registrados/bundleados — el backend
 * siembra el campo `icono` de cada módulo con uno de estos valores directamente (ej.
 * "tabler:chef-hat"). Úsalo para validar strings de ícono que vienen de datos libres (ej. el
 * campo "icono" del CRUD de Módulos, donde el admin escribe el valor a mano) antes de
 * enlazarlos — un valor no registrado no debe pasar a `<iconify-icon>`.
 */
export const ICONOS_DISPONIBLES: ReadonlySet<string> = new Set(Object.values(ICONO_MAP));
