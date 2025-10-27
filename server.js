import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const app = express();
const prisma = new PrismaClient();

// CORS: allow your frontend(s)
const whitelist = [
  "http://localhost:3000",
  process.env.FRONTEND_URL, // e.g., https://your-frontend.com
].filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    cb(null, whitelist.includes(origin));
  },
  credentials: true,
}));

app.use(helmet());
app.use(express.json());

// Health check
app.get("/", (_req, res) => {
  res.send("Studio Perennis backend is live 🚀");
});

/**
 * Forgot password: send reset link
 * POST /api/auth/forgot-password
 * body: { email }
 */
app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await prisma.user.findUnique({ where: { email } });
    // Respond generically to avoid user enumeration
    if (!user) {
      return res.json({ message: "If the email is registered, a reset link will be sent." });
    }

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_RESET_SECRET || process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const base = process.env.FRONTEND_URL || "http://localhost:3000";
    const resetLink = `${base}/auth/reset-password?token=${token}`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,  // Gmail address
        pass: process.env.EMAIL_PASS,  // Gmail App Password
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Reset Your Password",
      html: `<p>Click <a href="${resetLink}">here</a> to reset your password.</p><p>This link expires in 1 hour.</p>`,
    });

    return res.json({ message: "If the email is registered, a reset link will be sent." });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * Reset password
 * POST /api/auth/reset-password
 * body: { token, newPassword }
 */
app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token and newPassword are required" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const payload = jwt.verify(
      token,
      process.env.JWT_RESET_SECRET || process.env.JWT_SECRET
    );

    const hashed = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: payload.id },
      data: { password: hashed },
    });

    return res.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(400).json({ message: "Invalid or expired token" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
