import { Injectable, signal, effect } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

export type VentasTheme = 'entrerriana' | 'lila' | 'celeste' | 'noche' | 'rosa';

export interface VentasThemeInfo {
  id: VentasTheme;
  nombre: string;
  descripcion: string;
  emoji: string;
  color: string;
}

@Injectable({ providedIn: 'root' })
export class ThemeService {

  readonly THEMES: VentasThemeInfo[] = [
    { id: 'entrerriana', nombre: 'Entrerriana', descripcion: 'La Entrerriana — verde, dorado y crema', emoji: '🌿', color: '#C49A5A' },
    { id: 'lila',        nombre: 'Lila',        descripcion: 'Violeta suave — elegante y moderno',     emoji: '💜', color: '#7C3AED' },
    { id: 'celeste',     nombre: 'Celeste',     descripcion: 'Azul cielo — fresco y profesional',       emoji: '🩵', color: '#0EA5E9' },
    { id: 'noche',       nombre: 'Noche',       descripcion: 'Oscuro profundo — moderno y contrastado', emoji: '🌙', color: '#8B5CF6' },
    { id: 'rosa',        nombre: 'Rosa',        descripcion: 'Cálido y acogedor — pensión familiar',    emoji: '🌸', color: '#EC4899' },
  ];

  /** Color principal de un tema, para el cuadradito del selector de apariencia. */
  colorFor(id: string): string {
    return this.THEMES.find(t => t.id === id)?.color ?? '#999';
  }

  private readonly THEME_KEY = 'restaurante-ventas-theme';

  currentTheme = signal<VentasTheme>(this.cargarTema());

  constructor() {
    effect(() => this.aplicarTema(this.currentTheme()));
    // Rehidrata desde Preferences por si localStorage fue purgado en nativo (iOS).
    Preferences.get({ key: this.THEME_KEY }).then(({ value }) => {
      if (value && value !== this.currentTheme()) this.currentTheme.set(value as VentasTheme);
    });
  }

  setTheme(theme: VentasTheme): void {
    this.currentTheme.set(theme);
    localStorage.setItem(this.THEME_KEY, theme);
    Preferences.set({ key: this.THEME_KEY, value: theme });
  }

  private cargarTema(): VentasTheme {
    return (localStorage.getItem(this.THEME_KEY) as VentasTheme) ?? 'entrerriana';
  }

  private aplicarTema(theme: VentasTheme): void {
    const html = document.documentElement;
    this.THEMES.forEach(t => html.classList.remove(`theme-${t.id}`));
    html.classList.add(`theme-${theme}`);
    if (theme === 'noche') html.classList.add('dark');
    else html.classList.remove('dark');
  }
}