# Clinic Appointment API

Simple clinic appointment booking API built with Node.js, Express, TypeScript, SQLite, and Zod.

## Features

- Create appointments
- List appointments for one clinician
- List all appointments as an admin
- Request validation with Zod
- Swagger/OpenAPI docs
- SQLite-backed persistence
- Concurrency-safe appointment creation

## Requirements

- Docker and Docker Compose
- Node.js 24+ and npm, if you want to run the app locally without Docker

## Docker

Build and start the API with Docker Compose:

```bash
docker compose up --build
```

This exposes the API at `http://localhost:3000` and persists the SQLite database under `./data`.

To stop the container:

```bash
docker compose down
```

The server listens on `http://localhost:3000`.

## Local Development

If you want to run the app without Docker:

```bash
npm install
npm run dev
```

## API Overview

The app exposes:

- `POST /appointments`
- `GET /clinicians/:id/appointments`
- `GET /appointments` for admin users
- Swagger UI at `/api-docs`
- OpenAPI JSON at `/openapi.json`

Authentication is simulated with the `x-user-role` header. Valid values are:

- `patient`
- `clinician`
- `admin`

## Example Requests

### Create an appointment

```bash
curl -X POST http://localhost:3000/appointments \
  -H "Content-Type: application/json" \
  -H "x-user-role: admin" \
  -d '{
    "clinicianId": 1,
    "patientId": 1,
    "start": "2099-06-10T09:00:00+10:00",
    "end": "2099-06-10T09:30:00+10:00"
  }'
```

Expected response: `201 Created` with the created appointment in JSON.

### List appointments for one clinician

```bash
curl "http://localhost:3000/clinicians/1/appointments?from=2099-06-10T08:00:00%2B10:00&to=2099-06-10T10:00:00%2B10:00" \
  -H "x-user-role: admin"
```

### List all appointments as admin

```bash
curl "http://localhost:3000/appointments?limit=10" \
  -H "x-user-role: admin"
```

## Project Structure

The request flow is:

1. `server.ts` initializes the database and starts the HTTP server.
2. `app.ts` configures Express middleware, Swagger, routes, and global error handling.
3. `appointmentRoutes.ts` matches the route and runs auth and request validation middleware.
4. `appointmentController.ts` reads validated data from `res.locals` and delegates to the service layer.
5. `appointmentService.ts` applies business rules and transforms request datetimes to UTC ISO strings.
6. `sqliteRepository.ts` runs SQLite queries and transactions through the shared `db` connection.

```mermaid
graph TD
    A["server.ts"] --> B["initializeDatabase()"]
    A --> C["app.ts"]
    C --> D["express.json()"]
    C --> E["setupSwagger(app)"]
    C --> O["notFoundHandler"]
    C --> P["errorHandler"]

    subgraph R["Router"]
        F["appointmentRouter"]
    end

    subgraph MW["Middleware"]
        G["simulateAuth"]
        H["requireRole(...)"]
        I["validateRequest(...)"]
        O
        P
    end

    subgraph CTRL["Controller"]
        J["appointmentController"]
    end

    subgraph SVC["Service"]
        K["appointmentService"]
    end

    subgraph REPO["Repository"]
        L["repository (IRepository)"]
        M["sqliteRepository"]
    end

    subgraph DB["Database"]
        N["better-sqlite3 db connection"]
    end

    C --> F
    F --> G
    G --> H
    H --> I
    I --> J
    J --> K
    K --> L
    L --> M
    M --> N

    J -. "throws / next(error)" .-> P
    K -. "domain errors" .-> P
    I -. "validation errors" .-> P
```

Notes:

- `app.ts` does not call the controller directly. The request goes through route-level middleware first.
- `appointmentService.ts` talks to the repository abstraction, and the current implementation behind it is `sqliteRepository`.
- `errorHandler` is the final step for validation, authorization, not-found, and application errors.

## Design Decisions & Tradeoffs

### 1. **Database fields: `start_time` and `end_time` vs `start_time` and `duration`**

Decision: Store `start_time` and `end_time` directly rather than storing `start_time` plus a duration.

Why:

- overlap checks and time-range queries are easier to express in SQL
- the conflict rule can compare two concrete timestamps directly
- the API can return exact start and end values without recomputing them

