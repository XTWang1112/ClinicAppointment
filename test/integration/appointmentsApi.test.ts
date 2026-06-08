import request from "supertest";
import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "../../app";
import { closeTestDatabase, startTestDatabase, resetTestDatabase } from "../setupTestDb";

describe("Appointments API integration tests", () => {
  beforeAll(() => {
    console.log("🚀 Starting integration tests...");
    startTestDatabase();
  });

  beforeEach(() => {
    resetTestDatabase();
  });

  afterAll(() => {
    closeTestDatabase();
  });

  describe("POST /appointments", () => {
    it("creates an appointment", async () => {
      const response = await request(app).post("/appointments").set("x-user-role", "admin").send({
        clinicianId: 1,
        patientId: 1,
        start: "2099-06-10T09:00:00+10:00",
        end: "2099-06-10T09:30:00+10:00",
      });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: 1,
        clinicianId: 1,
        patientId: 1,
        startTime: "2099-06-09T23:00:00.000Z",
        endTime: "2099-06-09T23:30:00.000Z",
      });
    });

    it("returns 400 for invalid datetime", async () => {
      const response = await request(app).post("/appointments").set("x-user-role", "admin").send({
        clinicianId: 1,
        patientId: 1,
        start: "9765",
        end: "2099-06-10T09:30:00+10:00",
      });

      expect(response.status).toBe(400);
    });

    it("returns 400 when start is after end", async () => {
      const response = await request(app).post("/appointments").set("x-user-role", "admin").send({
        clinicianId: 1,
        patientId: 1,
        start: "2099-06-10T10:00:00+10:00",
        end: "2099-06-10T09:30:00+10:00",
      });

      expect(response.status).toBe(400);
    });

    it("returns 404 when clinician does not exist", async () => {
      const response = await request(app).post("/appointments").set("x-user-role", "admin").send({
        clinicianId: 999,
        patientId: 1,
        start: "2099-06-10T09:00:00+10:00",
        end: "2099-06-10T09:30:00+10:00",
      });

      expect(response.status).toBe(404);
    });

    it("returns 404 when patient does not exist", async () => {
      const response = await request(app).post("/appointments").set("x-user-role", "admin").send({
        clinicianId: 1,
        patientId: 999,
        start: "2099-06-10T09:00:00+10:00",
        end: "2099-06-10T09:30:00+10:00",
      });

      expect(response.status).toBe(404);
    });

    it("returns 409 when same clinician has overlapping appointment", async () => {
      await request(app).post("/appointments").set("x-user-role", "admin").send({
        clinicianId: 1,
        patientId: 1,
        start: "2099-06-10T09:00:00+10:00",
        end: "2099-06-10T09:30:00+10:00",
      });

      const response = await request(app).post("/appointments").set("x-user-role", "admin").send({
        clinicianId: 1,
        patientId: 2,
        start: "2099-06-10T09:15:00+10:00",
        end: "2099-06-10T09:45:00+10:00",
      });

      expect(response.status).toBe(409);
    });

    it("returns 409 when same patient has overlapping appointment with different clinician", async () => {
      await request(app).post("/appointments").set("x-user-role", "admin").send({
        clinicianId: 1,
        patientId: 1,
        start: "2099-06-10T09:00:00+10:00",
        end: "2099-06-10T09:30:00+10:00",
      });

      const response = await request(app).post("/appointments").set("x-user-role", "admin").send({
        clinicianId: 2,
        patientId: 1,
        start: "2099-06-10T09:15:00+10:00",
        end: "2099-06-10T09:45:00+10:00",
      });

      expect(response.status).toBe(409);
    });

    it("allows appointments that touch but do not overlap", async () => {
      await request(app).post("/appointments").set("x-user-role", "admin").send({
        clinicianId: 1,
        patientId: 1,
        start: "2099-06-10T09:00:00+10:00",
        end: "2099-06-10T09:30:00+10:00",
      });

      const response = await request(app).post("/appointments").set("x-user-role", "admin").send({
        clinicianId: 1,
        patientId: 2,
        start: "2099-06-10T09:30:00+10:00",
        end: "2099-06-10T10:00:00+10:00",
      });

      expect(response.status).toBe(201);
    });

    it("allows only one appointment when two overlapping requests are submitted concurrently", async () => {
      const requestBodyPatient1 = {
        clinicianId: 1,
        patientId: 1,
        start: "2099-06-10T09:00:00+10:00",
        end: "2099-06-10T09:30:00+10:00",
      };

      const requestBodyPatient2 = {
        clinicianId: 1,
        patientId: 2,
        start: "2099-06-10T09:00:00+10:00",
        end: "2099-06-10T09:30:00+10:00",
      };

      const [response1, response2] = await Promise.all([
        request(app).post("/appointments").set("x-user-role", "patient").send(requestBodyPatient1),
        request(app).post("/appointments").set("x-user-role", "patient").send(requestBodyPatient2),
      ]);

      const statuses = [response1.status, response2.status].sort();

      expect(statuses).toEqual([201, 409]);

      const listResponse = await request(app)
        .get("/appointments?from=2099-06-10T08:00:00%2B10:00&to=2099-06-10T10:00:00%2B10:00")
        .set("x-user-role", "admin");

      expect(listResponse.status).toBe(200);
      expect(listResponse.body).toHaveLength(1);
    });
  });

  describe("GET /clinicians/:id/appointments", () => {
    it("lists appointments for one clinician", async () => {
      await request(app).post("/appointments").set("x-user-role", "admin").send({
        clinicianId: 1,
        patientId: 1,
        start: "2099-06-10T09:00:00+10:00",
        end: "2099-06-10T09:30:00+10:00",
      });

      await request(app).post("/appointments").set("x-user-role", "admin").send({
        clinicianId: 2,
        patientId: 2,
        start: "2099-06-10T10:00:00+10:00",
        end: "2099-06-10T10:30:00+10:00",
      });

      const response = await request(app)
        .get("/clinicians/1/appointments")
        .set("x-user-role", "admin");

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        clinicianId: 1,
        patientId: 1,
      });
    });

    it("supports from and to query params", async () => {
      await request(app).post("/appointments").set("x-user-role", "admin").send({
        clinicianId: 1,
        patientId: 1,
        start: "2099-06-10T09:00:00+10:00",
        end: "2099-06-10T09:30:00+10:00",
      });

      await request(app).post("/appointments").set("x-user-role", "admin").send({
        clinicianId: 1,
        patientId: 2,
        start: "2099-06-10T11:00:00+10:00",
        end: "2099-06-10T11:30:00+10:00",
      });

      const response = await request(app)
        .get(
          "/clinicians/1/appointments?from=2099-06-10T08:00:00%2B10:00&to=2099-06-10T10:00:00%2B10:00"
        )
        .set("x-user-role", "admin");

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].startTime).toBe("2099-06-09T23:00:00.000Z");
    });

    it("returns 400 for invalid clinician id", async () => {
      const response = await request(app)
        .get("/clinicians/abc/appointments")
        .set("x-user-role", "admin");

      expect(response.status).toBe(400);
    });

    it("returns 400 for invalid date range", async () => {
      const response = await request(app)
        .get(
          "/clinicians/1/appointments?from=2099-06-10T10:00:00%2B10:00&to=2099-06-10T09:00:00%2B10:00"
        )
        .set("x-user-role", "admin");

      expect(response.status).toBe(400);
    });

    it("returns 404 when clinician does not exist", async () => {
      const response = await request(app)
        .get("/clinicians/999/appointments")
        .set("x-user-role", "admin");

      expect(response.status).toBe(404);
    });
  });

  describe("GET /appointments", () => {
    it("lists all upcoming appointments for admin", async () => {
      await request(app).post("/appointments").set("x-user-role", "admin").send({
        clinicianId: 1,
        patientId: 1,
        start: "2099-06-10T09:00:00+10:00",
        end: "2099-06-10T09:30:00+10:00",
      });

      await request(app).post("/appointments").set("x-user-role", "admin").send({
        clinicianId: 2,
        patientId: 2,
        start: "2099-06-10T10:00:00+10:00",
        end: "2099-06-10T10:30:00+10:00",
      });

      const response = await request(app).get("/appointments").set("x-user-role", "admin");

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    it("supports limit", async () => {
      await request(app).post("/appointments").set("x-user-role", "admin").send({
        clinicianId: 1,
        patientId: 1,
        start: "2099-06-10T09:00:00+10:00",
        end: "2099-06-10T09:30:00+10:00",
      });

      await request(app).post("/appointments").set("x-user-role", "admin").send({
        clinicianId: 2,
        patientId: 2,
        start: "2099-06-10T10:00:00+10:00",
        end: "2099-06-10T10:30:00+10:00",
      });

      const response = await request(app).get("/appointments?limit=1").set("x-user-role", "admin");

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
    });

    it("supports from and to query params", async () => {
      await request(app).post("/appointments").set("x-user-role", "admin").send({
        clinicianId: 1,
        patientId: 1,
        start: "2099-06-10T09:00:00+10:00",
        end: "2099-06-10T09:30:00+10:00",
      });

      await request(app).post("/appointments").set("x-user-role", "admin").send({
        clinicianId: 2,
        patientId: 2,
        start: "2099-06-10T11:00:00+10:00",
        end: "2099-06-10T11:30:00+10:00",
      });

      const response = await request(app)
        .get("/appointments?from=2099-06-10T08:00:00%2B10:00&to=2099-06-10T10:00:00%2B10:00")
        .set("x-user-role", "admin");

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].clinicianId).toBe(1);
    });

    it("returns 403 when non-admin tries to list all appointments", async () => {
      const response = await request(app).get("/appointments").set("x-user-role", "patient");

      expect(response.status).toBe(403);
    });

    it("returns 401 when role header is missing", async () => {
      const response = await request(app).get("/appointments");

      expect(response.status).toBe(401);
    });

    it("returns 400 for invalid limit", async () => {
      const response = await request(app)
        .get("/appointments?limit=abc")
        .set("x-user-role", "admin");

      expect(response.status).toBe(400);
    });
  });

  describe("not found", () => {
    it("returns 404 for unknown route", async () => {
      const response = await request(app).get("/unknown-route").set("x-user-role", "admin");

      expect(response.status).toBe(404);
    });
  });
});
