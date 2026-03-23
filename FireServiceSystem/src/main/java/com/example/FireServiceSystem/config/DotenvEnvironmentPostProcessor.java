package com.example.FireServiceSystem.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.PropertiesPropertySource;
import org.springframework.core.env.Profiles;

import java.io.BufferedReader;
import java.io.IOException;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Properties;

/**
 * Loads local dotenv-style files (.env, .env.local) into the Spring Environment.
 * This is intentionally simple and avoids logging secrets.
 */
public final class DotenvEnvironmentPostProcessor implements EnvironmentPostProcessor {

	private static final String PROPERTY_SOURCE_NAME = "dotenv";

	@Override
	public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
		Map<String, String> dotenv = new LinkedHashMap<>();
		loadDotenvFile(Path.of(".env"), dotenv);
		loadDotenvFile(Path.of(".env.local"), dotenv);

		// Convenience: allow DATABASE_URL (postgresql://...) and derive the vars this app expects.
		deriveSupabaseDbSettings(environment, dotenv);
		deriveSpringDatasourceSettings(environment, dotenv);

		// Fail fast with a clear message when running the app without any DB config.
		// (Do not fail tests; they use an in-memory H2 datasource.)
		if (!environment.acceptsProfiles(Profiles.of("test"))) {
			String configuredUrl = firstNonBlank(
				environment.getProperty("spring.datasource.url"),
				dotenv.get("spring.datasource.url"),
				environment.getProperty("SUPABASE_DB_JDBC_URL"),
				dotenv.get("SUPABASE_DB_JDBC_URL"),
				environment.getProperty("DATABASE_URL"),
				dotenv.get("DATABASE_URL")
			);
			if (configuredUrl == null) {
				throw new IllegalStateException(
					"Missing database configuration. Create a local .env.local (gitignored) and set either DATABASE_URL " +
						"(postgresql://...) or SUPABASE_DB_JDBC_URL + SUPABASE_DB_USER + SUPABASE_DB_PASSWORD."
				);
			}
		}

		if (dotenv.isEmpty()) {
			return;
		}

		Properties properties = new Properties();
		for (Map.Entry<String, String> entry : dotenv.entrySet()) {
			if (entry.getKey() != null && entry.getValue() != null) {
				properties.setProperty(entry.getKey(), entry.getValue());
			}
		}