Tradeoff:

- `end_time` is derived data, so the application must keep `start_time < end_time` valid
- this is enforced through request validation and a database `CHECK`

### 2. **Primary key datatype: integer vs GUID**

Decision: Use `INTEGER PRIMARY KEY AUTOINCREMENT` instead of GUIDs.

Why:

- integer primary keys are compact and fast in SQLite
- they keep local seed data and tests simple to read and write
- they match the current single-database scope of the project

Tradeoff:

- integer IDs are easier to guess
- they are less suitable than GUIDs for distributed systems or multi-database record merging

### 3. **Index choice**

Decision: Use the current indexes:

- a composite index on `(clinician_id, start_time, end_time)`
- a single-column index on `start_time`

Why:

- the composite index helps clinician-specific time-range queries
- the `start_time` index helps broader upcoming-appointment listing
- this matches the project’s current query patterns better than relying on table scans

Tradeoff:

- writes pay an index-maintenance cost
- three separate single-column indexes would be more general in some cases, but less directly helpful for the common clinician-and-time query
- no indexes would simplify writes slightly, but read performance would degrade as the table grows

### 4. **Raw SQL instead of an ORM or query builder**

Decision: Use raw SQL through `better-sqlite3` rather than an ORM or query builder.

Why:

- the queries are explicit and easy to map back to the schema
- the repository stays small and predictable
- transaction boundaries are easy to see, especially for overlap prevention

Tradeoff:

- raw SQL increases the chance of future mistakes if unsafe string interpolation is introduced later
- the current code mitigates direct SQL injection for values by using parameter binding such as `?`
- a stronger long-term guardrail would be to keep all user input parameterized, avoid dynamic SQL fragments for user-controlled identifiers, or introduce a query builder / stricter repository helpers as the codebase grows

### 5. **Simulated authentication without user identity**

Decision: Simulate authentication with a role header and no user identity.

Why:

- it keeps the project focused on scheduling logic and authorization flow
- it makes local testing and API exploration simple
- it avoids pulling full auth/session logic into a small exercise

Tradeoff:

- the API can enforce role-based access, but not record ownership
- a patient can currently create an appointment for another patient by sending a different `patientId`
- a stronger production design would attach both `userId` and `role` to the request context and verify ownership for non-admin users

### 6. **`index.ts` as a repository selection layer**

Decision: Keep `src/db/repositories/index.ts` as the repository selection layer.

Why:

- the service layer imports one stable module instead of importing `sqliteRepository` directly
- it keeps business logic depending on the repository abstraction rather than one concrete backend
- it leaves room to swap implementations later with minimal changes to the service layer

Tradeoff:

- this is an extra abstraction layer in a project that currently has only one repository implementation
- the benefit becomes much clearer if the project later adds another backend or proper dependency injection

### 7. **Concurrency and Race Condition Handling**

Decision: Use a SQLite immediate transaction for overlap prevention.

Why:

- it keeps the overlap check and insert atomic
- it prevents two concurrent requests from both passing validation and creating conflicting bookings
- it provides a simple concurrency-control mechanism that fits SQLite well

Tradeoff:

- writes are serialized, so throughput under heavy concurrent write load is lower
- for this project, that tradeoff is acceptable in exchange for correctness

Example:

1. Request A starts an immediate transaction and acquires the write lock.
2. Request B attempts to create an overlapping appointment and must wait.
3. Request A checks for overlaps and inserts the appointment.
4. Request A commits the transaction.
5. Request B continues, performs the overlap check again, detects the newly created appointment, and fails with a conflict error.

As a result, overlapping appointments cannot be created even when multiple requests are submitted concurrently.

## Test

Run the test suite:

```bash
npm run test:run
```

Run tests in watch mode:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

Run formatting checks:

```bash
npm run format:check
```

Format the codebase:

```bash
npm run format
```

## Test Coverage

The test suite is organized by file so each layer can be verified independently.

### `test/integration/appointmentsApi.test.ts`

