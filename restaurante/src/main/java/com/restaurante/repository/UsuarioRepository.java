package com.restaurante.repository;

import com.restaurante.entity.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    Optional<Usuario> findByUsername(String username);

    boolean existsByUsername(String username);

    @Query("SELECT u FROM Usuario u WHERE u.empleado.id = :empleadoId")
    Optional<Usuario> findByEmpleadoId(Long empleadoId);

    @Query("SELECT u FROM Usuario u WHERE u.pensionado.id = :pensionadoId")
    Optional<Usuario> findByPensionadoId(Long pensionadoId);
}
