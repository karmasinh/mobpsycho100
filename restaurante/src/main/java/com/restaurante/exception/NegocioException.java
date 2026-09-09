package com.restaurante.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** Violación de regla de negocio — 422 */
@ResponseStatus(HttpStatus.UNPROCESSABLE_ENTITY)
public class NegocioException extends RuntimeException {
    public NegocioException(String mensaje) { super(mensaje); }
}
