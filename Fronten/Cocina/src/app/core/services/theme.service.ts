import { Injectable, signal, effect } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { Theme, ThemeName } from '../models';

// Actualizar ThemeName en models.ts:
// export type ThemeName = 'fuego' | 'nocturno' | 'aurora' | 'nube' | 'rosa' | 'carbon';

@Injectable({ providedIn: 'root' })
export class ThemeService {

  readonly THEMES: Theme[] = [
    { id: 'entrerriana', nombre: 'Entrerriana', descripcion: 'La Entrerriana — verde, dorado y crema', emoji: '🌿', color: '#C49A5A' },
    { id: 'fuego',       nombre: 'Fuego',       descripcion: 'Oscuro industrial — carbón y naranja llama',   emoji: '🔥', color: '#EA580C' },
    { id: 'nocturno',    nombre: 'Noche',       descripcion: 'Midnight azul — elegante y frío',              emoji: '🌙', color: '#6366F1' },
    { id: 'aurora',      nombre: 'Aurora',      descripcion: 'Esmeralda oscuro — moderno y fresco',          emoji: '🍃', color: '#34D399' },
    { id: 'nube',        nombre: 'Nube',        descripcion: 'Lavanda claro — limpio y amigable',            emoji: '☁️', color: '#6366F1' },
    { id: 'rosa',        nombre: 'Rosa',        descripcion: 'Coral sunset — cálido y vibrante',             emoji: '🌸', color: '#F43F5E' },
    { id: 'carbon',      nombre: 'Carbón',      descripcion: 'Negro ultra — minimalista profesional',        emoji: '⬛', color: '#FAFAFA' },
  ];

  /** Color principal de un tema, para el cuadradito del selector de apariencia. */
  colorFor(id: string): string {
    return this.THEMES.find(t => t.id === id)?.color ?? '#999';
  }

  // Temas oscuros
  private readonly DARK_THEMES: ThemeName[] = ['fuego', 'nocturno', 'aurora', 'rosa', 'carbon'];

  private readonly THEME_KEY = 'restaurante-cocina-theme';

  currentTheme = signal<ThemeName>(this.cargarTemaGuardado());

  constructor() {
    effect(() => {
      this.aplicarTema(this.currentTheme());
    });
    // Rehidrata desde Preferences por si localStorage fue purgado en nativo (iOS).
    Preferences.get({ key: this.THEME_KEY }).then(({ value }) => {
      const valid = this.THEMES.map(t => t.id);
      if (value && valid.includes(value as ThemeName) && value !== this.currentTheme()) {
        this.currentTheme.set(value as ThemeName);
      }
    });
  }

  setTheme(theme: ThemeName): void {
    this.currentTheme.set(theme);
    localStorage.setItem(this.THEME_KEY, theme);
    Preferences.set({ key: this.THEME_KEY, value: theme });
  }

  getThemeInfo(id: ThemeName): Theme {
    return this.THEMES.find(t => t.id === id) ?? this.THEMES[0];
  }

  isDark(): boolean {
    return this.DARK_THEMES.includes(this.currentTheme());
  }

  private cargarTemaGuardado(): ThemeName {
    const saved = localStorage.getItem(this.THEME_KEY) as ThemeName;
    const valid = this.THEMES.map(t => t.id);
    return valid.includes(saved) ? saved : 'entrerriana';
  }

  private aplicarTema(theme: ThemeName): void {
    const html = document.documentElement;
    this.THEMES.forEach(t => html.classList.remove(`theme-${t.id}`));
    html.classList.add(`theme-${theme}`);
    // Misma fuente de verdad que isDark() — antes esto solo excluía 'nube' a mano
    // y dejaba 'entrerriana' (tema claro) marcado como oscuro por error.
    html.classList.toggle('dark', this.DARK_THEMES.includes(theme));
  }
}