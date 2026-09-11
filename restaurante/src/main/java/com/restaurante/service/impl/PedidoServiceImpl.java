package com.restaurante.service.impl;

import com.restaurante.dto.request.PedidoRequest;
import com.restaurante.dto.response.PedidoEventoDto;
import com.restaurante.entity.*;
import com.restaurante.enums.EstadoPedido;
import com.restaurante.enums.TipoEventoPedido;
import com.restaurante.exception.NegocioException;
import com.restaurante.exception.RecursoNoEncontradoException;
import com.restaurante.repository.*;
import com.restaurante.service.PedidoService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class PedidoServiceImpl implements PedidoService {

    private final PedidoRepository pedidoRepository;
    private final ClienteRepository clienteRepository;
    private final PensionadoRepository pensionadoRepository;
    private final PlatoRepository platoRepository;
    private final SucursalRepository sucursalRepository;
    private final EmpleadoRepository empleadoRepository;
    private final UsuarioRepository usuarioRepository;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Transiciones válidas: PENDIENTE → EN_PREPARACION → LISTO → ENTREGADO
     * Desde cualquier estado (excepto ENTREGADO/CANCELADO) se puede CANCELAR.
     */
    private static final Map<EstadoPedido, Set<EstadoPedido>> TRANSICIONES_VALIDAS = Map.of(
            EstadoPedido.PENDIENTE,       EnumSet.of(EstadoPedido.EN_PREPARACION, EstadoPedido.CANCELADO),
            EstadoPedido.EN_PREPARACION,  EnumSet.of(EstadoPedido.LISTO, EstadoPedido.CANCELADO),
            EstadoPedido.LISTO,           EnumSet.of(EstadoPedido.ENTREGADO, EstadoPedido.CANCELADO),
            EstadoPedido.ENTREGADO,       EnumSet.noneOf(EstadoPedido.class),
            EstadoPedido.CANCELADO,       EnumSet.noneOf(EstadoPedido.class)
    );

    @Override
    @Transactional
    public Pedido crear(PedidoRequest request, Long usuarioId) {

        Sucursal sucursal = sucursalRepository.findById(request.getSucursalId())
                .orElseThrow(() -> new RecursoNoEncontradoException("Sucursal", request.getSucursalId()));

        // Buscar cajero por usuario
        Empleado cajero = null;
        if (usuarioId != null) {
            cajero = usuarioRepository.findById(usuarioId)
                    .map(Usuario::getEmpleado)
                    .orElse(null);
        }

        Pedido pedido = Pedido.builder()
                .sucursal(sucursal)
                .cajero(cajero)
                .estado(EstadoPedido.PENDIENTE)
                .observaciones(request.getObservaciones())
                .build();

        // Cliente opcional
        if (request.getClienteId() != null) {
            Cliente cliente = clienteRepository.findById(request.getClienteId())
                    .orElseThrow(() -> new RecursoNoEncontradoException("Cliente", request.getClienteId()));
            pedido.setCliente(cliente);
        }

        // Pensionado opcional
        if (request.getPensionadoId() != null) {
            Pensionado pensionado = pensionadoRepository.findById(request.getPensionadoId())
                    .orElseThrow(() -> new RecursoNoEncontradoException("Pensionado", request.getPensionadoId()));
            pedido.setPensionado(pensionado);
        }

        // Construir detalles
        for (PedidoRequest.DetallePedidoRequest d : request.getDetalles()) {
            Plato plato = platoRepository.findById(d.getPlatoId())
                    .orElseThrow(() -> new RecursoNoEncontradoException("Plato", d.getPlatoId()));

            if (!Boolean.TRUE.equals(plato.getActivo())) {
                throw new NegocioException("El plato '" + plato.getNombre() + "' no está disponible.");
            }

            DetallePedido detalle = DetallePedido.builder()
                    .pedido(pedido)
                    .plato(plato)
                    .cantidad(d.getCantidad())
                    .precioUnitario(plato.getPrecioVenta())
                    .observaciones(d.getObservaciones())
                    .build();

            // Para almuerzos: guardar qué sopa y segundo eligió el cliente
            if (d.getSopaSeleccionadaId() != null) {
                Plato sopa = platoRepository.findById(d.getSopaSeleccionadaId())
                        .orElseThrow(() -> new RecursoNoEncontradoException("Plato (sopa)", d.getSopaSeleccionadaId()));
                exigirRol(sopa, "SOPA", "sopa");
                detalle.setSopaSeleccionada(sopa);
            }
            if (d.getSegundoSeleccionadoId() != null) {
                Plato segundo = platoRepository.findById(d.getSegundoSeleccionadoId())
                        .orElseThrow(() -> new RecursoNoEncontradoException("Plato (segundo)", d.getSegundoSeleccionadoId()));
                exigirRol(segundo, "SEGUNDO", "segundo");
                detalle.setSegundoSeleccionado(segundo);
            }

            pedido.getDetalles().add(detalle);
        }

        pedido.calcularTotal();
        Pedido creado = pedidoRepository.save(pedido);
        publicarEnTiempoReal(creado, TipoEventoPedido.PEDIDO_NUEVO);
        return creado;
    }

    /**
     * Rechaza una selección de sopa/segundo cuyo tipo real no corresponde (ej. mandar un
     * SEGUNDO en sopaSeleccionadaId) — sin esto la API lo aceptaba, la comanda salía mal y
     * se descontaban dos unidades de la misma línea de producción (hallazgo real, ver
     * comparación contra la versión base del sistema en 10_BACKLOG_Y_CAMBIOS.md).
     */
    private void exigirRol(Plato plato, String tipoEsperado, String queEs) {
        if (!tipoEsperado.equals(plato.getTipo())) {
            throw new NegocioException(String.format(
                    "'%s' no puede usarse como %s del almuerzo: su tipo es %s, se esperaba %s.",
                    plato.getNombre(), queEs, plato.getTipo(), tipoEsperado));
        }
    }

    @Override
    @Transactional
    public Pedido cambiarEstado(Long pedidoId, EstadoPedido nuevoEstado, Long usuarioId) {
        Pedido pedido = obtenerPorId(pedidoId);
        validarTransicion(pedido.getEstado(), nuevoEstado);
        pedido.setEstado(nuevoEstado);
        Pedido actualizado = pedidoRepository.save(pedido);
        publicarEnTiempoReal(actualizado, TipoEventoPedido.PEDIDO_ACTUALIZADO);
        return actualizado;
    }

    /** Notifica en vivo a cocina/ventas de la sucursal (pedido nuevo o cambio de estado) */
    private void publicarEnTiempoReal(Pedido pedido, TipoEventoPedido tipo) {
        if (pedido.getSucursal() != null) {
            messagingTemplate.convertAndSend("/topic/pedidos/" + pedido.getSucursal().getId(),
                    new PedidoEventoDto(tipo, pedido));
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Pedido obtenerPorId(Long id) {
        return pedidoRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Pedido", id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<Pedido> listarPorEstado(EstadoPedido estado) {
        return pedidoRepository.findByEstado(estado);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Pedido> listarPorEstado(EstadoPedido estado, Long sucursalId) {
        return sucursalId != null
                ? pedidoRepository.findBySucursalIdAndEstado(sucursalId, estado)
                : pedidoRepository.findByEstado(estado);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Pedido> listarPorCliente(Long clienteId) {
        return pedidoRepository.findByClienteIdOrderByCreadoEnDesc(clienteId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Pedido> listarActivos(Long sucursalId) {
        return pedidoRepository.findBySucursalIdAndEstado(sucursalId, EstadoPedido.PENDIENTE);
    }

    @Override
    @Transactional
    public void cancelar(Long pedidoId, Long usuarioId) {
        cambiarEstado(pedidoId, EstadoPedido.CANCELADO, usuarioId);
    }

    // ─── helpers ──────────────────────────────────────────────────

    private void validarTransicion(EstadoPedido actual, EstadoPedido nuevo) {
        Set<EstadoPedido> permitidos = TRANSICIONES_VALIDAS.getOrDefault(actual, Set.of());
        if (!permitidos.contains(nuevo)) {
            throw new NegocioException(
                    "Transición inválida: no se puede pasar de " + actual + " a " + nuevo +
                    ". Transiciones permitidas desde " + actual + ": " + permitidos);
        }
    }
}
