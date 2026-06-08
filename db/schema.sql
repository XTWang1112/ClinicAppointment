CREATE TABLE IF NOT EXISTS clinicians (
  id INTEGER PRIMARY KEY AUTOINCREMENT
);

CREATE TABLE IF NOT EXISTS patients (
  id INTEGER PRIMARY KEY AUTOINCREMENT
);

CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinician_id INTEGER NOT NULL,
  patient_id INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,

  FOREIGN KEY (clinician_id) REFERENCES clinicians(id),
  FOREIGN KEY (patient_id) REFERENCES patients(id),

  CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS idx_appointments_clinician_time
ON appointments (clinician_id, start_time, end_time);

CREATE INDEX IF NOT EXISTS idx_appointments_start_time
ON appointments (start_time);