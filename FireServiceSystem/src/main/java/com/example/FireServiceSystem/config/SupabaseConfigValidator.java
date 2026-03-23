package com.example.FireServiceSystem.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("!test")
public class SupabaseConfigValidator implements ApplicationRunner {

	private final Environment environment;

	public SupabaseConfigValidator(Environment environment) {
		this.environment = environment;
	}

	@Override
	public void run(ApplicationArguments args) {
		String datasourceUrl = environment.getProperty("spring.datasource.url");
		String datasourcePassword = environment.getProperty("spring.datasource.password");

		if (isMissingOrUnresolved(datasourceUrl)) {
			throw new IllegalStateException(
				"Missing Supabase DB JDBC URL. Set SUPABASE_DB_JDBC_URL (or DATABASE_URL) via env vars or a local .env/.env.local file."
			);
		}

		if (!datasourceUrl.startsWith("jdbc:postgresql://")) {
			throw new IllegalStateException(
				"Invalid JDBC URL in spring.datasource.url. Expected it to start with 'jdbc:postgresql://'."
			);
		}

		if (isMissingOrUnresolved(datasourcePassword)) {
			throw new IllegalStateException(
				"Missing Supabase DB password. Set SUPABASE_DB_PASSWORD (or include it in DATABASE_URL) via env vars or a local .env/.env.local file."
			);
		}
	}

	private static boolean isMissingOrUnresolved(String value) {
		if (value == null || value.trim().isEmpty()) {
			return true;
		}
		return value.contains("${") && value.contains("}");
	}
}
