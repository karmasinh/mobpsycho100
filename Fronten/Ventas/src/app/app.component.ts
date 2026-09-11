import { Component, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Location } from '@angular/common';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class AppComponent implements OnInit {
  constructor(private router: Router, private location: Location) {}

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

    StatusBar.setStyle({ style: Style.Light }).catch(() => {});
  }
}
