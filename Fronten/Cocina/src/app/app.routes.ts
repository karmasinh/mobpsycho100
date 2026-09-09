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
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        data: { modulo: 'MOD_COCINA', title: 'Panel principal' },
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'pedidos',
        data: { modulo: 'MOD_PEDIDOS_COCINA', title: 'Cola de pedidos' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/pedidos/cola-pedidos.component').then(m => m.ColaPedidosComponent),
      },
      {
        path: 'inventario',
        data: { modulo: 'MOD_INVENTARIO', title: 'Inventario' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/inventario/inventario.component').then(m => m.InventarioComponent),
      },
      {
        path: 'platos',
        data: { modulo: 'MOD_PLATOS', title: 'Platos' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/platos/platos.component').then(m => m.PlatosComponent),
      },
      {
        path: 'insumos',
        data: { modulo: 'MOD_INSUMOS', title: 'Insumos' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/insumos/insumos.component').then(m => m.InsumosComponent),
      },
      {
        path: 'categorias-insumo',
        data: { modulo: 'MOD_CATEGORIAS_INSUMO', title: 'Categorías de insumo' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/categorias-insumo/categorias-insumo.component').then(m => m.CategoriasInsumoComponent),
      },
      {
        path: 'modulos',
        data: { modulo: 'MOD_MODULOS', title: 'Módulos del sistema' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/modulos/modulos.component').then(m => m.ModulosComponent),
      },
      {
        path: 'sucursales',
        data: { modulo: 'MOD_SUCURSALES', title: 'Sucursales' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/sucursales/sucursales.component').then(m => m.SucursalesComponent),
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
        path: 'proveedores',
        data: { modulo: 'MOD_PROVEEDORES', title: 'Proveedores' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/proveedores/proveedores.component').then(m => m.ProveedoresComponent),
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
        path: 'recetas',
        data: { modulo: 'MOD_RECETAS', title: 'Recetas' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/recetas/recetas.component').then(m => m.RecetasComponent),
      },
      {
        path: 'mermas',
        data: { modulo: 'MOD_MERMAS', title: 'Mermas' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/mermas/mermas.component').then(m => m.MermasComponent),
      },
      {
        path: 'kardex',
        data: { modulo: 'MOD_KARDEX', title: 'Kárdex de insumos' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/kardex/kardex.component').then(m => m.KardexComponent),
      },
      {
        path: 'produccion',
        data: { modulo: 'MOD_PRODUCCION', title: 'Producción del día' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/produccion/produccion.component').then(m => m.ProduccionComponent),
      },
      {
        path: 'alertas',
        data: { modulo: 'MOD_ALERTAS_INV', title: 'Alertas' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/alertas/alertas.component').then(m => m.AlertasComponent),
      },
      {
        path: 'auditoria',
        data: { modulo: 'MOD_AUDITORIA_COCINA', title: 'Auditoría' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/auditoria/auditoria.component').then(m => m.AuditoriaComponent),
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
