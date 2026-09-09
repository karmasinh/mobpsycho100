package com.restaurante.service.impl;

import com.restaurante.entity.CierreCaja;
import com.restaurante.entity.MovimientoCaja;
import com.restaurante.entity.Sucursal;
import com.restaurante.entity.Usuario;
import com.restaurante.entity.Venta;
import com.restaurante.enums.EstadoCierreCaja;
import com.restaurante.enums.FormaPago;
import com.restaurante.enums.TipoMovimientoCaja;
import com.restaurante.exception.NegocioException;
import com.restaurante.exception.RecursoNoEncontradoException;
import com.restaurante.repository.CierreCajaRepository;
import com.restaurante.repository.MovimientoCajaRepository;
import com.restaurante.repository.SucursalRepository;
import com.restaurante.repository.UsuarioRepository;
import com.restaurante.repository.VentaRepository;
import com.restaurante.service.CierreCajaService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CierreCajaServiceImpl implements CierreCajaService {

    private final CierreCajaRepository cierreCajaRepository;
    private final VentaRepository ventaRepository;
    private final MovimientoCajaRepository movimientoCajaRepository;
    private final SucursalRepository sucursalRepository;
    private final UsuarioRepository usuarioRepository;

    @Override
    @Transactional
    public CierreCaja abrir(Long sucursalId, Double montoInicial, Long usuarioId) {
        if (cierreCajaRepository.findByCajero_IdAndEstado(usuarioId, EstadoCierreCaja.ABIERTO).isPresent()) {
            throw new NegocioException("Ya tiene un turno de caja abierto. Ciérrelo antes de abrir uno nuevo.");
        }
        if (montoInicial == null || montoInicial < 0) {
            throw new NegocioException("El monto inicial no puede ser negativo.");
        }

        Sucursal sucursal = sucursalRepository.findById(sucursalId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Sucursal", sucursalId));
        Usuario cajero = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario", usuarioId));

        CierreCaja turno = CierreCaja.builder()
                .sucursal(sucursal)
                .cajero(cajero)
                .fechaApertura(LocalDateTime.now())
                .montoInicial(montoInicial)
                .estado(EstadoCierreCaja.ABIERTO)
                .build();

        return cierreCajaRepository.save(turno);
    }

    @Override
    @Transactional
    public CierreCaja cerrar(Long id, Double montoFinalDeclarado, String observaciones, Long usuarioId) {
        CierreCaja turno = obtenerPorId(id);

        if (turno.getEstado() != EstadoCierreCaja.ABIERTO) {
            throw new NegocioException("El turno #" + id + " ya está cerrado.");
        }
        if (!turno.getCajero().getId().equals(usuarioId)) {
            throw new NegocioException("Solo el cajero que abrió el turno puede cerrarlo.");
        }
        if (montoFinalDeclarado == null || montoFinalDeclarado < 0) {
            throw new NegocioException("El monto final declarado no puede ser negativo.");
        }

        LocalDateTime ahora = LocalDateTime.now();
        List<Venta> ventasTurno = ventaRepository.findByCajero_IdAndSucursalIdAndCreadoEnBetweenAndAnuladaFalse(
                turno.getCajero().getId(), turno.getSucursal().getId(), turno.getFechaApertura(), ahora);

        double efectivo = 0, qr = 0, mixto = 0, credito = 0;
        for (Venta v : ventasTurno) {
            double total = v.getTotalCobrado();
            switch (v.getFormaPago()) {
                case EFECTIVO -> efectivo += total;
                case QR -> qr += total;
                case MIXTO -> mixto += total;
                case CREDITO_CUENTA -> credito += total;
            }
        }
        double totalGeneral = efectivo + qr + mixto + credito;

        double ingresos = 0, retiros = 0;
        for (MovimientoCaja m : movimientoCajaRepository.findByCierreCaja_IdOrderByCreadoEnAsc(id)) {
            if (m.getTipo() == TipoMovimientoCaja.INGRESO) ingresos += m.getMonto();
            else retiros += m.getMonto();
        }

        double montoEsperadoEfectivo = turno.getMontoInicial() + efectivo + ingresos - retiros;

        turno.setFechaCierre(ahora);
        turno.setMontoFinalDeclarado(montoFinalDeclarado);
        turno.setTotalVentasEfectivo(efectivo);
        turno.setTotalVentasQr(qr);
        turno.setTotalVentasMixto(mixto);
        turno.setTotalVentasCredito(credito);
        turno.setTotalVentasGeneral(totalGeneral);
        turno.setCantidadVentas(ventasTurno.size());
        turno.setTotalIngresos(ingresos);
        turno.setTotalRetiros(retiros);
        turno.setMontoEsperadoEfectivo(montoEsperadoEfectivo);
        turno.setDiferencia(montoFinalDeclarado - montoEsperadoEfectivo);
        turno.setObservaciones(observaciones);
        turno.setEstado(EstadoCierreCaja.CERRADO);

        return cierreCajaRepository.save(turno);
    }

    @Override
    @Transactional
    public MovimientoCaja registrarMovimiento(Long cierreCajaId, TipoMovimientoCaja tipo, Double monto,
                                               String motivo, Long usuarioId) {
        CierreCaja turno = obtenerPorId(cierreCajaId);

        if (turno.getEstado() != EstadoCierreCaja.ABIERTO) {
            throw new NegocioException("El turno #" + cierreCajaId + " ya está cerrado.");
        }
        if (!turno.getCajero().getId().equals(usuarioId)) {
            throw new NegocioException("Solo el cajero que abrió el turno puede registrar movimientos.");
        }
        if (monto == null || monto <= 0) {
            throw new NegocioException("El monto debe ser mayor a cero.");
        }

        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario", usuarioId));

        return movimientoCajaRepository.save(MovimientoCaja.builder()
                .cierreCaja(turno)
                .tipo(tipo)
                .monto(monto)
                .motivo(motivo)
                .usuario(usuario)
                .build());
    }

    @Override
    @Transactional(readOnly = true)
    public List<MovimientoCaja> listarMovimientos(Long cierreCajaId) {
        obtenerPorId(cierreCajaId);
        return movimientoCajaRepository.findByCierreCaja_IdOrderByCreadoEnAsc(cierreCajaId);
    }

    @Override
    @Transactional(readOnly = true)
    public CierreCaja obtenerPorId(Long id) {
        return cierreCajaRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("CierreCaja", id));
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<CierreCaja> obtenerAbiertoPorCajero(Long usuarioId) {
        return cierreCajaRepository.findByCajero_IdAndEstado(usuarioId, EstadoCierreCaja.ABIERTO);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CierreCaja> listarPorSucursal(Long sucursalId) {
        return cierreCajaRepository.findBySucursalIdOrderByFechaAperturaDesc(sucursalId);
    }
}
