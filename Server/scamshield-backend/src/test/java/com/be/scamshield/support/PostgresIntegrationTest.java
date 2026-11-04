package com.be.scamshield.support;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.UUID;

/** One disposable PostgreSQL per test JVM, isolated schema per Spring context. */
public abstract class PostgresIntegrationTest {
    private static class Database {
        private static final PostgreSQLContainer POSTGRES = start();

        private static PostgreSQLContainer start() {
            var container = new PostgreSQLContainer("postgres:16-alpine");
            container.start();
            return container;
        }
    }

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) throws SQLException {
        var postgres = Database.POSTGRES;
        String schema = "test_" + UUID.randomUUID().toString().replace("-", "");
        try (var connection = DriverManager.getConnection(postgres.getJdbcUrl(),
                postgres.getUsername(), postgres.getPassword()); var statement = connection.createStatement()) {
            statement.execute("CREATE SCHEMA " + schema);
        }
        String url = postgres.getJdbcUrl() + (postgres.getJdbcUrl().contains("?") ? "&" : "?")
                + "currentSchema=" + schema;
        registry.add("spring.datasource.url", () -> url);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
    }
}
