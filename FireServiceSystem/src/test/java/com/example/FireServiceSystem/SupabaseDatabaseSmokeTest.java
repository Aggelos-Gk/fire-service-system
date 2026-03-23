package com.example.FireServiceSystem;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import java.io.Reader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.Properties;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@EnabledIfEnvironmentVariable(named = "RUN_SUPABASE_SMOKE_TESTS", matches = "true")
class SupabaseDatabaseSmokeTest {

	@Test
	void canConnectAndSelect1() throws Exception {
		Properties dotEnv = new Properties();
		Path dotEnvPath = Path.of(".env");
		if (Files.exists(dotEnvPath)) {
			try (Reader reader = Files.newBufferedReader(dotEnvPath)) {
				dotEnv.load(reader);
			}
		}

		String jdbcUrl = firstNonBlank(System.getenv("SUPABASE_DB_JDBC_URL"), dotEnv.getProperty("SUPABASE_DB_JDBC_URL"));
		String username = firstNonBlank(System.getenv("SUPABASE_DB_USER"), dotEnv.getProperty("SUPABASE_DB_USER"), "postgres");
		String password = firstNonBlank(System.getenv("SUPABASE_DB_PASSWORD"), dotEnv.getProperty("SUPABASE_DB_PASSWORD"));

		assertNotNull(jdbcUrl, "Missing SUPABASE_DB_JDBC_URL (set env var or add it to .env).");
		assertNotNull(password, "Missing SUPABASE_DB_PASSWORD (set env var or add it to .env).");

		try (Connection connection = DriverManager.getConnection(jdbcUrl, username, password);
			 Statement statement = connection.createStatement();
			 ResultSet resultSet = statement.executeQuery("select 1")) {
			assertTrue(resultSet.next(), "Expected a row from 'select 1'.");
			assertEquals(1, resultSet.getInt(1));
		}
	}

	private static String firstNonBlank(String... candidates) {
		for (String candidate : candidates) {
			if (candidate != null && !candidate.trim().isEmpty()) {
				return candidate.trim();
			}
		}
		return null;
	}
}
