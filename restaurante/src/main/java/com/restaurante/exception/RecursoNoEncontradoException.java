package com.restaurante.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** Recurso no encontrado — 404 */
@ResponseStatus(HttpStatus.NOT_FOUND)
public class RecursoNoEncontradoException extends RuntimeException {
    public RecursoNoEncontradoException(String mensaje) {
        super(mensaje);
    }
    public RecursoNoEncontradoException(String entidad, Long id) {
        super(entidad + " con id " + id + " no encontrado");
    }
}
