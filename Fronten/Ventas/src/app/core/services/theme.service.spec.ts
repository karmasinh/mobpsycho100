import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeService);
    // El `effect()` que aplica la clase CSS corre en el siguiente tick de Angular,
    // no sincrónicamente al construir el servicio ni al cambiar el signal.
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

  it('setTheme cambia la clase CSS del <html> y persiste en localStorage', () => {
    service.setTheme('lila');
    TestBed.flushEffects();

    expect(service.currentTheme()).toBe('lila');
    expect(document.documentElement.classList.contains('theme-lila')).toBeTrue();
    expect(document.documentElement.classList.contains('theme-entrerriana')).toBeFalse();
    expect(localStorage.getItem('restaurante-ventas-theme')).toBe('lila');
  });

  it('solo el tema "noche" agrega la clase "dark"', () => {
    service.setTheme('noche');
    TestBed.flushEffects();
    expect(document.documentElement.classList.contains('dark')).toBeTrue();

    service.setTheme('celeste');
    TestBed.flushEffects();
    expect(document.documentElement.classList.contains('dark')).toBeFalse();
  });

  it('cambiar de tema no deja clases de temas anteriores acumuladas', () => {
    service.setTheme('lila');
    TestBed.flushEffects();
    service.setTheme('rosa');
    TestBed.flushEffects();

    const clasesDeTema = Array.from(document.documentElement.classList)
      .filter(c => c.startsWith('theme-'));
    expect(clasesDeTema).toEqual(['theme-rosa']);
  });
});
