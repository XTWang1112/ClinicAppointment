import fs from "fs";
import path from "path";
import { db } from "./database";

export function initializeDatabase(): void {
  const schemaPath = path.join(process.cwd(), "db", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf-8");

  db.exec(schema);
  runMigrations();
}

function runMigrations(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL UNIQUE,
      executed_at TEXT NOT NULL
    );
  `);

  const migrationsDir = path.join(process.cwd(), "db", "migrations");

  if (!fs.existsSync(migrationsDir)) {
    return;
  }

  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const filename of migrationFiles) {
    const existingMigration = db
      .prepare(
        `
        SELECT filename
        FROM migrations
        WHERE filename = ?
        LIMIT 1
      `
      )
      .get(filename);

    if (existingMigration) {
      continue;
    }

    const filePath = path.join(migrationsDir, filename);
    const sql = fs.readFileSync(filePath, "utf-8");

    const runMigrationTransaction = db.transaction(() => {
      db.exec(sql);

      db.prepare(
        `
        INSERT INTO migrations (filename, executed_at)
        VALUES (?, ?)
      `
      ).run(filename, new Date().toISOString());
    });

    try {
      runMigrationTransaction();
      console.log(`Ran migration: ${filename}`);
    } catch (error) {
      console.error(`Failed to run migration: ${filename}`);

      if (error instanceof Error) {
        console.error(error.message);
      }

      throw error;
    }
  }
}
