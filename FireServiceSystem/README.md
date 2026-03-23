# FireServiceSystem (Supabase Postgres)

This project is configured to run against **Supabase Postgres** (no H2 console).

## Setup

1. In Supabase SQL Editor, run `database/supabase_init.sql`.
2. Create a local `.env` (or `.env.local`) file in the repo root (it is gitignored):

```
SUPABASE_DB_JDBC_URL=jdbc:postgresql://db.<project-ref>.supabase.co:5432/postgres?sslmode=require
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=<your-db-password>
```

Alternative (single var): you can also set `DATABASE_URL` (the `postgresql://...` connection string); the app will derive the JDBC URL/user/password automatically.

## Run

```
./mvnw spring-boot:run
```

If Maven exits immediately, the app failed to start; check the console error output (most commonly missing/incorrect `SUPABASE_DB_JDBC_URL` or password).

## Optional: DB connectivity smoke test

Runs only when `RUN_SUPABASE_SMOKE_TESTS=true` is set, and reads Supabase credentials from env vars or `.env`:

```
RUN_SUPABASE_SMOKE_TESTS=true ./mvnw test -Dtest=SupabaseDatabaseSmokeTest
```

## Deploy to Railway

Use two Railway services from the same GitHub repo:

1. `backend` service (root directory: repository root)
2. `frontend` service (root directory: `frontend`)

### Backend service settings

- Build command: `mvn -DskipTests clean package`
- Start command: `java -Dserver.port=$PORT -jar target/FireServiceSystem-0.0.1-SNAPSHOT.jar`
- Required env vars:
  - `SUPABASE_DB_JDBC_URL`
  - `SUPABASE_DB_USER=postgres`
  - `SUPABASE_DB_PASSWORD`
  - `HIBERNATE_DDL_AUTO=validate`
  - `APP_CORS_ALLOWED_ORIGINS=https://<frontend-domain>`
    - For preview/static domains you can use patterns too, e.g. `https://*.up.railway.app`

### Frontend service settings

- Root directory: `frontend`
- Build command: `npm install && npm run build`
- Start command: `npm run start:railway`
- Required env vars:
  - `REACT_APP_API_BASE_URL=https://<backend-domain>`

After first deploy, copy each generated Railway domain and set the matching env vars above, then redeploy both services.
