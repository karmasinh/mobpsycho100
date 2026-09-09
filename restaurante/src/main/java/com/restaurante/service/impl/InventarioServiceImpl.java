package com.restaurante.service.impl;

import com.restaurante.dto.response.StockInsumoDto;
import com.restaurante.entity.*;
import com.restaurante.enums.TipoMovimientoInventario;
import com.restaurante.exception.NegocioException;
import com.restaurante.exception.RecursoNoEncontradoException;
import com.restaurante.exception.StockInsuficienteException;
import com.restaurante.repository.*;
import com.restaurante.service.InventarioService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class InventarioServiceImpl implements InventarioService {

    private final InsumoRepository insumoRepository;
    private final LoteInsumoRepository loteInsumoRepository;
    private final MovimientoInventarioRepository movimientoInventarioRepository;
    private final StockInsumoRepository stockInsumoRepository;
    private final SucursalRepository sucursalRepository;
    private final ProveedorRepository proveedorRepository;
    private final UsuarioRepository usuarioRepository;

    @Override
    @Transactional
    public LoteInsumo ingresarLote(Long insumoId, Long sucursalId, Long proveedorId, String numeroLote,
                                    Double cantidad, Double precioUnitario,
                                    LocalDate fechaVencimiento, Long usuarioId) {

        Insumo insumo = insumoRepository.findById(insumoId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Insumo", insumoId));
        Sucursal sucursal = obtenerSucursal(sucursalId);

        Proveedor proveedor = null;
        if (proveedorId != null) {
            proveedor = proveedorRepository.findById(proveedorId)
                    .orElseThrow(() -> new RecursoNoEncontradoException("Proveedor", proveedorId));
        }

        LoteInsumo lote = LoteInsumo.builder()
                .insumo(insumo)
                .sucursal(sucursal)
                .proveedor(proveedor)
                .numeroLote(numeroLote != null ? numeroLote : "LOTE-" + System.currentTimeMillis())
                .cantidadInicial(cantidad)
                .cantidadDisponible(cantidad)
                .precioUnitario(precioUnitario)
                .fechaVencimiento(fechaVencimiento)
                .fechaIngreso(LocalDate.now())
                .activo(true)
                .build();
        loteInsumoRepository.save(lote);

        StockInsumo stock = obtenerOCrearStock(insumo, sucursal);

        // Costo promedio ponderado GLOBAL: el precio de referencia de la receta es
        // uno solo para toda la empresa, se pondera contra el stock de todas las
        // sucursales (no solo la que recibe este lote), se lee antes de actualizar.
        double stockGlobalAnterior = stockInsumoRepository.sumStockGlobal(insumoId);
        double stockLocalAnterior = stock.getStockActual();

        stock.setStockActual(stockLocalAnterior + cantidad);
        stockInsumoRepository.save(stock);

        double stockGlobalNuevo = stockGlobalAnterior + cantidad;
        double precioPromedio = stockGlobalNuevo > 0
                ? (stockGlobalAnterior * insumo.getPrecioUnitario() + cantidad * precioUnitario) / stockGlobalNuevo
                : precioUnitario;
        insumo.setPrecioUnitario(precioPromedio);
        insumoRepository.save(insumo);

        registrarMovimiento(insumo, sucursal, lote, TipoMovimientoInventario.INGRESO_COMPRA,
                cantidad, stockLocalAnterior, stock.getStockActual(),
                "Ingreso por compra - Lote: " + lote.getNumeroLote(), usuarioId);

        return lote;
    }

    @Override
    @Transactional
    public void consumirStock(Long insumoId, Long sucursalId, Double cantidad, String motivo,
                               TipoMovimientoInventario tipo, Long usuarioId) {

        Insumo insumo = insumoRepository.findById(insumoId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Insumo", insumoId));
        Sucursal sucursal = obtenerSucursal(sucursalId);
        StockInsumo stock = obtenerOCrearStock(insumo, sucursal);

        if (stock.getStockActual() < cantidad) {
            throw new StockInsuficienteException(insumo.getNombre(), stock.getStockActual(), cantidad);
        }

        descontarFEFO(insumoId, sucursalId, cantidad);

        double stockAnterior = stock.getStockActual();
        stock.setStockActual(stockAnterior - cantidad);
        stockInsumoRepository.save(stock);

        registrarMovimiento(insumo, sucursal, null, tipo, cantidad,
                stockAnterior, stock.getStockActual(), motivo, usuarioId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<StockInsumoDto> listarStockPorSucursal(Long sucursalId) {
        obtenerSucursal(sucursalId);
        return stockInsumoRepository.findBySucursal_IdAndInsumo_ActivoTrue(sucursalId)
                .stream().map(this::toStockDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<StockInsumoDto> listarConStockBajo(Long sucursalId) {
        obtenerSucursal(sucursalId);
        return stockInsumoRepository.findStockBajoPorSucursal(sucursalId)
                .stream().map(this::toStockDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<LoteInsumo> listarLotesProximosVencer(int dias, Long sucursalId) {
        LocalDate limite = LocalDate.now().plusDays(dias);
        return loteInsumoRepository.findLotesProximosVencer(limite, sucursalId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MovimientoInventario> historialMovimientos(Long insumoId, Long sucursalId) {
        insumoRepository.findById(insumoId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Insumo", insumoId));
        return movimientoInventarioRepository.findByInsumoIdOrderByCreadoEnDesc(insumoId, sucursalId);
    }

    @Override
    @Transactional
    public void ajustarStock(Long insumoId, Long sucursalId, Double nuevaCantidad, String motivo, Long usuarioId) {
        Insumo insumo = insumoRepository.findById(insumoId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Insumo", insumoId));
        Sucursal sucursal = obtenerSucursal(sucursalId);
        StockInsumo stock = obtenerOCrearStock(insumo, sucursal);

        double stockAnterior = stock.getStockActual();
        double diferencia = nuevaCantidad - stockAnterior;

        stock.setStockActual(nuevaCantidad);
        stockInsumoRepository.save(stock);

        registrarMovimiento(insumo, sucursal, null, TipoMovimientoInventario.AJUSTE_MANUAL,
                Math.abs(diferencia), stockAnterior, nuevaCantidad,
                "Ajuste manual: " + motivo, usuarioId);
    }

    @Override
    @Transactional
    public void ajustarStockMinimo(Long insumoId, Long sucursalId, Double nuevoMinimo, Long usuarioId) {
        Insumo insumo = insumoRepository.findById(insumoId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Insumo", insumoId));
        Sucursal sucursal = obtenerSucursal(sucursalId);
        StockInsumo stock = obtenerOCrearStock(insumo, sucursal);
        stock.setStockMinimo(nuevoMinimo);
        stockInsumoRepository.save(stock);
    }

    // ─── Merma ───────────────────────────────────────────────────

    @Override
    @Transactional
    public MovimientoInventario registrarMerma(Long insumoId, Long sucursalId, Double cantidad,
                                               String causa, String observaciones, Long usuarioId) {
        Insumo insumo = insumoRepository.findById(insumoId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Insumo", insumoId));
        Sucursal sucursal = obtenerSucursal(sucursalId);
        StockInsumo stock = obtenerOCrearStock(insumo, sucursal);

        if (stock.getStockActual() < cantidad) {
            throw new StockInsuficienteException(insumo.getNombre(), stock.getStockActual(), cantidad);
        }

        descontarFEFO(insumoId, sucursalId, cantidad);

        double stockAnterior = stock.getStockActual();
        double valorEconomico = cantidad * insumo.getPrecioUnitario();
        stock.setStockActual(stockAnterior - cantidad);
        stockInsumoRepository.save(stock);

        Usuario usuario = usuarioId != null ? usuarioRepository.findById(usuarioId).orElse(null) : null;

        return movimientoInventarioRepository.save(MovimientoInventario.builder()
                .insumo(insumo)
                .sucursal(sucursal)
                .tipo(TipoMovimientoInventario.MERMA)
                .cantidad(cantidad)
                .stockAnterior(stockAnterior)
                .stockPosterior(stock.getStockActual())
                .motivo(causa)
                .observaciones(observaciones)
                .valorEconomico(valorEconomico)
                .usuario(usuario)
                .build());
    }

    @Override
    @Transactional(readOnly = true)
    public List<MovimientoInventario> listarMermas(Long sucursalId) {
        return movimientoInventarioRepository
                .findByTipoConInsumoYUsuario(TipoMovimientoInventario.MERMA, sucursalId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MovimientoInventario> listarMermasPorInsumo(Long insumoId, Long sucursalId) {
        insumoRepository.findById(insumoId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Insumo", insumoId));
        return movimientoInventarioRepository
                .findByInsumoIdAndTipoOrderByCreadoEnDesc(insumoId, TipoMovimientoInventario.MERMA, sucursalId);
    }

    // ─── Kárdex ──────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> obtenerKardex(Long insumoId, Long sucursalId, LocalDate desde, LocalDate hasta) {
        Insumo insumo = insumoRepository.findById(insumoId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Insumo", insumoId));
        obtenerSucursal(sucursalId);

        LocalDateTime desdeTs = desde.atStartOfDay();
        LocalDateTime hastaTs = hasta.atTime(23, 59, 59);

        // Saldo inicial: stockPosterior del último movimiento de esa sucursal ANTES del período
        double saldoInicial = movimientoInventarioRepository
                .findTop1ByInsumoIdAndSucursalIdAndCreadoEnBeforeOrderByCreadoEnDesc(insumoId, sucursalId, desdeTs)
                .stream().findFirst()
                .map(MovimientoInventario::getStockPosterior)
                .orElse(0.0);

        List<MovimientoInventario> movimientos = movimientoInventarioRepository
                .findByInsumoIdEnPeriodo(insumoId, sucursalId, desdeTs, hastaTs);

        double totalEntradas = 0, totalSalidas = 0;
        List<Map<String, Object>> lineas = new ArrayList<>();

        for (MovimientoInventario m : movimientos) {
            boolean esEntrada = m.getTipo() == TipoMovimientoInventario.INGRESO_COMPRA
                    || m.getTipo() == TipoMovimientoInventario.DEVOLUCION_PROVEEDOR
                    || (m.getTipo() == TipoMovimientoInventario.AJUSTE_MANUAL
                        && m.getStockPosterior() != null && m.getStockAnterior() != null
                        && m.getStockPosterior() > m.getStockAnterior());

            double valor = m.getValorEconomico() != null
                    ? m.getValorEconomico()
                    : m.getCantidad() * insumo.getPrecioUnitario();

            if (esEntrada) totalEntradas += m.getCantidad();
            else           totalSalidas  += m.getCantidad();

            Map<String, Object> linea = new LinkedHashMap<>();
            linea.put("id",             m.getId());
            linea.put("fechaHora",      m.getCreadoEn());
            linea.put("tipo",           m.getTipo().name());
            linea.put("descripcion",    m.getMotivo());
            linea.put("observaciones",  m.getObservaciones());
            linea.put("entradas",       esEntrada ? m.getCantidad() : 0.0);
            linea.put("salidas",        esEntrada ? 0.0 : m.getCantidad());
            linea.put("saldo",          m.getStockPosterior());
            linea.put("valorEconomico", valor);
            linea.put("usuario",        m.getUsuario() != null ? m.getUsuario().getUsername() : null);
            lineas.add(linea);
        }

        double saldoFinal = saldoInicial + totalEntradas - totalSalidas;
        double valorTotal = saldoFinal * insumo.getPrecioUnitario();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("insumoId",           insumo.getId());
        result.put("insumoNombre",        insumo.getNombre());
        result.put("insumoUnidad",        insumo.getUnidadMedida());
        result.put("precioUnitario",      insumo.getPrecioUnitario());
        result.put("desde",               desde.toString());
        result.put("hasta",               hasta.toString());
        result.put("saldoInicial",        saldoInicial);
        result.put("totalEntradas",       totalEntradas);
        result.put("totalSalidas",        totalSalidas);
        result.put("saldoFinal",          saldoFinal);
        result.put("valorTotal",          valorTotal);
        result.put("movimientos",         lineas);
        return result;
    }

    // ─── helpers ───────────────────────────────────────────────────

    private Sucursal obtenerSucursal(Long sucursalId) {
        if (sucursalId == null) {
            throw new NegocioException("Selecciona una sucursal antes de operar el inventario.");
        }
        return sucursalRepository.findById(sucursalId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Sucursal", sucursalId));
    }

    private StockInsumo obtenerOCrearStock(Insumo insumo, Sucursal sucursal) {
        return stockInsumoRepository.findByInsumo_IdAndSucursal_Id(insumo.getId(), sucursal.getId())
                .orElseGet(() -> stockInsumoRepository.save(StockInsumo.builder()
                        .insumo(insumo)
                        .sucursal(sucursal)
                        .stockActual(0.0)
                        .stockMinimo(0.0)
                        .build()));
    }

    private void descontarFEFO(Long insumoId, Long sucursalId, Double cantidad) {
        List<LoteInsumo> lotesFEFO = loteInsumoRepository.findLotesFEFO(insumoId, sucursalId);
        double restante = cantidad;
        for (LoteInsumo lote : lotesFEFO) {
            if (restante <= 0) break;
            double consumirDeLote = Math.min(lote.getCantidadDisponible(), restante);
            lote.setCantidadDisponible(lote.getCantidadDisponible() - consumirDeLote);
            if (lote.getCantidadDisponible() <= 0) lote.setActivo(false);
            loteInsumoRepository.save(lote);
            restante -= consumirDeLote;
        }
    }

    private StockInsumoDto toStockDto(StockInsumo s) {
        Insumo i = s.getInsumo();
        CategoriaInsumo cat = i.getCategoria();
        return new StockInsumoDto(
                i.getId(), i.getCodigo(), i.getNombre(), i.getUnidadMedida(),
                s.getStockActual(), s.getStockMinimo(), i.getPrecioUnitario(), i.getPerecedero(),
                cat != null ? cat.getId() : null, cat != null ? cat.getNombre() : null);
    }

    private void registrarMovimiento(Insumo insumo, Sucursal sucursal, LoteInsumo lote,
                                      TipoMovimientoInventario tipo, Double cantidad,
                                      Double stockAnterior, Double stockPosterior,
                                      String motivo, Long usuarioId) {
        Usuario usuario = null;
        if (usuarioId != null) {
            usuario = usuarioRepository.findById(usuarioId).orElse(null);
        }

        movimientoInventarioRepository.save(MovimientoInventario.builder()
                .insumo(insumo)
                .sucursal(sucursal)
                .lote(lote)
                .tipo(tipo)
                .cantidad(cantidad)
                .stockAnterior(stockAnterior)
                .stockPosterior(stockPosterior)
                .motivo(motivo)
                .usuario(usuario)
                .build());
    }
}
