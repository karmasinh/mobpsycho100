package com.restaurante.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** Violación de unicidad — 409 */
@ResponseStatus(HttpStatus.CONFLICT)
public class DuplicadoException extends RuntimeException {
    public DuplicadoException(String mensaje) { super(mensaje); }
}
