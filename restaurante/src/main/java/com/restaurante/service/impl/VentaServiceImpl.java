package com.restaurante.service.impl;

import com.restaurante.dto.response.RentabilidadPlatoDto;
import com.restaurante.dto.response.TopProductoDto;
import com.restaurante.dto.response.VentaPorSucursalDto;
import com.restaurante.entity.*;
import com.restaurante.enums.CanalRecuperacion;
import com.restaurante.enums.EstadoCliente;
import com.restaurante.enums.EstadoPedido;
import com.restaurante.enums.FormaPago;
import com.restaurante.exception.NegocioException;
import com.restaurante.exception.RecursoNoEncontradoException;
import com.restaurante.repository.*;
import com.restaurante.service.CierreCajaService;
import com.restaurante.service.ProduccionService;
import com.restaurante.service.VentaService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VentaServiceImpl implements VentaService {

    private final VentaRepository ventaRepository;
    private final PedidoRepository pedidoRepository;
    private final ClienteRepository clienteRepository;
    private final UsuarioRepository usuarioRepository;
    private final AuditoriaLogRepository auditoriaLogRepository;
    private final DetallePedidoRepository detallePedidoRepository;
    private final PlatoRepository platoRepository;
    private final ProduccionService produccionService;
    private final CierreCajaService cierreCajaService;

    @Override
    @Transactional
    public Venta cobrar(Long pedidoId, Double montoRecibido,
                        FormaPago formaPago, Long usuarioId) {

        Pedido pedido = pedidoRepository.findById(pedidoId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Pedido", pedidoId));

        // Validar que el pedido esté listo para cobrar
        if (pedido.getEstado() != EstadoPedido.LISTO
                && pedido.getEstado() != EstadoPedido.PENDIENTE) {
            throw new NegocioException(
                    "El pedido debe estar en estado LISTO o PENDIENTE para ser cobrado. "
                    + "Estado actual: " + pedido.getEstado());
        }

        if (ventaRepository.findByPedidoId(pedidoId).isPresent()) {
            throw new NegocioException("El pedido #" + pedidoId + " ya fue cobrado.");
        }

        if (cierreCajaService.obtenerAbiertoPorCajero(usuarioId).isEmpty()) {
            throw new NegocioException("Debe abrir un turno de caja antes de cobrar.");
        }

        if (formaPago != FormaPago.CREDITO_CUENTA && montoRecibido < pedido.getTotal()) {
            throw new NegocioException(
                    "Monto insuficiente. Total: " + pedido.getTotal()
                    + ", Recibido: " + montoRecibido);
        }

        Usuario cajero = usuarioRepository.findById(usuarioId).orElse(null);

        double vuelto = formaPago == FormaPago.CREDITO_CUENTA ? 0.0
                : montoRecibido - pedido.getTotal();

        Venta venta = Venta.builder()
                .pedido(pedido)
                .sucursal(pedido.getSucursal())
                .totalCobrado(pedido.getTotal())
                .montoRecibido(montoRecibido)
                .vuelto(vuelto)
                .formaPago(formaPago)
                .cajero(cajero)
                .anulada(false)
                .build();

        ventaRepository.save(venta);

        // Marcar pedido como ENTREGADO
        pedido.setEstado(EstadoPedido.ENTREGADO);
        pedidoRepository.save(pedido);

        // Decrementar stock de producción del día
        Long sucursalId = pedido.getSucursal().getId();
        LocalDate hoy = LocalDate.now();
        for (DetallePedido detalle : pedido.getDetalles()) {
            String tipo = detalle.getPlato().getTipo();
            if ("ALMUERZO".equals(tipo)) {
                // El almuerzo consume una sopa y un segundo de producción
                if (detalle.getSopaSeleccionada() != null) {
                    produccionService.decrementarStock(hoy, sucursalId,
                            detalle.getSopaSeleccionada().getId(), detalle.getCantidad());
                }
                if (detalle.getSegundoSeleccionado() != null) {
                    produccionService.decrementarStock(hoy, sucursalId,
                            detalle.getSegundoSeleccionado().getId(), detalle.getCantidad());
                }
            } else if ("SOPA".equals(tipo) || "SEGUNDO".equals(tipo) || "ESPECIAL".equals(tipo)) {
                produccionService.decrementarStock(hoy, sucursalId,
                        detalle.getPlato().getId(), detalle.getCantidad());
            }
        }

        // Actualizar estado del cliente si aplica
        if (pedido.getCliente() != null) {
            actualizarEstadoCliente(pedido.getCliente());
        }

        // Auditoría
        auditoriaLogRepository.save(AuditoriaLog.builder()
                .entidad("Venta")
                .entidadId(venta.getId())
                .accion("COBRO")
                .valorNuevo("Total: " + venta.getTotalCobrado() + " | Forma: " + formaPago)
                .username(cajero != null ? cajero.getUsername() : "sistema")
                .build());

        return venta;
    }

    @Override
    @Transactional
    public void anular(Long ventaId, String motivo, Long usuarioId) {
        Venta venta = obtenerPorId(ventaId);

        if (Boolean.TRUE.equals(venta.getAnulada())) {
            throw new NegocioException("La venta #" + ventaId + " ya está anulada.");
        }

        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario", usuarioId));

        venta.setAnulada(true);
        venta.setMotivoAnulacion(motivo);
        venta.setUsuarioAnulacion(usuario);
        venta.setAnuladaEn(LocalDateTime.now());
        ventaRepository.save(venta);

        // Revertir estado del pedido
        Pedido pedido = venta.getPedido();
        pedido.setEstado(EstadoPedido.CANCELADO);
        pedidoRepository.save(pedido);

        // Revertir cantidadVendida de producción (los insumos no se devuelven: se consumieron al cocinar, no al vender)
        // Se usa la fecha de la venta original, que es el mismo día que decrementó el stock en cobrar().
        Long sucursalId = pedido.getSucursal().getId();
        LocalDate fechaVenta = venta.getCreadoEn().toLocalDate();
        for (DetallePedido detalle : pedido.getDetalles()) {
            String tipo = detalle.getPlato().getTipo();
            if ("ALMUERZO".equals(tipo)) {
                if (detalle.getSopaSeleccionada() != null) {
                    produccionService.revertirVenta(fechaVenta, sucursalId,
                            detalle.getSopaSeleccionada().getId(), detalle.getCantidad());
                }
                if (detalle.getSegundoSeleccionado() != null) {
                    produccionService.revertirVenta(fechaVenta, sucursalId,
                            detalle.getSegundoSeleccionado().getId(), detalle.getCantidad());
                }
            } else if ("SOPA".equals(tipo) || "SEGUNDO".equals(tipo) || "ESPECIAL".equals(tipo)) {
                produccionService.revertirVenta(fechaVenta, sucursalId,
                        detalle.getPlato().getId(), detalle.getCantidad());
            }
        }

        auditoriaLogRepository.save(AuditoriaLog.builder()
                .entidad("Venta")
                .entidadId(ventaId)
                .accion("ANULACION")
                .valorAnterior("ACTIVA")
                .valorNuevo("ANULADA: " + motivo)
                .username(usuario.getUsername())
                .build());
    }

    @Override
    @Transactional(readOnly = true)
    public Venta obtenerPorId(Long id) {
        return ventaRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Venta", id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<Venta> listarEntreFechas(LocalDateTime desde, LocalDateTime hasta, Long sucursalId) {
        return ventaRepository.findVentasEntreFechas(desde, hasta, sucursalId);
    }

    @Override
    @Transactional(readOnly = true)
    public Double totalEntreFechas(LocalDateTime desde, LocalDateTime hasta, Long sucursalId) {
        return ventaRepository.sumTotalEntreFechas(desde, hasta, sucursalId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TopProductoDto> topProductos(LocalDateTime desde, LocalDateTime hasta, int limit, Long sucursalId) {
        List<TopProductoDto> todos = detallePedidoRepository.findTopProductos(desde, hasta, sucursalId);
        return todos.size() > limit ? todos.subList(0, limit) : todos;
    }

    @Override
    @Transactional(readOnly = true)
    public List<RentabilidadPlatoDto> rentabilidadPorPlato(LocalDateTime desde, LocalDateTime hasta, Long sucursalId) {
        List<TopProductoDto> ventasPorPlato = detallePedidoRepository.findTopProductos(desde, hasta, sucursalId);

        Map<Long, Double> costoPorPlato = platoRepository
                .findAllById(ventasPorPlato.stream().map(TopProductoDto::platoId).toList())
                .stream()
                .collect(Collectors.toMap(Plato::getId, Plato::getCostoEstimado));

        return ventasPorPlato.stream()
                .map(v -> {
                    double costoUnitario = costoPorPlato.getOrDefault(v.platoId(), 0.0);
                    double costoTotal = costoUnitario * v.cantidadVendida();
                    double margenTotal = v.totalIngresos() - costoTotal;
                    double margenPct = v.totalIngresos() > 0 ? (margenTotal / v.totalIngresos()) * 100 : 0.0;
                    return new RentabilidadPlatoDto(
                            v.platoId(), v.platoNombre(), v.cantidadVendida(), v.totalIngresos(),
                            costoUnitario, costoTotal, margenTotal, margenPct);
                })
                .sorted((a, b) -> Double.compare(b.margenTotal(), a.margenTotal()))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<VentaPorSucursalDto> comparativoPorSucursal(LocalDateTime desde, LocalDateTime hasta) {
        return ventaRepository.findTotalPorSucursal(desde, hasta);
    }

    // ─── helpers ──────────────────────────────────────────────────

    /**
     * Actualiza el estado del cliente según su historial de compras:
     * INACTIVO → RECUPERADO si compra de nuevo.
     */
    private void actualizarEstadoCliente(Cliente cliente) {
        if (cliente.getEstado() == EstadoCliente.INACTIVO
                || cliente.getEstado() == EstadoCliente.POSIBLE_INACTIVO) {
            cliente.setEstado(EstadoCliente.RECUPERADO);
            cliente.setCanalRecuperacion(CanalRecuperacion.CAJA);
        } else if (cliente.getEstado() == EstadoCliente.CLIENTE_NUEVO) {
            cliente.setEstado(EstadoCliente.POSIBLE_ACTIVO);
        } else if (cliente.getEstado() == EstadoCliente.POSIBLE_ACTIVO
                || cliente.getEstado() == EstadoCliente.RECUPERADO) {
            cliente.setEstado(EstadoCliente.ACTIVO);
        }
        cliente.setUltimaCompra(LocalDate.now());
        clienteRepository.save(cliente);
    }
}
