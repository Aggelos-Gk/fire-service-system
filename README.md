# Fire Service System

## Academic Context
This web app is a **reconstruction** of the Computer Science Department project for course **CS359 (year 2024)**, created by **Aggelos Gkogkosis**.

## What This System Does (User View)
The Fire Service System is an emergency coordination platform where users can:

- Report and monitor incidents
- View incident history and updates
- Exchange operational messages
- Request participation in active incidents
- Manage profile and account information

The platform supports role-based access:

- `Guest`: can view public dashboard/incident information
- `User`: can report and track activity
- `Volunteer`: can join incidents and participate in response workflows
- `Admin`: can manage users, monitor all activity, and coordinate system operations

## Core Features

- Incident management with statuses and timeline visibility
- Role-aware dashboards and protected pages
- Messaging between participants and system users
- Volunteer request/approval flow
- Notification center for important updates
- Responsive UI for desktop, tablet, and mobile

## Project Structure

```text
FireServiceSystem/
├── src/                    # Spring Boot backend source
│   ├── main/java/...       # Controllers, services, entities, repositories
│   └── main/resources/     # App config, SQL scripts, templates
├── frontend/               # React frontend app
│   ├── src/auth/           # Login/Register pages
│   ├── src/dashboard/      # Dashboard and feature modules
│   └── src/utils/          # API/session/helpers
├── database/
│   └── supabase_init.sql   # DB initialization script
├── pom.xml                 # Maven backend config
└── README.md
```

## Technologies and Languages

- Backend: `Java 17`, `Spring Boot`, `Spring Web`, `Spring Data JPA`
- Database: `PostgreSQL (Supabase)`
- Frontend: `React`, `React Router`, `CSS`
- Build tools: `Maven`, `npm`
- Optional deployment: `Railway`

## Local Setup

### 1. Database Setup (Supabase)
Run in Supabase SQL Editor:

```sql
database/supabase_init.sql
```

Create a local `.env` or `.env.local` in repo root:

```env
SUPABASE_DB_JDBC_URL=jdbc:postgresql://db.<project-ref>.supabase.co:5432/postgres?sslmode=require
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=<your-db-password>
```

Alternative: set `DATABASE_URL` (`postgresql://...`) and the backend can derive JDBC settings.

### 2. Run Backend

```bash
./mvnw spring-boot:run
```

### 3. Run Frontend

```bash
cd frontend
npm install
npm start
```

Frontend default URL: `http://localhost:3000`

## Testing

Backend tests:

```bash
./mvnw test
```

Frontend tests:

```bash
cd frontend
CI=true npm test -- --watchAll=false
```

Optional Supabase connectivity smoke test:

```bash
RUN_SUPABASE_SMOKE_TESTS=true ./mvnw test -Dtest=SupabaseDatabaseSmokeTest
```

## Deployment (Railway)

Use two services from the same repository:

1. `backend` service (root directory: project root)
2. `frontend` service (root directory: `frontend`)

Backend service:

- Build command: `mvn -DskipTests clean package`
- Start command: `./start-backend.sh`
- Required env vars:
  - `SUPABASE_DB_JDBC_URL`
  - `SUPABASE_DB_USER=postgres`
  - `SUPABASE_DB_PASSWORD`
  - `HIBERNATE_DDL_AUTO=validate`
  - `APP_CORS_ALLOWED_ORIGINS=https://<frontend-domain>`

Frontend service:

- Build command: `npm install && npm run build`
- Start command: `npm run start:railway`
- Required env var:
  - `REACT_APP_API_BASE_URL=https://<backend-domain>`

## Notes

- This project is intended as an educational reconstruction and portfolio-quality system.
- If backend startup fails immediately, check DB credentials in `.env` first.
