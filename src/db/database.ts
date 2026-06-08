import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const databasePath =
  process.env.DATABASE_PATH ??
  (process.env.NODE_ENV === "test"
    ? path.join(process.cwd(), "data", "test-clinic.db")
    : path.join(process.cwd(), "data", "clinic.db"));

fs.mkdirSync(path.dirname(databasePath), { recursive: true });

export const db: Database.Database = new Database(databasePath);

db.pragma("foreign_keys = ON");
