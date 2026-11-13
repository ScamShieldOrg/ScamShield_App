package com.be.scamshield;

import com.be.scamshield.support.PostgresIntegrationTest;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import javax.sql.DataSource;
import java.sql.SQLException;

import static org.assertj.core.api.Assertions.assertThat;

import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class ScamshieldBackendApplicationTests extends PostgresIntegrationTest {

    @Autowired private DataSource dataSource;
    @Autowired private Environment environment;

	@Test
	void contextLoads() throws SQLException {
        assertThat(environment.getProperty("springdotenv.enabled", Boolean.class)).isFalse();
        try (var connection = dataSource.getConnection()) {
            assertThat(connection.getMetaData().getDatabaseProductName()).isEqualTo("PostgreSQL");
            assertThat(connection.getSchema()).startsWith("test_");
        }
	}

}
