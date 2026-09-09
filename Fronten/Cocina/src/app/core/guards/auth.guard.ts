import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  // Verificar módulo requerido (si la ruta lo especifica)
  const requiredModulo = route.data?.['modulo'] as string | undefined;
  if (requiredModulo && !auth.tieneModulo(requiredModulo)) {
    router.navigate(['/sin-acceso']);
    return false;
  }

  return true;
};

export const loginGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) {
    router.navigate(['/dashboard']);
    return false;
  }
  return true;
};
