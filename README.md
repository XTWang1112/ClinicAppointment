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

- Node.js 24+ recommended
- npm
- Docker and Docker Compose, if you want to run the containerized version

## Setup

Install dependencies:

```bash
npm install
```

## Run

Start the development server with watch mode:

```bash
npm run dev
```

Build the TypeScript project:

```bash
npm run build
```

Start the compiled server:

```bash
npm start
```

The server listens on `http://localhost:3000`.

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

## Design Decisions / Tradeoffs

### Concurrency safety

Appointment creation wraps the overlap check and insert in a SQLite immediate transaction. That means two overlapping requests cannot both pass validation before either one is committed.

This keeps the implementation simple and reliable for SQLite without requiring database-specific exclusion constraints.

### Simulated role-based access

Instead of a full authentication system, the project uses the `x-user-role` header to simulate patient, clinician, and admin access. This keeps the API easy to test and reason about while still exercising authorization behavior.

### Validation at the edge

Zod schemas validate request bodies, params, and query strings before handlers run. This reduces controller complexity and makes invalid input fail early with clear errors.

### SQLite as the storage layer

SQLite is a practical choice for a small appointment service and makes local development, tests, and Docker usage straightforward. The tradeoff is that it is simpler than a larger production database setup, but it is a good fit for this project's scope.

## Concurrency and Race Condition Handling

Appointment creation is concurrency-safe by wrapping the overlap check and insert in a SQLite immediate transaction.

This ensures the availability check and appointment creation happen atomically, preventing concurrent requests from both passing the overlap check before either appointment is committed.

Example:

1. Request A starts an immediate transaction and acquires the write lock.
2. Request B attempts to create an overlapping appointment and must wait.
3. Request A checks for overlaps and inserts the appointment.
4. Request A commits the transaction.
5. Request B continues, performs the overlap check again, detects the newly created appointment, and fails with a conflict error.

As a result, overlapping appointments cannot be created even when multiple requests are submitted concurrently.

This approach provides application-level concurrency protection without requiring database-specific exclusion constraints, while remaining simple and reliable for a SQLite-based solution.

## Swagger Docs

After starting the app, open:

- `http://localhost:3000/api-docs`
- `http://localhost:3000/openapi.json`
