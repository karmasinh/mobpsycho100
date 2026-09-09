package com.restaurante.security.websocket;

import com.restaurante.security.SucursalAccessService;
import com.restaurante.security.UserDetailsImpl;
import com.restaurante.security.UserDetailsServiceImpl;
import com.restaurante.security.jwt.JwtUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Autentica el frame CONNECT con el mismo JWT usado en las peticiones HTTP, y
 * valida en cada SUBSCRIBE a /topic/pedidos/{sucursalId} que el usuario tenga
 * acceso a esa sucursal (mismo criterio que SucursalAccessService en la API REST).
 */
@Component
@RequiredArgsConstructor
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private static final Pattern PEDIDOS_TOPIC = Pattern.compile("^/topic/pedidos/(\\d+)$");

    private final JwtUtils jwtUtils;
    private final UserDetailsServiceImpl userDetailsService;
    private final SucursalAccessService sucursalAccessService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) return message;

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String token = extraerToken(accessor);
            if (token == null || !jwtUtils.validarToken(token)) {
                throw new AccessDeniedException("Token inválido o ausente para conexión WebSocket.");
            }
            String username = jwtUtils.getUsernameDesdeToken(token);
            UserDetailsImpl userDetails = (UserDetailsImpl) userDetailsService.loadUserByUsername(username);
            accessor.setUser(new UsernamePasswordAuthenticationToken(
                    userDetails, null, userDetails.getAuthorities()));
        }

        if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            String destination = accessor.getDestination();
            Matcher m = destination != null ? PEDIDOS_TOPIC.matcher(destination) : null;
            if (m != null && m.matches()) {
                Long sucursalDestino = Long.valueOf(m.group(1));
                UserDetailsImpl userDetails = extraerUsuario(accessor);
                Long efectiva = sucursalAccessService.resolver(userDetails, sucursalDestino);
                if (!efectiva.equals(sucursalDestino)) {
                    throw new AccessDeniedException("No tiene acceso a la sucursal solicitada.");
                }
            }
        }

        return message;
    }

    private UserDetailsImpl extraerUsuario(StompHeaderAccessor accessor) {
        if (accessor.getUser() instanceof UsernamePasswordAuthenticationToken auth
                && auth.getPrincipal() instanceof UserDetailsImpl userDetails) {
            return userDetails;
        }
        throw new AccessDeniedException("Sesión WebSocket no autenticada.");
    }

    private String extraerToken(StompHeaderAccessor accessor) {
        String header = accessor.getFirstNativeHeader("Authorization");
        if (StringUtils.hasText(header) && header.startsWith("Bearer ")) {
            return header.substring(7);
        }
        return null;
    }
}
