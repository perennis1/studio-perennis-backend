import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import { PrismaClient } from "@prisma/client";
import authRoutes from "./api/routes/auth.routes.js";

dotenv.config();

const app = express();
const prisma = new PrismaClient();

// CORS whitelist
const whitelist = [
  "http://localhost:3000",
  process.env.FRONTEND_URL, // e.g., https://studio-perennis-frontend.onrender.com
].filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      cb(null, whitelist.includes(origin));
    },
    credentials: true,
  })
);

app.use(helmet());
app.use(express.json());

// Health check
app.get("/", (_req, res) => {
  res.send("Studio Perennis backend is live 🚀");
});

// Auth routes mounted at /api/auth
app.use("/api/auth", authRoutes);

// Optional: global 404 for unknown API routes
app.use("/api", (_req, res) => {
  res.status(404).json({ message: "API route not found" });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

