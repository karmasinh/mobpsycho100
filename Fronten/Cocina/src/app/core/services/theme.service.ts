import { Injectable, signal, effect } from '@angular/core';
import { Theme, ThemeName } from '../models';

// Actualizar ThemeName en models.ts:
// export type ThemeName = 'fuego' | 'nocturno' | 'aurora' | 'nube' | 'rosa' | 'carbon';

@Injectable({ providedIn: 'root' })
export class ThemeService {

  readonly THEMES: Theme[] = [
    { id: 'entrerriana', nombre: 'Entrerriana', descripcion: 'La Entrerriana — verde, dorado y crema', emoji: '🌿' },
    { id: 'fuego',       nombre: 'Fuego',       descripcion: 'Oscuro industrial — carbón y naranja llama',   emoji: '🔥' },
    { id: 'nocturno',    nombre: 'Noche',       descripcion: 'Midnight azul — elegante y frío',              emoji: '🌙' },
    { id: 'aurora',      nombre: 'Aurora',      descripcion: 'Esmeralda oscuro — moderno y fresco',          emoji: '🍃' },
    { id: 'nube',        nombre: 'Nube',        descripcion: 'Lavanda claro — limpio y amigable',            emoji: '☁️' },
    { id: 'rosa',        nombre: 'Rosa',        descripcion: 'Coral sunset — cálido y vibrante',             emoji: '🌸' },
    { id: 'carbon',      nombre: 'Carbón',      descripcion: 'Negro ultra — minimalista profesional',        emoji: '⬛' },
  ];

  // Temas oscuros
  private readonly DARK_THEMES: ThemeName[] = ['fuego', 'nocturno', 'aurora', 'rosa', 'carbon'];

  currentTheme = signal<ThemeName>(this.cargarTemaGuardado());

  constructor() {
    effect(() => {
      this.aplicarTema(this.currentTheme());
    });
  }

  setTheme(theme: ThemeName): void {
    this.currentTheme.set(theme);
    localStorage.setItem('restaurante-cocina-theme', theme);
  }

  getThemeInfo(id: ThemeName): Theme {
    return this.THEMES.find(t => t.id === id) ?? this.THEMES[0];
  }

  isDark(): boolean {
    return this.DARK_THEMES.includes(this.currentTheme());
  }

  private cargarTemaGuardado(): ThemeName {
    const saved = localStorage.getItem('restaurante-cocina-theme') as ThemeName;
    const valid = this.THEMES.map(t => t.id);
    return valid.includes(saved) ? saved : 'entrerriana';
  }

  private aplicarTema(theme: ThemeName): void {
    const html = document.documentElement;
    this.THEMES.forEach(t => html.classList.remove(`theme-${t.id}`));
    html.classList.add(`theme-${theme}`);

    if (theme === 'nube') {
      html.classList.remove('dark');
    } else {
      html.classList.add('dark');
    }
  }
}