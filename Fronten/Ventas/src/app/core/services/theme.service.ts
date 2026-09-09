import { Injectable, signal, effect } from '@angular/core';

export type VentasTheme = 'entrerriana' | 'lila' | 'celeste' | 'noche' | 'rosa';

export interface VentasThemeInfo {
  id: VentasTheme;
  nombre: string;
  descripcion: string;
  emoji: string;
}

@Injectable({ providedIn: 'root' })
export class ThemeService {

  readonly THEMES: VentasThemeInfo[] = [
    { id: 'entrerriana', nombre: 'Entrerriana', descripcion: 'La Entrerriana — verde, dorado y crema', emoji: '🌿' },
    { id: 'lila',        nombre: 'Lila',        descripcion: 'Violeta suave — elegante y moderno',     emoji: '💜' },
    { id: 'celeste',     nombre: 'Celeste',     descripcion: 'Azul cielo — fresco y profesional',       emoji: '🩵' },
    { id: 'noche',       nombre: 'Noche',       descripcion: 'Oscuro profundo — moderno y contrastado', emoji: '🌙' },
    { id: 'rosa',        nombre: 'Rosa',        descripcion: 'Cálido y acogedor — pensión familiar',    emoji: '🌸' },
  ];

  currentTheme = signal<VentasTheme>(this.cargarTema());

  constructor() {
    effect(() => this.aplicarTema(this.currentTheme()));
  }

  setTheme(theme: VentasTheme): void {
    this.currentTheme.set(theme);
    localStorage.setItem('restaurante-ventas-theme', theme);
  }

  private cargarTema(): VentasTheme {
    return (localStorage.getItem('restaurante-ventas-theme') as VentasTheme) ?? 'entrerriana';
  }

  private aplicarTema(theme: VentasTheme): void {
    const html = document.documentElement;
    this.THEMES.forEach(t => html.classList.remove(`theme-${t.id}`));
    html.classList.add(`theme-${theme}`);
    if (theme === 'noche') html.classList.add('dark');
    else html.classList.remove('dark');
  }
}