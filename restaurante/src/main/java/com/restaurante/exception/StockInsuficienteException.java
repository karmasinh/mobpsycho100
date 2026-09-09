package com.restaurante.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** Stock insuficiente para producción — 422 */
@ResponseStatus(HttpStatus.UNPROCESSABLE_ENTITY)
public class StockInsuficienteException extends RuntimeException {
    public StockInsuficienteException(String insumoNombre, double disponible, double requerido) {
        super(String.format(
                "Stock insuficiente para '%s'. Disponible: %.2f, Requerido: %.2f",
                insumoNombre, disponible, requerido));
    }
}
