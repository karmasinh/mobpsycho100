// Agregar al final de ventas/src/app/core/services/api.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Rol } from '../models';

const API = environment.apiUrl;

// ── Roles (Admin) ─────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class RolAdminService {
  constructor(private http: HttpClient) {}

  listar(): Observable<Rol[]>             { return this.http.get<Rol[]>(`${API}/roles`); }
  obtener(id: number): Observable<Rol>    { return this.http.get<Rol>(`${API}/roles/${id}`); }

  crear(body: { nombre: string; descripcion?: string; moduloIds?: number[] }): Observable<Rol> {
    return this.http.post<Rol>(`${API}/roles`, body);
  }

  actualizar(id: number, body: { nombre: string; descripcion?: string; moduloIds?: number[] }): Observable<Rol> {
    return this.http.put<Rol>(`${API}/roles/${id}`, body);
  }

  asignarModulos(id: number, moduloIds: number[]): Observable<void> {
    return this.http.post<void>(`${API}/roles/${id}/modulos`, { moduloIds });
  }

  desactivar(id: number): Observable<void> {
    return this.http.delete<void>(`${API}/roles/${id}`);
  }
}
