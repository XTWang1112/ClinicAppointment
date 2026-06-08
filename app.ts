import express from "express";
import { appointmentRouter } from "./src/routes/appointmentRoutes";
import { errorHandler, notFoundHandler } from "./src/middleware/errorHandler";
import { setupSwagger } from "./src/swagger";

export const app = express();

app.use(express.json());
setupSwagger(app);

app.use(appointmentRouter);

app.use(notFoundHandler);
app.use(errorHandler);
