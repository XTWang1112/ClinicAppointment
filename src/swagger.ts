import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import type { Express } from "express";

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Clinic Appointment API",
      version: "1.0.0",
      description: "Simple clinic appointment booking API",
    },
    servers: [
      {
        url: "http://localhost:3000",
      },
    ],
    components: {
      securitySchemes: {
        RoleHeader: {
          type: "apiKey",
          in: "header",
          name: "x-user-role",
        },
      },
    },
  },
  apis: ["./src/routes/*.ts", "./dist/src/routes/*.js"],
});

export function setupSwagger(app: Express): void {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.get("/openapi.json", (_req, res) => {
    res.json(swaggerSpec);
  });
}
