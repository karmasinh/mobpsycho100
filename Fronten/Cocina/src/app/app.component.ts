import { Component, OnInit, effect } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Location } from '@angular/common';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class AppComponent implements OnInit {
  constructor(private router: Router, private location: Location, private themeService: ThemeService) {
    if (Capacitor.isNativePlatform()) {
      // La mayoría de los temas de Cocina son oscuros por defecto — el ícono de la
      // status bar debe seguir el tema activo, no quedar fijo en un estilo.
      effect(() => {
        const style = this.themeService.isDark() ? Style.Dark : Style.Light;
        StatusBar.setStyle({ style }).catch(() => {});
      });
    }
  }

  ngOnInit(): void {
    if (!Capacitor.isNativePlatform()) return;

    // Botón atrás de Android: navega dentro de la app: si no hay historial
    // (ej. en el dashboard/login), minimiza la app en vez de cerrarla de golpe.
    CapacitorApp.addListener('backButton', () => {
      if (this.router.url !== '/' && this.router.url !== '/dashboard' && this.router.url !== '/login') {
        this.location.back();
      } else {
        CapacitorApp.minimizeApp();
      }
    });
  }
}
