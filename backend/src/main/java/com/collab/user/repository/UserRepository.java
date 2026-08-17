package com.collab.user.repository;

import com.collab.user.domain.User;
import com.collab.user.domain.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID>, JpaSpecificationExecutor<User> {

    Optional<User> findByEmailIgnoreCase(String email);

    Optional<User> findByUsernameIgnoreCase(String username);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByUsernameIgnoreCase(String username);

    boolean existsByRole(UserRole role);

    boolean existsByIdAndActiveTrue(UUID id);

    @Query("""
            select u from User u
            where lower(u.username) like lower(concat('%', :query, '%'))
               or lower(u.email) like lower(concat('%', :query, '%'))
               or lower(coalesce(u.firstName, '')) like lower(concat('%', :query, '%'))
               or lower(coalesce(u.lastName, '')) like lower(concat('%', :query, '%'))
            """)
    List<User> search(@Param("query") String query);

    Optional<User> findByUsername(String username);
}