		// Keep lower precedence than real env vars / JVM system properties.
		environment.getPropertySources().addLast(new PropertiesPropertySource(PROPERTY_SOURCE_NAME, properties));
	}

	private static void loadDotenvFile(Path path, Map<String, String> out) {
		if (!Files.exists(path) || !Files.isRegularFile(path)) {
			return;
		}
		try (BufferedReader reader = Files.newBufferedReader(path, StandardCharsets.UTF_8)) {
			String line;
			while ((line = reader.readLine()) != null) {
				parseDotenvLine(line, out);
			}
		} catch (IOException ignored) {
			// If dotenv cannot be read, fallback to other property sources (env vars, etc).
		}
	}

	private static void parseDotenvLine(String rawLine, Map<String, String> out) {
		String line = rawLine.trim();
		if (line.isEmpty() || line.startsWith("#")) {
			return;
		}
		if (line.startsWith("export ")) {
			line = line.substring("export ".length()).trim();
		}

		int idx = line.indexOf('=');
		if (idx <= 0) {
			return;
		}

		String key = line.substring(0, idx).trim();
		String value = line.substring(idx + 1).trim();

		if (key.isEmpty()) {
			return;
		}

		// Strip inline comments for unquoted values: KEY=value # comment
		if (!(value.startsWith("\"") || value.startsWith("'"))) {
			int commentIdx = value.indexOf(" #");
			if (commentIdx >= 0) {
				value = value.substring(0, commentIdx).trim();
			}
		}

		value = stripOptionalQuotes(value);
		out.putIfAbsent(key, value);
	}

	private static String stripOptionalQuotes(String value) {
		if (value == null || value.length() < 2) {
			return value;
		}
		if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
			return value.substring(1, value.length() - 1);
		}
		return value;
	}

	private static void deriveSupabaseDbSettings(ConfigurableEnvironment environment, Map<String, String> dotenv) {
		String existingJdbcUrl = firstNonBlank(
			environment.getProperty("SUPABASE_DB_JDBC_URL"),
			dotenv.get("SUPABASE_DB_JDBC_URL")
		);
		if (existingJdbcUrl != null) {
			return;
		}

		String databaseUrl = firstNonBlank(
			environment.getProperty("DATABASE_URL"),
			environment.getProperty("SUPABASE_DATABASE_URL"),
			dotenv.get("DATABASE_URL"),
			dotenv.get("SUPABASE_DATABASE_URL")
		);
		if (databaseUrl == null) {
			return;
		}

		URI uri;
		try {
			uri = URI.create(databaseUrl);
		} catch (IllegalArgumentException ignored) {
			return;
		}

		String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase();
		if (!scheme.equals("postgresql") && !scheme.equals("postgres")) {
			return;
		}

		String host = uri.getHost();
		int port = uri.getPort() == -1 ? 5432 : uri.getPort();
		String path = uri.getPath(); // includes leading '/'
		if (host == null || path == null || path.length() <= 1) {
			return;
		}

		String dbName = path.substring(1);
		String jdbcUrl = "jdbc:postgresql://" + host + ":" + port + "/" + dbName;
		String query = uri.getRawQuery();
		if (query == null || query.isBlank()) {
			jdbcUrl = jdbcUrl + "?sslmode=require";
		} else if (!query.contains("sslmode=")) {
			jdbcUrl = jdbcUrl + "?" + query + "&sslmode=require";
		} else {
			jdbcUrl = jdbcUrl + "?" + query;
		}
		dotenv.put("SUPABASE_DB_JDBC_URL", jdbcUrl);

		String userInfo = uri.getRawUserInfo();
		if (userInfo != null && !userInfo.isBlank()) {
			String[] parts = userInfo.split(":", 2);
			String user = urlDecode(parts[0]);
			String pass = parts.length > 1 ? urlDecode(parts[1]) : null;

		dotenv.putIfAbsent("SUPABASE_DB_USER", user);
			if (pass != null && !pass.isBlank()) {
				dotenv.putIfAbsent("SUPABASE_DB_PASSWORD", pass);
			}
		}
	}

	private static void deriveSpringDatasourceSettings(ConfigurableEnvironment environment, Map<String, String> dotenv) {
		String existingSpringUrl = firstNonBlank(safeGetProperty(environment, "spring.datasource.url"), dotenv.get("spring.datasource.url"));
		if (existingSpringUrl != null) {
			return;
		}

		String jdbcUrl = firstNonBlank(safeGetProperty(environment, "SUPABASE_DB_JDBC_URL"), dotenv.get("SUPABASE_DB_JDBC_URL"));
		if (jdbcUrl != null) {
			dotenv.putIfAbsent("spring.datasource.url", jdbcUrl);
		}

		String user = firstNonBlank(safeGetProperty(environment, "SUPABASE_DB_USER"), dotenv.get("SUPABASE_DB_USER"));
		if (user != null) {
			dotenv.putIfAbsent("spring.datasource.username", user);
		}

		String password = firstNonBlank(safeGetProperty(environment, "SUPABASE_DB_PASSWORD"), dotenv.get("SUPABASE_DB_PASSWORD"));
		if (password != null) {
			dotenv.putIfAbsent("spring.datasource.password", password);
		}
	}

	private static String safeGetProperty(ConfigurableEnvironment environment, String key) {
		try {
			return environment.getProperty(key);
		} catch (IllegalArgumentException ignored) {
			// Can happen when a property value contains an unresolved placeholder.
			return null;
		}
	}

	private static String urlDecode(String raw) {
		return URLDecoder.decode(raw, StandardCharsets.UTF_8);
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
