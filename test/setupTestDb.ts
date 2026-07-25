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

    DELETE FROM sqlite_sequence
    WHERE name IN ('appointments');
  `);
  db.close();
  console.log("Test database closed");
}
