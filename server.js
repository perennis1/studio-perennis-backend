import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import prisma from "./src/config/db.js";

import authRoutes from "./api/routes/auth.routes.js";
import userRoutes from "./api/routes/user.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// --- CORS SETUP ---
const whitelist = [
  "http://localhost:3000",
  process.env.FRONTEND_URL, // your deployed frontend (Render/Vercel)
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, or Render health checks)
      if (!origin || whitelist.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy does not allow access from origin ${origin}`));
      }
    },
    credentials: true,
  })
);

// --- SECURITY & PARSING ---
app.use(helmet());
app.use(express.json());

// --- ROUTES ---
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);

// --- DATABASE CONNECTION ---
async function connectDB() {
  try {
    await prisma.$connect();
    console.log("✅ Successfully connected to PostgreSQL!");
  } catch (err) {
    console.error("❌ Database connection error:", err);
  }
}

connectDB();

// --- ROOT ROUTE (TEST) ---
app.get("/", (req, res) => {
  res.send("🚀 Studio Perennis Backend is running successfully!");
});

// --- SERVER START ---
const server = app.listen(PORT, () => {
  console.log(`🌐 Backend running on port ${PORT}`);
});

// --- GRACEFUL SHUTDOWN ---
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  console.log("🧹 Database disconnected gracefully.");
  server.close(() => process.exit(0));
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  console.log("🧹 Database disconnected gracefully (Render stop).");
  server.close(() => process.exit(0));
});

export default app;
