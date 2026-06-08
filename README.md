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
