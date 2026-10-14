import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import { env } from "./lib/env.js";
import { errorBody } from "./lib/errors.js";
import { apiRouter } from "./routes/index.js";

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.WEB_URL }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/v1", apiRouter);

app.use((_req, res) => {
  res.status(404).json({ error: { code: "not_found", message: "Ruta no encontrada" } });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const { status, body } = errorBody(err);
  if (status === 500) console.error(err);
  res.status(status).json(body);
});
