import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'mesNombre', standalone: true })
export class MesNombrePipe implements PipeTransform {
  private readonly meses = [
    '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  transform(mes: number): string {
    return this.meses[mes] ?? `Mes ${mes}`;
  }
}

@Pipe({ name: 'turnoLabel', standalone: true })
export class TurnoLabelPipe implements PipeTransform {
  transform(turno: string): string {
    const map: Record<string, string> = {
      MANANA: '🌅 Mañana', TARDE: '🌆 Tarde',
      NOCHE: '🌙 Noche', COMPLETO: '📅 Completo',
    };
    return map[turno] ?? turno;
  }
}

@Pipe({ name: 'estadoEmpleadoLabel', standalone: true })
export class EstadoEmpleadoLabelPipe implements PipeTransform {
  transform(estado: string): string {
    const map: Record<string, string> = {
      ACTIVO: '✅ Activo', INACTIVO: '😴 Inactivo',
      BLOQUEADO: '🔒 Bloqueado', ELIMINADO: '🗑️ Eliminado',
    };
    return map[estado] ?? estado;
  }
}
