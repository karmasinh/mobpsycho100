package com.restaurante.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** Usuario bloqueado por intentos fallidos — 423 */
@ResponseStatus(HttpStatus.LOCKED)
public class UsuarioBloqueadoException extends RuntimeException {
    public UsuarioBloqueadoException(String username) {
        super("Usuario '" + username + "' bloqueado por demasiados intentos fallidos. Contacte al administrador.");
    }
}
