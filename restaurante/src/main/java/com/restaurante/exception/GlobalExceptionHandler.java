package com.restaurante.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // ─── Errores de validación (@Valid) ───────────────────────────
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidacion(
            MethodArgumentNotValidException ex, HttpServletRequest req) {
        Map<String, String> errores = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String campo = ((FieldError) error).getField();
            errores.put(campo, error.getDefaultMessage());
        });
        ErrorResponse resp = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.BAD_REQUEST.value())
                .error("Validación fallida")
                .mensaje("Existen errores en los campos enviados")
                .ruta(req.getRequestURI())
                .detalle(errores)
                .build();
        return ResponseEntity.badRequest().body(resp);
    }

    // ─── Recurso no encontrado ─────────────────────────────────────
    @ExceptionHandler(RecursoNoEncontradoException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(
            RecursoNoEncontradoException ex, HttpServletRequest req) {
        return buildResponse(HttpStatus.NOT_FOUND, ex.getMessage(), req);
    }

    // ─── Duplicado ────────────────────────────────────────────────
    @ExceptionHandler(DuplicadoException.class)
    public ResponseEntity<ErrorResponse> handleDuplicado(
            DuplicadoException ex, HttpServletRequest req) {
        return buildResponse(HttpStatus.CONFLICT, ex.getMessage(), req);
    }

    // ─── Negocio ──────────────────────────────────────────────────
    @ExceptionHandler(NegocioException.class)
    public ResponseEntity<ErrorResponse> handleNegocio(
            NegocioException ex, HttpServletRequest req) {
        return buildResponse(HttpStatus.UNPROCESSABLE_ENTITY, ex.getMessage(), req);
    }

    // ─── Stock insuficiente ───────────────────────────────────────
    @ExceptionHandler(StockInsuficienteException.class)
    public ResponseEntity<ErrorResponse> handleStock(
            StockInsuficienteException ex, HttpServletRequest req) {
        return buildResponse(HttpStatus.UNPROCESSABLE_ENTITY, ex.getMessage(), req);
    }

    // ─── Usuario bloqueado ────────────────────────────────────────
    @ExceptionHandler(UsuarioBloqueadoException.class)
    public ResponseEntity<ErrorResponse> handleBloqueado(
            UsuarioBloqueadoException ex, HttpServletRequest req) {
        return buildResponse(HttpStatus.LOCKED, ex.getMessage(), req);
    }

    // ─── Spring Security ──────────────────────────────────────────
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleBadCredentials(
            BadCredentialsException ex, HttpServletRequest req) {
        return buildResponse(HttpStatus.UNAUTHORIZED, "Credenciales inválidas", req);
    }

    @ExceptionHandler(LockedException.class)
    public ResponseEntity<ErrorResponse> handleLocked(
            LockedException ex, HttpServletRequest req) {
        return buildResponse(HttpStatus.LOCKED, "Cuenta bloqueada. Contacte al administrador.", req);
    }

    @ExceptionHandler(DisabledException.class)
    public ResponseEntity<ErrorResponse> handleDisabled(
            DisabledException ex, HttpServletRequest req) {
        return buildResponse(HttpStatus.UNAUTHORIZED, "Cuenta deshabilitada", req);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(
            AccessDeniedException ex, HttpServletRequest req) {
        return buildResponse(HttpStatus.FORBIDDEN, "No tiene permisos para esta acción", req);
    }

    // ─── Error genérico ───────────────────────────────────────────
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneral(Exception ex, HttpServletRequest req) {
        log.error("Error no controlado en {}: {}", req.getRequestURI(), ex.getMessage(), ex);
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR,
                "Error interno del servidor. Por favor contacte soporte.", req);
    }

    // ─── Helper ───────────────────────────────────────────────────
    private ResponseEntity<ErrorResponse> buildResponse(HttpStatus status, String mensaje,
                                                         HttpServletRequest req) {
        ErrorResponse resp = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(status.value())
                .error(status.getReasonPhrase())
                .mensaje(mensaje)
                .ruta(req.getRequestURI())
                .build();
        return ResponseEntity.status(status).body(resp);
    }

    // ─── DTO de respuesta de error ────────────────────────────────
    @lombok.Data @lombok.Builder @lombok.NoArgsConstructor @lombok.AllArgsConstructor
    public static class ErrorResponse {
        private LocalDateTime timestamp;
        private int status;
        private String error;
        private String mensaje;
        private String ruta;
        private Map<String, String> detalle;
    }
}
