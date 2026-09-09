import { Injectable } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

/**
 * Canal en tiempo real cocina↔ventas vía STOMP sobre WebSocket. Complementa
 * (no reemplaza) el polling HTTP existente: cuando llega un evento se dispara
 * un refresco inmediato; si el socket se cae, el polling sigue funcionando.
 */
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private client: Client | null = null;
  private pendientes: Array<() => void> = [];

  constructor(private auth: AuthService) {}

  pedidosSucursal$(sucursalId: number): Observable<unknown> {
    return new Observable(subscriber => {
      const client = this.obtenerClient();
      let stompSub: { unsubscribe: () => void } | null = null;

      const suscribir = () => {
        stompSub = client.subscribe(`/topic/pedidos/${sucursalId}`, (msg: IMessage) => {
          try { subscriber.next(JSON.parse(msg.body)); } catch { subscriber.next(msg.body); }
        });
      };

      if (client.connected) suscribir();
      else this.pendientes.push(suscribir);

      return () => stompSub?.unsubscribe();
    });
  }

  private obtenerClient(): Client {
    if (this.client) return this.client;

    const brokerURL = environment.apiUrl.replace(/^http/, 'ws') + '/ws';
    this.client = new Client({
      brokerURL,
      connectHeaders: { Authorization: `Bearer ${this.auth.getToken() ?? ''}` },
      reconnectDelay: 5000,
      onConnect: () => {
        const pendientes = this.pendientes;
        this.pendientes = [];
        pendientes.forEach(fn => fn());
      },
    });
    this.client.activate();
    return this.client;
  }
}
