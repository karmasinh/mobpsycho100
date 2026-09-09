import { Routes } from '@angular/router';
import { authGuard, loginGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [loginGuard],
    loadComponent: () =>
      import('./features/auth/login.component').then(m => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/shell.component').then(m => m.ShellComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        data: { title: 'Panel principal' },
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'caja',
        data: { modulo: 'MOD_CAJA', title: 'Caja — Nueva Venta' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/caja/caja.component').then(m => m.CajaComponent),
      },
      {
        path: 'cierre-caja',
        data: { title: 'Cierre de caja' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/cierre-caja/cierre-caja.component').then(m => m.CierreCajaComponent),
      },
      {
        path: 'clientes',
        data: { modulo: 'MOD_CLIENTES', title: 'Clientes' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/clientes/clientes.component').then(m => m.ClientesComponent),
      },
      {
        path: 'pensionados',
        data: { modulo: 'MOD_PENSIONADOS', title: 'Pensionados' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/pensionados/pensionados.component').then(m => m.PensionadosComponent),
      },
      {
        path: 'cobros',
        data: { modulo: 'MOD_COBROS', title: 'Cobros mensuales' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/cobros/cobros.component').then(m => m.CobrosComponent),
      },
      {
        path: 'asistencia',
        data: { modulo: 'MOD_ASISTENCIA', title: 'Asistencia' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/asistencia/asistencia.component').then(m => m.AsistenciaComponent),
      },
      {
        path: 'empleados',
        data: { modulo: 'MOD_EMPLEADOS', title: 'Empleados' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/empleados/empleados.component')
            .then(m => m.EmpleadosComponent),
      },
      {
        path: 'sucursales',
        data: { modulo: 'MOD_SUCURSALES', title: 'Sucursales' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/sucursales/sucursales.component').then(m => m.SucursalesComponent),
      },
      {
        path: 'almuerzos',
        data: { modulo: 'MOD_TIPOS_ALMUERZO', title: 'Tipos de almuerzo' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/tipos-almuerzo/tipos-almuerzo.component').then(m => m.TiposAlmuerzoPensionadosComponent),
      },
      {
        path: 'proveedores',
        data: { modulo: 'MOD_PROVEEDORES', title: 'Proveedores' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/proveedores/proveedores.component').then(m => m.ProveedoresComponent),
      },
      {
        path: 'categorias',
        data: { modulo: 'MOD_CATEGORIAS_PLATO', title: 'Categorías de plato' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/categorias-plato/categorias-plato.component').then(m => m.CategoriasplatoComponent),
      },
      {
        path: 'roles',
        data: { modulo: 'MOD_ROLES', title: 'Roles' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/roles/roles.component').then(m => m.RolesComponent),
      },
      {
        path: 'usuarios',
        data: { modulo: 'MOD_USUARIOS', title: 'Usuarios' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/usuarios/usuarios.component').then(m => m.UsuariosComponent),
      },
      {
        path: 'historial-ventas',
        data: { title: 'Historial de ventas' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/historial-ventas/historial-ventas.component').then(m => m.HistorialVentasComponent),
      },
      {
        path: 'alertas',
        data: { title: 'Centro de alertas' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/alertas/alertas.component').then(m => m.AlertasComponent),
      },
      {
        path: 'auditoria',
        data: { modulo: 'MOD_AUDITORIA', title: 'Auditoría' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/auditoria/auditoria.component').then(m => m.AuditoriaComponent),
      },
      {
        path: 'pedidos',
        data: { title: 'Pedidos' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/pedidos/pedidos.component').then(m => m.PedidosComponent),
      },
      {
        path: 'reportes',
        data: { modulo: 'MOD_REPORTES', title: 'Reportes' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/reportes/reportes.component').then(m => m.ReportesComponent),
      },
      {
        path: 'sin-acceso',
        loadComponent: () =>
          import('./shared/components/sin-acceso.component').then(m => m.SinAccesoComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