- `POST /appointments`
- `creates an appointment`
- `returns 400 for invalid datetime`
- `returns 400 when start is after end`
- `returns 404 when clinician does not exist`
- `returns 404 when patient does not exist`
- `returns 409 when same clinician has overlapping appointment`
- `returns 409 when same patient has overlapping appointment with different clinician`
- `allows appointments that touch but do not overlap`
- `allows only one appointment when two overlapping requests are submitted concurrently`
- `GET /clinicians/:id/appointments`
- `lists appointments for one clinician`
- `supports from and to query params`
- `returns 400 for invalid clinician id`
- `returns 400 for invalid date range`
- `returns 404 when clinician does not exist`
- `GET /appointments`
- `lists all upcoming appointments for admin`
- `supports limit`
- `supports from and to query params`
- `returns 403 when non-admin tries to list all appointments`
- `returns 401 when role header is missing`
- `returns 400 for invalid limit`
- `not found`
- `returns 404 for unknown route`

### `test/controllers/appointmentController.test.ts`

- `createAppointmentHandler`
- `returns 201 with created appointment`
- `passes errors to next`
- `listClinicianAppointmentsHandler`
- `returns 200 with clinician appointments`
- `passes errors to next`
- `listAllAppointmentsHandler`
- `returns 200 with all appointments`
- `passes errors to next`

### `test/db/sqliteRepository.test.ts`

- `clinicianExists`
- `returns true when clinician exists`
- `returns false when clinician does not exist`
- `patientExists`
- `returns true when patient exists`
- `returns false when patient does not exist`
- `createAppointmentSafely`
- `creates appointment when there is no overlap`
- `throws AppointmentOverlapError when appointment overlaps`
- `findAppointmentsByClinician`
- `returns only matching clinician appointments within the range`
- `findAppointments`
- `returns appointments sorted by start time and respects limit`

### `test/middleware/auth.test.ts`

- `simulateAuth`
- `sets user role and calls next when role is valid`
- `throws UnAuthenticatedError when role header is missing`
- `throws UnAuthenticatedError when role is invalid`
- `requireRole`
- `calls next when user role is allowed`
- `calls next when user role is one of allowed roles`
- `throws UnAuthenticatedError when user is missing`
- `throws ForbiddenError when user role is not allowed`

### `test/middleware/errorHandler.test.ts`

- `returns AppError status code and message`
- `returns 500 for unknown errors`
- `includes details when AppError provides them`
- `omits empty error groups from validation details`
- `notFoundHandler`
- `returns 404 with route information`

### `test/validation/appointmentSchema.test.ts`

- `createAppointmentSchema`
- `accepts a valid appointment request`
- `rejects invalid start datetime`
- `rejects invalid end datetime`
- `rejects when start is equal to end`
- `rejects when start is after end`
- `rejects when start is in the past`
- `rejects non-integer clinicianId`
- `rejects non-positive patientId`
- `clinicianAppointmentsParamsSchema`
- `coerces id from string to number`
- `rejects invalid id`
- `rejects non-positive id`
- `appointmentQuerySchema`
- `accepts empty query`
- `accepts only from`
- `accepts only to`
- `rejects invalid from`
- `rejects when from is after to`
- `adminAppointmentsQuerySchema`
- `accepts empty query`
- `coerces limit from string to number`
- `rejects invalid limit`
- `rejects zero limit`
- `rejects limit greater than 100`
- `rejects when from is after to`
- `does not add date range error when from is invalid`

## Test Database Isolation

Tests use a separate SQLite file so they do not write into the normal development database.

- In [database.ts](C:\Users\tongw\Documents\Code\ClinicAppointment\src\db\database.ts), the database path switches based on environment:
  - `data/test-clinic.db` when `NODE_ENV === "test"`
  - `data/clinic.db` otherwise
- The CI workflow sets `NODE_ENV=test`, so GitHub Actions also uses the test database.
- In [setupTestDb.ts](C:\Users\tongw\Documents\Code\ClinicAppointment\test\setupTestDb.ts), `startTestDatabase()` initializes the schema and seed data before tests run.
- `resetTestDatabase()` clears only the `appointments` table before each test so each case starts from a clean booking state.
- `closeTestDatabase()` removes test data, resets SQLite sequences, and closes the shared connection after the suite finishes.

This keeps the tests deterministic while protecting local development data from accidental modification.

## Swagger Docs

After starting the app, open:

- `http://localhost:3000/api-docs`
- `http://localhost:3000/openapi.json`
