import { db } from "../src/db/database";
import { initializeDatabase } from "../src/db/initializeDb";

export function startTestDatabase(): void {
  initializeDatabase();
}

export function resetTestDatabase(): void {
  db.exec(`
    DELETE FROM appointments;
  `);
}

export function closeTestDatabase(): void {
  db.exec(`
    DELETE FROM appointments;
    DELETE FROM clinicians;
    DELETE FROM patients;
    DELETE FROM migrations;

    DELETE FROM sqlite_sequence
    WHERE name IN ('appointments', 'clinicians', 'patients', 'migrations');
  `);
  db.close();
  console.log("Test database closed");
}
