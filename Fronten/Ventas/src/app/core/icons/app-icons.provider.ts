import { Provider } from '@angular/core';
import {
  provideLucideIcons,
  LucideChefHat,
  LucideClipboardList,
  LucideFlame,
  LucideBookOpen,
  LucideUtensils,
  LucidePackage,
  LucideDatabase,
  LucideTruck,
  LucideBell,
  LucideTag,
  LucideFileText,
  LucideDollarSign,
  LucideWallet,
  LucideShoppingBag,
  LucideUsers,
  LucideUserCheck,
  LucideCreditCard,
  LucideCalendarCheck,
  LucideSettings,
  LucideIdCard,
  LucideShield,
  LucideUserCog,
  LucideBuilding,
  LucideTrash2,
  LucideChartNoAxesColumn,
  LucideHistory,
  LucideChartNoAxesColumnIncreasing,
  LucideTriangleAlert,
  LucidePanelsTopLeft,
  LucideCircleCheck,
} from '@lucide/angular';

/**
 * Íconos Lucide usados por el campo `icono` de los módulos de menú sembrados en el
 * backend (`DataInitializer.cargarModulos`). `LucideChartNoAxesColumn`/
 * `LucideChartNoAxesColumnIncreasing`/`LucideTriangleAlert`/`LucidePanelsTopLeft` cubren los
 * nombres históricos ("bar-chart-2", "bar-chart", "alert-triangle", "layout") vía los alias
 * que trae cada ícono; `LucideTrash2`/`LucideHistory` son los nombres directos de "trash-2"/
 * "history" en esta versión del paquete (1.23.0 — fijada por compatibilidad con Angular 17.3,
 * ver nota en `provideAppIcons`).
 */
const ICONOS = [
  LucideChefHat,
  LucideClipboardList,
  LucideFlame,
  LucideBookOpen,
  LucideUtensils,
  LucidePackage,
  LucideDatabase,
  LucideTruck,
  LucideBell,
  LucideTag,
  LucideFileText,
  LucideDollarSign,
  LucideWallet,
  LucideShoppingBag,
  LucideUsers,
  LucideUserCheck,
  LucideCreditCard,
  LucideCalendarCheck,
  LucideSettings,
  LucideIdCard,
  LucideShield,
  LucideUserCog,
  LucideBuilding,
  LucideTrash2,
  LucideChartNoAxesColumn,
  LucideHistory,
  LucideChartNoAxesColumnIncreasing,
  LucideTriangleAlert,
  LucidePanelsTopLeft,
  LucideCircleCheck,
] as const;

/**
 * @lucide/angular queda fijado en 1.23.0 (no "latest"): desde la 1.25.0 el paquete usa la
 * sintaxis de control de flujo `@let` en sus plantillas internas, soportada recién desde
 * Angular 18.2 — este proyecto está en Angular 17.3 y el build de producción falla (NG8xxx)
 * al compilar esas plantillas si se sube de versión.
 */
export function provideAppIcons(): Provider {
  return provideLucideIcons(...ICONOS);
}

/**
 * Nombres (kebab-case), incluidos alias, que `<svg [lucideIcon]="...">` puede resolver.
 * Úsalo para validar strings de ícono que vienen de datos libres (ej. el campo "icono" del
 * CRUD de Módulos, donde el admin escribe el nombre a mano) antes de enlazarlos — un nombre
 * no registrado hace que `LucideDynamicIcon` lance una excepción en vez de mostrar nada.
 */
export const ICONOS_DISPONIBLES: ReadonlySet<string> = new Set(
  ICONOS.flatMap(c => [c.icon.name, ...(c.icon.aliases ?? [])]),
);
