# Fire Service System

Fire Service System is a full-stack incident coordination platform with:
- A Spring Boot backend that exposes REST APIs
- A React frontend dashboard for operators, volunteers, and admins
- A Supabase PostgreSQL database for persistent storage

## Architecture

Frontend (`frontend`) calls backend APIs (`/api/*`) over HTTP.

Backend (`src/main/java`) handles validation, business rules, and persistence through JPA repositories.

Supabase is used as the primary PostgreSQL database through the backend datasource configuration.

## Technology Stack

- Backend: Java 17, Spring Boot 3.2, Spring Web, Spring Data JPA, Maven
- Database: PostgreSQL (Supabase)
- Frontend: React (Create React App), React Router, Fetch API, npm
- Testing: JUnit 5, Spring Boot Test, H2 (test profile)

## Project Structure

```text
FireServiceSystem/
├── .env.example                         # Template for backend/frontend runtime variables
├── .env.local                           # Local (gitignored) environment overrides
├── pom.xml                              # Maven dependencies and Spring Boot build config
├── start-backend.sh                     # Starts the packaged backend jar from target/
├── database/
│   └── supabase_init.sql                # PostgreSQL/Supabase schema + seed data script
├── frontend/
│   ├── package.json                     # Frontend dependencies and scripts
│   ├── public/                          # Static assets for React app shell
│   ├── src/
│   │   ├── auth/                        # Login and registration pages
│   │   ├── dashboard/                   # Main UI screens (home, incidents, users, etc.)
│   │   └── utils/                       # Shared frontend helpers (API, session, time, geo)
│   ├── build/                           # Production frontend build output (generated)
│   ├── node_modules/                    # Installed frontend dependencies (generated)
│   └── README.md                        # Default CRA README (frontend-specific)
├── preview/                             # UI screenshots and preview docs
├── src/
│   ├── main/
│   │   ├── java/com/example/FireServiceSystem/
│   │   │   ├── auth/                    # Authentication API and DTOs
│   │   │   ├── config/                  # CORS, dotenv loading, global API error handling
│   │   │   ├── incident/                # Incident APIs, entity, repository, request DTOs
│   │   │   ├── message/                 # Messaging APIs and persistence
│   │   │   ├── notification/            # Notification feed + read/dismiss tracking
│   │   │   ├── participant/             # Participation and participation-request workflows
│   │   │   ├── system/                  # Health/root system endpoints
│   │   │   ├── user/                    # User APIs, entities, roles, repository, DTOs
│   │   │   └── FireServiceSystemApplication.java
│   │   └── resources/
│   │       ├── application.yml          # Main runtime config (datasource, CORS, SQL init mode)
│   │       ├── application-supabase.yml # Supabase-focused datasource profile settings
│   │       ├── init_db.sql              # H2/dev schema + seed script snapshot
│   │       ├── META-INF/spring.factories# Registers dotenv EnvironmentPostProcessor
│   │       └── templates/index.html     # Simple template page
│   └── test/
│       ├── java/com/example/FireServiceSystem/
│       │   ├── FireServiceSystemApplicationTests.java
│       │   └── SupabaseDatabaseSmokeTest.java
│       └── resources/application-test.yml # H2 datasource for test profile
├── target/                              # Maven build artifacts (generated)
└── mvnw / mvnw.cmd                      # Maven wrappers
```

## Backend Module Details

### API modules

- `auth`: `POST /api/auth/login`, `POST /api/auth/register`
- `users`: user list/profile/update/admin management under `/api/users`
- `incidents`: incident lifecycle under `/api/incidents`
- `participants`: incident participants and request decisions under `/api/participants`
- `messages`: public/private incident messaging under `/api/messages`
- `notifications`: unified notification feed and read/dismiss endpoints under `/api/notifications`
- `system`: `GET /` and `GET /health`

### Code organization pattern

Each domain follows a consistent structure:
- `controller/` for HTTP endpoints
- `dto/` for request/response contracts
- `entity/` for JPA models
- `repository/` for database access

Note: there is currently no separate `service/` layer; controllers coordinate repository operations directly.

## Frontend Module Details

### Core app files

- `frontend/src/App.js`: route definitions and access guards
- `frontend/src/index.js`: React bootstrap entry point
- `frontend/src/utils/api.js`: API base URL and JSON request helper
- `frontend/src/utils/session.js`: localStorage session and role helpers

### Frontend feature folders

- `frontend/src/auth/`: login and register pages
- `frontend/src/dashboard/`: dashboard shell and feature screens
  - `home.js`, `incidents.js`, `History.js`, `Participations.js`, `messages.js`, `Users.js`, `ProfileSettings.js`, `FreeMap.js`
- `frontend/src/utils/`: shared utility functions

### Route/access behavior

- Public: dashboard home and incidents
- Logged-in users: history, participations, messages, profile
- Admin-only: users management page

## Supabase Integration

Supabase is integrated as the **backend database layer**.

### Where Supabase is configured

- Environment variables:
  - `.env.example` (template)
  - `.env.local` (local machine)
- Spring datasource wiring:
  - `src/main/resources/application.yml`
  - `src/main/resources/application-supabase.yml`
- Dotenv + conversion logic:
  - `src/main/java/com/example/FireServiceSystem/config/DotenvEnvironmentPostProcessor.java`
  - Supports `DATABASE_URL` and derives `SUPABASE_DB_JDBC_URL`, user, and password
- Startup validation:
  - `src/main/java/com/example/FireServiceSystem/config/SupabaseConfigValidator.java`

### Required/important env vars

- `SUPABASE_DB_JDBC_URL`
- `SUPABASE_DB_USER`
- `SUPABASE_DB_PASSWORD`
- Optional convenience: `DATABASE_URL` (auto-converted to JDBC format)
- `APP_CORS_ALLOWED_ORIGINS`
- `REACT_APP_API_BASE_URL`
- `HIBERNATE_DDL_AUTO`

### SQL schema and seed scripts

- Supabase/PostgreSQL script: `database/supabase_init.sql`
- H2/dev script snapshot: `src/main/resources/init_db.sql`

### Frontend and Supabase relationship

The frontend does **not** use a Supabase JS client directly.
It communicates only with backend REST endpoints, and the backend communicates with Supabase PostgreSQL.

## Running the Project

### 1) Backend

```bash
./mvnw clean package
./start-backend.sh
```

Alternative (dev run):

```bash
./mvnw spring-boot:run
```

### 2) Frontend

```bash
cd frontend
npm install
npm start
```

## Testing

Run backend tests:

```bash
./mvnw test
```

- `test` profile uses H2 (`src/test/resources/application-test.yml`)
- Supabase smoke test (`SupabaseDatabaseSmokeTest`) runs only when:

```bash
RUN_SUPABASE_SMOKE_TESTS=true ./mvnw -Dtest=SupabaseDatabaseSmokeTest test
```

## Notes

- `target/`, `frontend/node_modules/`, and `frontend/build/` are generated artifacts.
- Keep secrets only in local `.env.local` (never commit credentials).
