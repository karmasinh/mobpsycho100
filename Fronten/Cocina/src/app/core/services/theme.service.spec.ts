import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';
import { ThemeName } from '../models';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeService);
    TestBed.flushEffects();
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  it('arranca en el tema "entrerriana" si no hay nada guardado', () => {
    expect(service.currentTheme()).toBe('entrerriana');
    expect(document.documentElement.classList.contains('theme-entrerriana')).toBeTrue();
  });

  it('ignora un valor guardado que no es un tema válido', () => {
    localStorage.setItem('restaurante-cocina-theme', 'no-existe');
    const svc = TestBed.inject(ThemeService); // mismo singleton, pero documenta el fallback
    expect(svc.currentTheme()).toBe('entrerriana');
  });

  it('setTheme cambia la clase CSS del <html> y persiste en localStorage', () => {
    service.setTheme('fuego');
    TestBed.flushEffects();

    expect(service.currentTheme()).toBe('fuego');
    expect(document.documentElement.classList.contains('theme-fuego')).toBeTrue();
    expect(document.documentElement.classList.contains('theme-entrerriana')).toBeFalse();
    expect(localStorage.getItem('restaurante-cocina-theme')).toBe('fuego');
  });

  it('cambiar de tema no deja clases de temas anteriores acumuladas', () => {
    service.setTheme('fuego');
    TestBed.flushEffects();
    service.setTheme('rosa');
    TestBed.flushEffects();

    const clasesDeTema = Array.from(document.documentElement.classList)
      .filter(c => c.startsWith('theme-'));
    expect(clasesDeTema).toEqual(['theme-rosa']);
  });

  it('isDark() coincide con la clase "dark" real aplicada al <html>, para todos los temas', () => {
    // Si isDark() y la clase real del DOM no concuerdan, cualquier consumidor que
    // decida colores (ej. el ícono de la status bar en la app móvil, ThemeService.isDark())
    // queda desincronizado de lo que el usuario realmente ve en pantalla.
    for (const theme of service.THEMES.map(t => t.id)) {
      service.setTheme(theme as ThemeName);
      TestBed.flushEffects();

      const clasesDarkEnDom = document.documentElement.classList.contains('dark');
      expect(service.isDark())
        .withContext(`tema "${theme}": isDark()=${service.isDark()} vs clase "dark" en <html>=${clasesDarkEnDom}`)
        .toBe(clasesDarkEnDom);
    }
  });
});
