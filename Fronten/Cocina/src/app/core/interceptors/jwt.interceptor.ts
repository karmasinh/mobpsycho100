import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router      = inject(Router);

  const token = authService.getToken();

  // Clonar y agregar Authorization header si hay token
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Token expirado o inválido → logout
        authService.logout();
      } else if (error.status === 423) {
        // Usuario bloqueado
        router.navigate(['/login'], {
          queryParams: { bloqueado: 'true' }
        });
      }
      return throwError(() => error);
    })
  );
};
